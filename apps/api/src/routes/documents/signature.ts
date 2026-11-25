import crypto from "node:crypto";
import { and, desc, eq, gte, isNull } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireClinicalMutationAccess } from "../../accessGuard.js";
import { recordAuditEvent } from "../../audit.js";
import { type TenantDb } from "../../db/client.js";
import { withTenantCtx } from "../../db/rls.js";
import {
	getDocumentById,
	issueGeneratedDocumentInDb,
	writeStampedDocumentSnapshot,
} from "../../db/documentQuery.js";
import { getPatientByIdFromDb } from "../../db/patientsQuery.js";
import * as schema from "../../db/schema.js";
import { renderDocumentHtml } from "../../documents/renderDocument.js";
import { getRequestIdentity, requireOrganizationId } from "../../security/identity.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
import { verifyCredential, hashCredential } from "../../utils/cryptoHelper.js";
import { extractIdempotencyKey, isValidUuid } from "../../utils/httpIdempotency.js";
import { syncDocumentToPatientConsent } from "../consents/queries.js";
import { clinicalDocKinds, isReceptionistAllowedPrimaryDoc } from "./query.js";
import { apiError, resolveDocumentRenderContext } from "./shared.js";

const PEP_OTP_MAX_ATTEMPTS = 5;

function maskPhoneForLog(rawPhone: string): string {
	const digits = rawPhone.replace(/\D/g, "");
	if (digits.length < 4) return "***";
	return `${digits.slice(0, 2)}***${digits.slice(-2)}`;
}

async function verifyAndConsumePepOtpInTx(
	tx: TenantDb,
	orgId: string,
	patientId: string,
	enteredCode: string,
	now: Date,
): Promise<
	| { ok: true }
	| { ok: false; statusCode: number; error: string; message: string }
> {
	const [candidate] = await tx
		.select({
			id: schema.portalOtpCodes.id,
			codeHash: schema.portalOtpCodes.codeHash,
			attemptCount: schema.portalOtpCodes.attemptCount,
		})
		.from(schema.portalOtpCodes)
		.where(
			and(
				eq(schema.portalOtpCodes.organizationId, orgId),
				eq(schema.portalOtpCodes.patientId, patientId),
				eq(schema.portalOtpCodes.deliveryStatus, "sent"),
				isNull(schema.portalOtpCodes.consumedAt),
				gte(schema.portalOtpCodes.expiresAt, now),
			),
		)
		.orderBy(desc(schema.portalOtpCodes.createdAt))
		.limit(1)
		.for("update");

	if (!candidate) {
		return {
			ok: false,
			statusCode: 400,
			error: "OtpNotFoundOrExpired",
			message: "Код не запрашивался или срок его действия истек.",
		};
	}

	if (candidate.attemptCount >= PEP_OTP_MAX_ATTEMPTS) {
		await tx
			.update(schema.portalOtpCodes)
			.set({ consumedAt: now })
			.where(
				and(
					eq(schema.portalOtpCodes.id, candidate.id),
					eq(schema.portalOtpCodes.organizationId, orgId),
				),
			);
		return {
			ok: false,
			statusCode: 429,
			error: "OtpAttemptsExceeded",
			message: "Превышено число попыток ввода СМС-кода. Запросите новый код.",
		};
	}

	const isMatch = await verifyCredential(enteredCode, candidate.codeHash);
	if (!isMatch) {
		const nextAttempts = candidate.attemptCount + 1;
		await tx
			.update(schema.portalOtpCodes)
			.set({
				attemptCount: nextAttempts,
				...(nextAttempts >= PEP_OTP_MAX_ATTEMPTS ? { consumedAt: now } : {}),
			})
			.where(
				and(
					eq(schema.portalOtpCodes.id, candidate.id),
					eq(schema.portalOtpCodes.organizationId, orgId),
				),
			);
		return {
			ok: false,
			statusCode: 400,
			error: "InvalidOtpCode",
			message: "Неверный код подтверждения.",
		};
	}

	const [consumed] = await tx
		.update(schema.portalOtpCodes)
		.set({ consumedAt: now })
		.where(
			and(
				eq(schema.portalOtpCodes.id, candidate.id),
				eq(schema.portalOtpCodes.organizationId, orgId),
				isNull(schema.portalOtpCodes.consumedAt),
			),
		)
		.returning({ id: schema.portalOtpCodes.id });

	if (!consumed) {
		return {
			ok: false,
			statusCode: 409,
			error: "OtpAlreadyConsumed",
			message: "Одноразовый СМС-код уже использован.",
		};
	}

	return { ok: true };
}

const documentSignatureParamsSchema = z
	.object({
		id: z.string().uuid("Некорректный идентификатор документа (ожидается UUID)"),
	})
	.strict();

const submitDocumentSignatureSchema = z
	.object({
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
		signedByName: z.string().optional(),
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
			.strict()
			.optional(),
	})
	.strict()
	.superRefine((val, ctx) => {
		if (val.mode === "pep_sms" && !val.pepCode?.trim()) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["pepCode"],
				message: "Для ПЭП по СМС обязателен одноразовый код подтверждения.",
			});
		}
	});

const sendPepSmsSchema = z
	.object({
		patientId: z.string().uuid("Идентификатор пациента должен быть валидным UUID"),
		phone: z.string().trim().min(6).max(32),
		documentId: z.string().uuid().optional(),
	})
	.strict();

const verifyPepSmsSchema = z
	.object({
		patientId: z.string().uuid("Идентификатор пациента должен быть валидным UUID"),
		phone: z.string().trim().min(6).max(32).optional(),
		code: z.string().trim().min(4).max(8),
	})
	.strict();

export async function register(app: FastifyInstance) {
	/**
	 * [DOC-06] Защищенная серверная генерация одноразового СМС-кода ПЭП (63-ФЗ)
	 * Персистентное сохранение в PostgreSQL 18 (portal_otp_codes)
	 */
	app.post("/api/documents/pep-sms/send", async (request: FastifyRequest, reply: FastifyReply) => {
		if (!(await requireClinicalMutationAccess(request, reply, "pep sms send"))) {
			return;
		}

		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;

		const idempotencyKey = extractIdempotencyKey(request);
		if (idempotencyKey && !isValidUuid(idempotencyKey)) {
			return reply.code(400).send(apiError("Некорректный заголовок Idempotency-Key (ожидается UUID)"));
		}

		const parseResult = sendPepSmsSchema.safeParse(request.body);
		if (!parseResult.success) {
			return reply.code(400).send(apiError("Некорректные параметры запроса СМС-кода"));
		}

		const { patientId, phone, documentId } = parseResult.data;
		const cleanPhone = phone.replace(/\D/g, "");
		if (cleanPhone.length < 6) {
			return reply.code(400).send(apiError("Некорректный номер телефона пациента"));
		}

		const patient = await getPatientByIdFromDb(orgId, patientId);
		if (!patient) {
			return reply.code(404).send(apiError("Пациент не найден"));
		}

		if (documentId) {
			const doc = await getDocumentById(orgId, documentId);
			if (!doc || doc.patientId !== patientId) {
				return reply.code(404).send(apiError("Документ пациента не найден"));
			}
		}

		// Защита от спама / кулдаун 60 секунд в транзакции с блокировкой строки
		const now = new Date();
		const otpNumber = crypto.randomInt(100000, 1000000);
		const otpCode = String(otpNumber);
		const codeHash = await hashCredential(otpCode);
		const expiresAt = new Date(now.getTime() + 180_000); // 3 минуты TTL

		const sendOutcome = await withTenantCtx(orgId, async (tx) => {
			const [recentOtp] = await tx
				.select({ createdAt: schema.portalOtpCodes.createdAt })
				.from(schema.portalOtpCodes)
				.where(
					and(
						eq(schema.portalOtpCodes.organizationId, orgId),
						eq(schema.portalOtpCodes.patientId, patientId),
						isNull(schema.portalOtpCodes.consumedAt),
					),
				)
				.orderBy(desc(schema.portalOtpCodes.createdAt))
				.limit(1)
				.for("update");

			if (recentOtp && now.getTime() - recentOtp.createdAt.getTime() < 60_000) {
				const remainingSeconds = Math.ceil((60_000 - (now.getTime() - recentOtp.createdAt.getTime())) / 1000);
				return { rateLimited: true as const, remainingSeconds };
			}

			await tx
				.update(schema.portalOtpCodes)
				.set({ consumedAt: now })
				.where(
					and(
						eq(schema.portalOtpCodes.organizationId, orgId),
						eq(schema.portalOtpCodes.patientId, patientId),
						isNull(schema.portalOtpCodes.consumedAt),
					),
				);

			await tx.insert(schema.portalOtpCodes).values({
				organizationId: orgId,
				patientId,
				phone: cleanPhone,
				codeHash,
				channel: "sms",
				deliveryStatus: "sent",
				expiresAt,
			});

			return { rateLimited: false as const };
		});

		if (sendOutcome.rateLimited) {
			return reply.code(429).send({
				error: "RateLimitExceeded",
				message: `Повторная отправка кода возможна через ${sendOutcome.remainingSeconds} сек.`,
				cooldownSeconds: sendOutcome.remainingSeconds,
			});
		}

		request.log.info(
			{ orgId, patientId, phoneMasked: maskPhoneForLog(cleanPhone) },
			"[PEP-SMS] Сгенерирован защищенный серверный код ПЭП в portal_otp_codes",
		);

		if (idempotencyKey) {
			reply.header("Idempotency-Key", idempotencyKey);
		}

		return reply.send({
			success: true,
			cooldownSeconds: 60,
			expiresInSeconds: 180,
		});
	});

	/**
	 * [DOC-06] Серверная валидация одноразового СМС-кода ПЭП в PostgreSQL 18
	 */
	app.post("/api/documents/pep-sms/verify", async (request: FastifyRequest, reply: FastifyReply) => {
		if (!(await requireClinicalMutationAccess(request, reply, "pep sms verify"))) {
			return;
		}

		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;

		const idempotencyKey = extractIdempotencyKey(request);
		if (idempotencyKey && !isValidUuid(idempotencyKey)) {
			return reply.code(400).send(apiError("Некорректный заголовок Idempotency-Key (ожидается UUID)"));
		}

		const parseResult = verifyPepSmsSchema.safeParse(request.body);
		if (!parseResult.success) {
			return reply.code(400).send(apiError("Некорректный формат кода"));
		}

		const { patientId, code } = parseResult.data;
		const enteredCode = code.trim();
		const now = new Date();

		const verifyOutcome = await withTenantCtx(orgId, (tx) =>
			verifyAndConsumePepOtpInTx(tx, orgId, patientId, enteredCode, now),
		);

		if (!verifyOutcome.ok) {
			return reply.code(verifyOutcome.statusCode).send({
				error: verifyOutcome.error,
				message: verifyOutcome.message,
			});
		}

		if (idempotencyKey) {
			reply.header("Idempotency-Key", idempotencyKey);
		}

		return reply.send({
			verified: true,
			verifiedAt: now.toISOString(),
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

		const idempotencyKey = extractIdempotencyKey(request);
		if (idempotencyKey && !isValidUuid(idempotencyKey)) {
			return reply.code(400).send(apiError("Некорректный заголовок Idempotency-Key (ожидается UUID)"));
		}

		const paramsParsed = documentSignatureParamsSchema.safeParse(request.params);
		if (!paramsParsed.success) {
			return reply.code(400).send(apiError("Некорректный идентификатор документа"));
		}
		const { id } = paramsParsed.data;

		const parseResult = submitDocumentSignatureSchema.safeParse(request.body);
		if (!parseResult.success) {
			return reply.code(400).send(apiError("Некорректный payload подписи документа"));
		}

		const existing = await getDocumentById(orgId, id);
		if (!existing) {
			return reply.code(404).send(apiError("Документ не найден"));
		}

		const identity = getRequestIdentity(request);
		const access = evaluateClinicalAccess(identity.role, {
			clinicalRole: identity.clinicalRole ?? null,
			canSignMedicalRecords: identity.canSignMedicalRecords ?? false,
			specialties: identity.specialties ?? null,
		});
		if (
			clinicalDocKinds.has(existing.kind) &&
			!access.hasClinicalAccess &&
			!isReceptionistAllowedPrimaryDoc(existing.kind, identity.role)
		) {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "clinical.document.sign",
				role: identity.role,
				message:
					"Подписание клинических медицинских документов недоступно для вашей роли (152-ФЗ / 323-ФЗ ст. 13).",
			});
		}

		if (existing.status === "voided") {
			return reply.code(409).send(apiError("Аннулированный документ нельзя подписать"));
		}

		if (existing.signatureSvg || existing.cryptoSignaturePkcs7) {
			return reply.code(409).send(apiError("Документ уже подписан. Повторное подписание или перезапись подписи запрещены."));
		}

		const patient = await getPatientByIdFromDb(orgId, existing.patientId);
		if (!patient) {
			return reply.code(404).send(apiError("Пациент не найден"));
		}

		if (patient.status === "archived" && !access.hasClinicalAccess) {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "patients.archived.read",
				role: identity.role,
				message:
					"Отказ в доступе к документам архивированного пациента (152-ФЗ / 323-ФЗ ст. 13).",
			});
		}

		const {
			signatureSvg,
			mode,
			signedAt,
			recipientFullName,
			recipientRole,
			signedByName,
			staffFullName,
			staffRole,
			pepCode,
			phoneNumber,
			auditContext,
		} = parseResult.data;

		const trimmedPepCode = pepCode?.trim() || "";
		const requiresSmsOtp = mode === "pep_sms" || trimmedPepCode.length > 0;
		if (mode === "pep_sms" && !trimmedPepCode) {
			return reply.code(400).send(apiError("Для ПЭП по СМС обязателен одноразовый код подтверждения."));
		}

		const effectiveSignedAt = signedAt || new Date().toISOString();
		const effectiveRecipientName =
			recipientFullName || signedByName || patient.fullName || "Пациент";
		const effectiveStaffName = staffFullName || identity.fullName || "Врач клиники";

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

		// Формируем аттестацию подписи по 63-ФЗ без сохранения сырого ОТП-кода
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
			note: `Подписано ПЭП 63-ФЗ. IP: ${clientIp}, Сессия: ${sessionId}${requiresSmsOtp ? ", Подтверждено СМС ПЭП (63-ФЗ)" : ""}`,
		};

		const renderContext = {
			...(await resolveDocumentRenderContext(orgId, existing.patientId)),
			origin: `http://${request.headers.host ?? "127.0.0.1:4100"}`,
		};

		// Неделимая ACID транзакция (Мандат 8bo): блокировка строки документа, верификация OTP,
		// атомарное сохранение подписи, вставка в documentSignatures, синхронизация согласия и аудит-событие
		const txResult = await withTenantCtx(orgId, async (tx) => {
			const [lockedDoc] = await tx
				.select()
				.from(schema.generatedDocuments)
				.where(
					and(
						eq(schema.generatedDocuments.organizationId, orgId),
						eq(schema.generatedDocuments.id, id),
					),
				)
				.for("update");

			if (!lockedDoc) {
				return { ok: false as const, statusCode: 404, error: "NotFound", message: "Документ не найден" };
			}
			if (lockedDoc.status === "voided") {
				return { ok: false as const, statusCode: 409, error: "Conflict", message: "Аннулированный документ нельзя подписать" };
			}
			if (lockedDoc.signatureSvg || lockedDoc.cryptoSignaturePkcs7) {
				return {
					ok: false as const,
					statusCode: 409,
					error: "Conflict",
					message: "Документ уже подписан. Повторное подписание или перезапись подписи запрещены.",
				};
			}

			if (requiresSmsOtp) {
				const otpOutcome = await verifyAndConsumePepOtpInTx(
					tx,
					orgId,
					existing.patientId,
					trimmedPepCode,
					new Date(),
				);
				if (!otpOutcome.ok) {
					return otpOutcome;
				}
			}

			// Если документ в статусе черновика — переводим его в issued с сохранением подписи
			// issueGeneratedDocumentInDb сам вставляет 1 запись в schema.documentSignatures.
			let stampedHtmlToWrite: string | null = null;
			if (lockedDoc.status === "draft") {
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
					issuedByUserId: identity.userId ?? null,
					issuedAt: effectiveSignedAt,
					snapshotHtml: issuedHtml,
					signatureAttestation,
					signatureSvg,
					tx,
				});
			} else {
				// Документ уже был выдан (включая УКЭП врача) — визуальный штамп .stamped.html
				// пишем строго после коммита транзакции, чтобы откат/409 не оставил файл на диске.
				const signedDocumentCandidate = {
					...existing,
					signatureAttestation,
					signatureSvg,
				};
				const signedHtml = renderDocumentHtml(
					signedDocumentCandidate,
					patient,
					renderContext,
				);
				const stampedSha256 = crypto
					.createHash("sha256")
					.update(signedHtml, "utf8")
					.digest("hex");

				const [updatedIssued] = await tx
					.update(schema.generatedDocuments)
					.set({
						signatureSvg,
						signatureAttestation,
					})
					.where(
						and(
							eq(schema.generatedDocuments.organizationId, orgId),
							eq(schema.generatedDocuments.id, id),
							isNull(schema.generatedDocuments.signatureSvg),
							isNull(schema.generatedDocuments.cryptoSignaturePkcs7),
						),
					)
					.returning({ id: schema.generatedDocuments.id });

				if (!updatedIssued) {
					return {
						ok: false as const,
						statusCode: 409,
						error: "Conflict",
						message: "Документ уже подписан. Повторное подписание или перезапись подписи запрещены.",
					};
				}

				stampedHtmlToWrite = signedHtml;
				const docSha256 = lockedDoc.issuedSnapshotSha256 || stampedSha256;
				await tx.insert(schema.documentSignatures).values({
					organizationId: orgId,
					documentId: existing.id,
					patientId: existing.patientId,
					signerRole: recipientRole || "patient",
					signerName: effectiveRecipientName || "Пациент (ПЭП 63-ФЗ)",
					signatureType: signatureSvg ? "pep_canvas" : "pep_sms",
					signatureSvg: signatureSvg ?? null,
					documentSha256: docSha256,
					signedAt: new Date(effectiveSignedAt),
				});
			}

			// [DOC-03] Синхронизируем подпись в таблицу patient_consents
			await syncDocumentToPatientConsent(
				orgId,
				existing.patientId,
				existing.kind,
				existing.id,
				new Date(effectiveSignedAt),
				tx,
			);

			// [DOC-04] Юридически значимый след по 63-ФЗ в audit_events внутри транзакции
			await recordAuditEvent({
				organizationId: orgId,
				actorUserId: identity.userId ?? null,
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
					pepCodeVerified: requiresSmsOtp,
				}),
				tx,
			});

			return { ok: true as const, stampedHtmlToWrite };
		});

		if (!txResult.ok) {
			return reply.code(txResult.statusCode).send({
				error: txResult.error,
				message: txResult.message,
			});
		}

		if (txResult.stampedHtmlToWrite) {
			writeStampedDocumentSnapshot(id, txResult.stampedHtmlToWrite);
		}

		request.log.info(
			{ documentId: existing.id, patientId: existing.patientId, mode, clientIp },
			"[DOC-03/DOC-04] Подпись пациента сохранена в БД и зафиксирована в audit_events",
		);

		if (idempotencyKey) {
			reply.header("Idempotency-Key", idempotencyKey);
		}

		return reply.send({
			success: true,
			documentId: existing.id,
			status: "issued",
			signedAt: effectiveSignedAt,
			signatureSvg,
		});
	});
}
