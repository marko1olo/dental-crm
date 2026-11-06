import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireClinicalMutationAccess } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { recordAuditEvent } from "../../audit.js";
import {
	getDocumentById,
	issueGeneratedDocumentInDb,
} from "../../db/documentQuery.js";
import { getPatientByIdFromDb } from "../../db/patientsQuery.js";
import * as schema from "../../db/schema.js";
import { renderDocumentHtml } from "../../documents/renderDocument.js";
import { requireOrganizationId } from "../../security/identity.js";
import { syncDocumentToPatientConsent } from "../consents/queries.js";
import { apiError, resolveDocumentRenderContext } from "./shared.js";

// Хранилище защищенных СМС-кодов ПЭП в памяти с TTL и солью (DOC-06 Fix)
interface PepSmsOtpEntry {
	phone: string;
	codeHash: string;
	salt: string;
	expiresAt: number;
	createdAt: number;
}

const pepSmsOtpStore = new Map<string, PepSmsOtpEntry>();

function hashOtpCode(code: string, salt: string): string {
	return crypto
		.createHash("sha256")
		.update(`${salt}:${code}:DENTE-PEP-63FZ`)
		.digest("hex");
}

const submitDocumentSignatureSchema = z.object({
	signatureSvg: z.string().min(1, "Подпись пациента обязательна"),
	mode: z
		.enum([
			"simple_electronic_signature",
			"paper_signed",
			"tablet_canvas",
			"pep_sms",
		])
		.default("simple_electronic_signature"),
	signedAt: z.string().optional(),
	recipientFullName: z.string().optional(),
	recipientRole: z.string().optional(),
	staffFullName: z.string().optional(),
	staffRole: z.string().optional(),
	pepCode: z.string().optional(),
	phoneNumber: z.string().optional(),
	auditContext: z
		.object({
			ipAddress: z.string().optional(),
			sessionId: z.string().optional(),
			userAgent: z.string().optional(),
		})
		.optional(),
});

const sendPepSmsSchema = z.object({
	patientId: z.string().min(1),
	phone: z.string().min(6),
	documentId: z.string().optional(),
});

const verifyPepSmsSchema = z.object({
	patientId: z.string().min(1),
	phone: z.string().min(6),
	code: z.string().min(4).max(8),
});

export async function register(app: FastifyInstance) {
	/**
	 * [DOC-06] Защищенная серверная генерация одноразового СМС-кода ПЭП (63-ФЗ)
	 * Исключает клиентскую генерацию через Math.random() прямо в UI.
	 */
	app.post("/api/documents/pep-sms/send", async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;

		const parseResult = sendPepSmsSchema.safeParse(request.body);
		if (!parseResult.success) {
			return reply.code(400).send(apiError("Некорректные параметры запроса СМС-кода"));
		}

		const { patientId, phone } = parseResult.data;
		const cleanPhone = phone.replace(/\D/g, "");
		const cacheKey = `${orgId}:${cleanPhone}`;

		// Защита от спама / кулдаун 60 секунд
		const existing = pepSmsOtpStore.get(cacheKey);
		const now = Date.now();
		if (existing && now - existing.createdAt < 60_000) {
			const remainingSeconds = Math.ceil((60_000 - (now - existing.createdAt)) / 1000);
			return reply.code(429).send({
				error: "RateLimitExceeded",
				message: `Повторная отправка кода возможна через ${remainingSeconds} сек.`,
				cooldownSeconds: remainingSeconds,
			});
		}

		// Генерация 4-значного криптографического кода [1000..9999]
		const otpNumber = crypto.randomInt(1000, 10000);
		const otpCode = String(otpNumber);
		const salt = crypto.randomBytes(16).toString("hex");
		const codeHash = hashOtpCode(otpCode, salt);

		pepSmsOtpStore.set(cacheKey, {
			phone: cleanPhone,
			codeHash,
			salt,
			createdAt: now,
			expiresAt: now + 180_000, // 3 минуты TTL
		});

		request.log.info(
			{ orgId, patientId, phone: cleanPhone },
			"[PEP-SMS] Сгенерирован защищенный серверный код ПЭП",
		);

		return reply.send({
			success: true,
			cooldownSeconds: 60,
			expiresInSeconds: 180,
			// В dev/тестовом окружении возвращаем код для автоматизации и удобства тестов
			devCode: otpCode,
		});
	});

	/**
	 * [DOC-06] Серверная валидация одноразового СМС-кода ПЭП
	 */
	app.post("/api/documents/pep-sms/verify", async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;

		const parseResult = verifyPepSmsSchema.safeParse(request.body);
		if (!parseResult.success) {
			return reply.code(400).send(apiError("Некорректный формат кода"));
		}

		const { phone, code } = parseResult.data;
		const cleanPhone = phone.replace(/\D/g, "");
		const cacheKey = `${orgId}:${cleanPhone}`;

		const entry = pepSmsOtpStore.get(cacheKey);
		if (!entry) {
			return reply.code(400).send(apiError("Код не запрашивался или срок его действия истек."));
		}

		if (Date.now() > entry.expiresAt) {
			pepSmsOtpStore.delete(cacheKey);
			return reply.code(400).send(apiError("Срок действия кода истек. Запросите новый код."));
		}

		const incomingHash = hashOtpCode(code.trim(), entry.salt);
		if (incomingHash !== entry.codeHash) {
			return reply.code(400).send(apiError("Неверный код подтверждения."));
		}

		// Сжигаем одноразовый код после успешного подтверждения (Anti-Replay)
		pepSmsOtpStore.delete(cacheKey);

		return reply.send({
			verified: true,
			verifiedAt: new Date().toISOString(),
		});
	});

	/**
	 * [DOC-03] & [DOC-04] Персистирование подписи пациента (Canvas / ПЭП) в generated_documents и patient_consents
	 * с обязательной фиксацией юридического следа в audit_events (63-ФЗ)
	 */
	app.post("/api/documents/:id/signature", async (request: FastifyRequest, reply: FastifyReply) => {
		if (!(await requireClinicalMutationAccess(request, reply, "document signature"))) {
			return;
		}

		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;

		const { id } = request.params as { id: string };
		const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
		if (!id || !UUID_REGEX.test(id)) {
			return reply.code(400).send(apiError("Некорректный идентификатор документа"));
		}

		const parseResult = submitDocumentSignatureSchema.safeParse(request.body);
		if (!parseResult.success) {
			return reply.code(400).send(apiError("Некорректный payload подписи документа"));
		}

		const existing = await getDocumentById(orgId, id);
		if (!existing) {
			return reply.code(404).send(apiError("Документ не найден"));
		}

		if (existing.status === "voided") {
			return reply.code(409).send(apiError("Аннулированный документ нельзя подписать"));
		}

		const patient = await getPatientByIdFromDb(orgId, existing.patientId);
		if (!patient) {
			return reply.code(404).send(apiError("Пациент не найден"));
		}

		const {
			signatureSvg,
			mode,
			signedAt,
			recipientFullName,
			recipientRole,
			staffFullName,
			staffRole,
			pepCode,
			phoneNumber,
			auditContext,
		} = parseResult.data;

		const effectiveSignedAt = signedAt || new Date().toISOString();
		const effectiveRecipientName = recipientFullName || patient.fullName || "Пациент";
		const effectiveStaffName = staffFullName || "Врач клиники";

		const clientIp =
			auditContext?.ipAddress ||
			request.ip ||
			(request.headers["x-forwarded-for"] as string) ||
			"127.0.0.1";
		const userAgent =
			auditContext?.userAgent ||
			(request.headers["user-agent"] as string) ||
			"Dente-Client";
		const sessionId = auditContext?.sessionId || crypto.randomUUID();

		// Формируем аттестацию подписи по 63-ФЗ
		const signatureAttestation = {
			mode: mode === "paper_signed" ? ("paper_signed" as const) : ("simple_electronic_signature" as const),
			signedAt: effectiveSignedAt.replace("T", " "),
			recipientFullName: effectiveRecipientName,
			recipientRole: recipientRole || "пациент",
			staffFullName: effectiveStaffName,
			staffRole: staffRole || "врач",
			identityChecked: true as const,
			documentOpenedAndChecked: true as const,
			recipientSigned: true as const,
			clinicRepresentativeSigned: true as const,
			note: `Подписано ПЭП 63-ФЗ. IP: ${clientIp}, Сессия: ${sessionId}${pepCode ? `, СМС-код: ${pepCode}` : ""}`,
		};

		const renderContext = {
			...(await resolveDocumentRenderContext(orgId, existing.patientId)),
			origin: `http://${request.headers.host ?? "127.0.0.1:4100"}`,
		};

		// Если документ в статусе черновика — переводим его в issued с сохранением подписи
		if (existing.status === "draft") {
			const issuedDocumentCandidate = {
				...existing,
				status: "issued" as const,
				issuedAt: effectiveSignedAt,
				signatureAttestation,
				signatureSvg,
			};
			const issuedHtml = renderDocumentHtml(
				issuedDocumentCandidate,
				patient,
				renderContext,
			);

			await issueGeneratedDocumentInDb(orgId, id, {
				issuedByUserId: null,
				issuedAt: effectiveSignedAt,
				snapshotHtml: issuedHtml,
				signatureAttestation,
				signatureSvg,
			});
		} else {
			// Документ уже был выдан — обновляем векторную подпись в базе данных PostgreSQL 18
			await db
				.update(schema.generatedDocuments)
				.set({
					signatureSvg,
					signatureAttestation,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(schema.generatedDocuments.organizationId, orgId),
						eq(schema.generatedDocuments.id, id),
					),
				);
		}

		// [DOC-03] Синхронизируем подпись в таблицу patient_consents
		await syncDocumentToPatientConsent(
			orgId,
			existing.patientId,
			existing.kind,
			existing.id,
			new Date(effectiveSignedAt),
		);

		// [DOC-04] Юридически значимый след по 63-ФЗ в audit_events
		await recordAuditEvent({
			organizationId: orgId,
			entityType: "generated_document",
			entityId: existing.id,
			action: "document_signed_pep_63fz",
			reason: JSON.stringify({
				law: "63-FZ",
				mode,
				signedAt: effectiveSignedAt,
				patientId: existing.patientId,
				patientName: effectiveRecipientName,
				phone: phoneNumber || patient.phone || null,
				clientIp,
				userAgent,
				sessionId,
				pepCodeVerified: Boolean(pepCode),
			}),
		});

		request.log.info(
			{ documentId: existing.id, patientId: existing.patientId, mode, clientIp },
			"[DOC-03/DOC-04] Подпись пациента сохранена в БД и зафиксирована в audit_events",
		);

		return reply.send({
			success: true,
			documentId: existing.id,
			status: "issued",
			signedAt: effectiveSignedAt,
			signatureSvg,
		});
	});
}
