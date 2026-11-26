import { createHash } from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import {
	requireAuthTokenSecret,
	requireClinicalMutationContext,
	requireClinicalReadContext,
} from "../../accessGuard.js";
import { withSuperuserBypass } from "../../db/rls.js";
import { organizations, patients } from "../../db/schema.js";
import { verifyToken } from "../../utils/cryptoHelper.js";
import {
	ConsentDocumentNotFoundError,
	fetchPatientConsentsList,
	PatientNotFoundError,
	recordPatientConsentEntry,
} from "./queries.js";
import { generateConsentShareLink } from "./shareLink.js";
import {
	consentKindSchema,
	type ConsentKind,
	publicSignConsentSchema,
	saveConsentBodySchema,
	shareConsentLinkSchema,
} from "./types.js";

const consentPatientParamsSchema = z
	.object({
		patientId: z.string().uuid(),
	})
	.strict();

const consentShareInfoQuerySchema = z
	.object({
		token: z.string().trim().min(1).max(4096),
	})
	.strict();

const DANGEROUS_SVG_PATTERNS: RegExp[] = [
	/<\s*script\b/i,
	/<\s*foreignObject\b/i,
	/<\s*iframe\b/i,
	/<\s*object\b/i,
	/<\s*embed\b/i,
	/<\s*animate\b/i,
	/<\s*set\b/i,
	/\bon[a-z]+\s*=/i,
	/javascript\s*:/i,
	/vbscript\s*:/i,
	/data\s*:\s*text\/html/i,
	/(?:xlink:)?href\s*=\s*["']\s*(?:https?:|\/\/|data\s*:\s*image\/svg\+xml)/i,
];

const RASTER_DATA_URI_PREFIX = /^data:image\/(png|jpeg|jpg|webp|gif);base64,([A-Za-z0-9+/=\r\n\s]+)$/i;

function sanitizeConsentSignatureSvg(
	rawSvg?: string | null,
): { ok: true; value: string | undefined } | { ok: false; message: string } {
	if (!rawSvg) {
		return { ok: true, value: undefined };
	}
	const trimmed = rawSvg.trim();
	if (!trimmed) {
		return { ok: true, value: undefined };
	}
	for (const pattern of DANGEROUS_SVG_PATTERNS) {
		if (pattern.test(trimmed)) {
			return {
				ok: false,
				message: "Недопустимое содержимое SVG-подписи (обнаружены небезопасные теги или скрипты).",
			};
		}
	}
	if (trimmed.startsWith("data:image/")) {
		const match = RASTER_DATA_URI_PREFIX.exec(trimmed);
		if (!match) {
			return {
				ok: false,
				message: "Недопустимый формат data:image подписи (разрешены только PNG/JPEG/WEBP/GIF base64).",
			};
		}
		const subtype = (match[1] ?? "png").toLowerCase();
		const base64Body = (match[2] ?? "").replace(/\s+/g, "");
		if (!base64Body) {
			return {
				ok: false,
				message: "Пустое изображение подписи.",
			};
		}
		const safeDataUri = `data:image/${subtype};base64,${base64Body}`;
		return {
			ok: true,
			value: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 155" width="360" height="155"><image href="${safeDataUri}" width="360" height="155"/></svg>`,
		};
	}
	if (!/^<svg\b[^>]*>[\s\S]*<\/svg>$/i.test(trimmed)) {
		return {
			ok: false,
			message: "Некорректная структура SVG-подписи.",
		};
	}
	return { ok: true, value: trimmed };
}

const SAFE_HOST_REGEX = /^[a-zA-Z0-9.-]+(?::\d{1,5})?$/;

function resolveSafeConsentOrigin(request: FastifyRequest): string {
	const configuredOrigin = process.env.PUBLIC_APP_ORIGIN?.trim();
	if (configuredOrigin) {
		return configuredOrigin.replace(/\/+$/, "");
	}
	const rawHost = Array.isArray(request.headers.host)
		? request.headers.host[0]
		: request.headers.host;
	const host =
		typeof rawHost === "string" && SAFE_HOST_REGEX.test(rawHost.trim())
			? rawHost.trim()
			: "127.0.0.1:5173";
	const rawProto = Array.isArray(request.headers["x-forwarded-proto"])
		? request.headers["x-forwarded-proto"][0]
		: request.headers["x-forwarded-proto"];
	const proto = rawProto === "https" ? "https" : "http";
	return `${proto}://${host}`;
}

export async function register(app: FastifyInstance) {
	app.get("/api/patients/:patientId/consents", async (request: FastifyRequest, reply: FastifyReply) => {
		const context = await requireClinicalReadContext(request, reply, "consents read");
		if (!context) return;
		const orgId = context.organizationId;

		const parsedParams = consentPatientParamsSchema.safeParse(request.params);
		if (!parsedParams.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный идентификатор пациента (ожидается UUID)",
			});
		}
		const consents = await fetchPatientConsentsList(orgId, parsedParams.data.patientId);
		return reply.send({ consents });
	});

	app.post("/api/patients/:patientId/consents", async (request: FastifyRequest, reply: FastifyReply) => {
		const context = await requireClinicalMutationContext(request, reply, "consents save");
		if (!context) return;
		const orgId = context.organizationId;

		const parsedParams = consentPatientParamsSchema.safeParse(request.params);
		if (!parsedParams.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный идентификатор пациента (ожидается UUID)",
			});
		}
		const { patientId } = parsedParams.data;
		const parsed = saveConsentBodySchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректные данные согласия",
				details: parsed.error.issues,
			});
		}

		const safeSvg = sanitizeConsentSignatureSvg(parsed.data.signatureSvg);
		if (!safeSvg.ok) {
			return reply.code(400).send({
				error: "ValidationError",
				message: safeSvg.message,
			});
		}

		try {
			const result = await recordPatientConsentEntry(orgId, patientId, {
				...parsed.data,
				signatureSvg: safeSvg.value,
			});
			return reply.code(201).send(result);
		} catch (error) {
			if (error instanceof PatientNotFoundError) {
				return reply.code(404).send({
					error: "PatientNotFound",
					message: error.message,
				});
			}
			if (error instanceof ConsentDocumentNotFoundError) {
				return reply.code(404).send({
					error: "DocumentNotFound",
					message: error.message,
				});
			}
			throw error;
		}
	});

	app.post("/api/patients/:patientId/consents/share-link", async (request: FastifyRequest, reply: FastifyReply) => {
		const context = await requireClinicalMutationContext(request, reply, "consents share");
		if (!context) return;
		const orgId = context.organizationId;

		const parsedParams = consentPatientParamsSchema.safeParse(request.params);
		if (!parsedParams.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный идентификатор пациента (ожидается UUID)",
			});
		}
		const { patientId } = parsedParams.data;
		const parsed = shareConsentLinkSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректные параметры ссылки",
				details: parsed.error.issues,
			});
		}

		const origin = resolveSafeConsentOrigin(request);

		const result = generateConsentShareLink(origin, orgId, patientId, parsed.data, request.log);
		return reply.send(result);
	});

	// Публичный шлюз верификации ссылки подписания согласия
	app.get("/api/public/consents/share-info", async (request: FastifyRequest, reply: FastifyReply) => {
		const parsedQuery = consentShareInfoQuerySchema.safeParse(request.query ?? {});
		if (!parsedQuery.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Токен подписания обязателен",
			});
		}
		const { token } = parsedQuery.data;

		const payload = verifyToken(token, requireAuthTokenSecret());
		const isValidScope = payload && (payload.scope === "cs" || payload.scope === "consent_share");
		const patientId = payload ? String(payload.pid || payload.patientId || "") : "";
		if (!payload || !isValidScope || !patientId) {
			return reply.code(401).send({
				error: "InvalidOrExpiredToken",
				message: "Ссылка для подписания согласия недействительна или срок её действия истёк.",
			});
		}

		const orgId = (payload.oid || payload.orgId) ? String(payload.oid || payload.orgId) : undefined;
		const parsedKind = consentKindSchema.safeParse(payload.k || payload.kind);
		const consentKind: ConsentKind = parsedKind.success ? parsedKind.data : "informed_consent";
		const visitId = (payload.vid || payload.visitId) ? String(payload.vid || payload.visitId) : null;

		let patientName = "Пациент";
		let clinicName = "Стоматологическая клиника";

		try {
			if (orgId) {
				const [pRow, oRow] = await withSuperuserBypass(async (tx) => {
					const [patient] = await tx
						.select({ fullName: patients.fullName })
						.from(patients)
						.where(and(eq(patients.id, patientId), eq(patients.organizationId, orgId)))
						.limit(1);
					const [organization] = await tx
						.select({ name: organizations.name })
						.from(organizations)
						.where(eq(organizations.id, orgId))
						.limit(1);
					return [patient, organization];
				});
				if (pRow?.fullName) patientName = pRow.fullName;
				if (oRow?.name) clinicName = oRow.name;
			}
		} catch (lookupErr) {
			request.log.warn(
				{ err: lookupErr, orgId, patientId },
				"[consents] Не удалось загрузить метаданные для публичной ссылки согласия",
			);
		}

		return reply.send({
			valid: true,
			patientName,
			clinicName,
			title: payload.title || "Информированное добровольное согласие",
			kind: consentKind,
			patientId,
			visitId,
		});
	});

	// Публичный шлюз фиксации подписи согласия пациентом
	app.post("/api/public/consents/sign", async (request: FastifyRequest, reply: FastifyReply) => {
		const rawIdemKey =
			request.headers["idempotency-key"] ||
			request.headers["x-idempotency-key"];
		const idempotencyKey =
			typeof rawIdemKey === "string" ? rawIdemKey.trim() : undefined;
		if (idempotencyKey) {
			reply.header("X-Idempotency-Key", idempotencyKey);
		}

		const parsed = publicSignConsentSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректные параметры подписи",
				details: parsed.error.issues,
			});
		}

		const payload = verifyToken(parsed.data.token, requireAuthTokenSecret());
		const isValidScope = payload && (payload.scope === "cs" || payload.scope === "consent_share");
		const patientId = payload ? String(payload.pid || payload.patientId || "") : "";
		if (!payload || !isValidScope || !patientId) {
			return reply.code(401).send({
				error: "InvalidOrExpiredToken",
				message: "Ссылка для подписания согласия недействительна или срок её действия истёк.",
			});
		}

		let orgId = (payload.oid || payload.orgId) ? String(payload.oid || payload.orgId) : undefined;

		if (!orgId) {
			const [pRow] = await withSuperuserBypass(async (tx) =>
				tx
					.select({ organizationId: patients.organizationId })
					.from(patients)
					.where(eq(patients.id, patientId))
					.limit(1),
			);
			if (pRow?.organizationId) {
				orgId = pRow.organizationId;
			}
		}

		if (!orgId) {
			return reply.code(400).send({
				error: "MissingTenant",
				message: "Не удалось определить клинику для регистрации согласия",
			});
		}

		const parsedKind = consentKindSchema.safeParse(payload.k || payload.kind);
		const consentKind: ConsentKind = parsedKind.success ? parsedKind.data : "informed_consent";
		const consentTitle =
			typeof payload.title === "string" && payload.title.trim()
				? payload.title.trim()
				: "Информированное добровольное согласие";
		const visitId = (payload.vid || payload.visitId) ? String(payload.vid || payload.visitId) : undefined;

		// DEF-DOM-Q-01 / 63-ФЗ: Валидация и гарантированная фиксация SHA-256 хеша целостности снапшота
		const rawHash = parsed.data.integrityHash?.trim();
		const isValidHash = rawHash && /^[0-9a-f]{64}$/i.test(rawHash);
		const effectiveHash = isValidHash
			? rawHash.toLowerCase()
			: createHash("sha256")
					.update(
						JSON.stringify({
							title: consentTitle,
							patientId,
							orgId,
							kind: consentKind,
							timestamp: new Date().toISOString(),
						}),
					)
					.digest("hex");

		const safeSvg = sanitizeConsentSignatureSvg(parsed.data.signatureSvg);
		if (!safeSvg.ok) {
			return reply.code(400).send({
				error: "ValidationError",
				message: safeSvg.message,
			});
		}

		try {
			const result = await recordPatientConsentEntry(orgId, patientId, {
				kind: consentKind,
				consentType: consentKind,
				title: consentTitle,
				isSigned: true,
				signedAt: new Date().toISOString(),
				signatureType: parsed.data.signatureType || "digital_canvas",
				verificationMethod: "patient_portal",
				signatureSvg: safeSvg.value,
				integrityHash: effectiveHash,
				visitId: visitId,
				notes: parsed.data.notes || "Подписано пациентом онлайн по ссылке дистанционного подписания",
			});

			return reply.code(201).send({
				success: true,
				message: "Согласие успешно подписано и зарегистрировано в медицинской карте.",
				consent: result,
			});
		} catch (error) {
			if (error instanceof PatientNotFoundError) {
				return reply.code(404).send({
					error: "PatientNotFound",
					message: error.message,
				});
			}
			if (error instanceof ConsentDocumentNotFoundError) {
				return reply.code(404).send({
					error: "DocumentNotFound",
					message: error.message,
				});
			}
			throw error;
		}
	});
}

export const registerConsentRoutes = register;

