/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FASTIFY ROUTES: NATIVE CRYPTOPRO CSP UKEP BRIDGE (ГОСТ Р 34.10-2012)
 * High-performance native bridge for doctor & clinic UKEP digital signatures.
 * Interacts directly with csptest.exe / cryptcp.exe / certmgr.exe without
 * browser plugins or external dependencies.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { recordAuditEvent } from "../audit.js";
import { getDocumentById } from "../db/documentQuery.js";
import { getPatientByIdFromDb } from "../db/patientsQuery.js";
import { withTenantCtx } from "../db/rls.js";
import {
	CryptoProCertInfo,
	CryptoProCliError,
	getCryptoProCliStatus,
	isCryptoProInstalled,
	listInstalledCertificates,
	signDetachedGost,
} from "../crypto/cryptoProCliEngine.js";
import { getClinicSettingsFromDb } from "../db/settingsQuery.js";
import { getRequestIdentity } from "../security/identity.js";
import { evaluateClinicalAccess } from "../security/medicalSecrecyWarden.js";
import {
	requireClinicalMutationContext,
	requireClinicalReadContext,
} from "../security/tenantContext.js";
import { extractIdempotencyKey, isValidUuid } from "../utils/httpIdempotency.js";
import { clinicalDocKinds, isReceptionistAllowedPrimaryDoc } from "./documents/query.js";

// ─── Request Schemas ────────────────────────────────────────────────────────

const signPayloadBodySchema = z
	.object({
		data: z
			.string({
				required_error: "Поле data (содержимое документа для подписи) обязательно",
				invalid_type_error: "Поле data должно быть строкой",
			})
			.min(1, "Данные для подписания не могут быть пустыми"),
		dataEncoding: z.enum(["utf8", "base64", "hex"]).default("utf8"),
		thumbprint: z
			.string({
				required_error: "Отпечаток сертификата thumbprint обязателен",
				invalid_type_error: "Отпечаток сертификата должен быть строкой",
			})
			.trim()
			.min(1, "Отпечаток сертификата обязателен"),
		pin: z.string().trim().optional(),
		requestId: z.string().trim().optional(),
		documentId: z
			.string()
			.trim()
			.uuid("Некорректный идентификатор документа (ожидается UUID)")
			.optional(),
		documentKind: z.string().trim().optional(),
	})
	.strict();

const thumbprintParamSchema = z
	.object({
		thumbprint: z.string().trim().min(1, "Отпечаток сертификата обязателен"),
	})
	.strict();

// ─── Multi-Tenant Security & Certificate Matching ──────────────────────────

export interface TenantCryptoContext {
	organizationId: string | null;
	clinicInn: string | null;
	clinicOgrn: string | null;
	clinicName: string | null;
	clinicLegalName: string | null;
	allowedDoctorNames: string[];
	allowedSnils: string[];
	isBypass: boolean;
}

/**
 * Извлекает мультитенантный контекст текущей клиники и врача для изоляции сертификатов.
 * ЗАЩИТА: isBypass ВСЕГДА false. Сертификаты чужих клиник и врачей никогда не утекают.
 */
export async function getTenantCryptoContext(
	request: FastifyRequest,
	explicitOrgId?: string,
): Promise<TenantCryptoContext> {
	const identity = getRequestIdentity(request);
	const targetOrgId = explicitOrgId ?? identity.organizationId;
	if (!targetOrgId) {
		return {
			organizationId: null,
			clinicInn: null,
			clinicOgrn: null,
			clinicName: null,
			clinicLegalName: null,
			allowedDoctorNames: identity.fullName ? [identity.fullName.trim().toLowerCase()] : [],
			allowedSnils: [],
			isBypass: false,
		};
	}

	const allowedDoctorNames = new Set<string>();
	const allowedSnils = new Set<string>();
	let clinicInn: string | null = null;
	let clinicOgrn: string | null = null;
	let clinicName: string | null = null;
	let clinicLegalName: string | null = null;

	if (identity.fullName) {
		allowedDoctorNames.add(identity.fullName.trim().toLowerCase());
	}

	try {
		const settings = await withTenantCtx(targetOrgId, () =>
			getClinicSettingsFromDb(targetOrgId),
		);
		if (settings?.profile) {
			clinicInn = settings.profile.inn?.trim() || null;
			clinicOgrn = settings.profile.ogrn?.trim() || null;
			clinicName = settings.profile.clinicName?.trim() || null;
			clinicLegalName = settings.profile.legalName?.trim() || null;
		}
		if (settings?.staff && Array.isArray(settings.staff)) {
			for (const staffMember of settings.staff) {
				if (staffMember.fullName) {
					allowedDoctorNames.add(staffMember.fullName.trim().toLowerCase());
				}
			}
		}
	} catch (err: unknown) {
		// При отсутствии БД или настроек фильтруем по identity
		request.log.debug(
			{ err, organizationId: targetOrgId },
			"[CryptoPro] Не удалось загрузить настройки клиники для контекста УКЭП",
		);
	}

	return {
		organizationId: targetOrgId,
		clinicInn,
		clinicOgrn,
		clinicName,
		clinicLegalName,
		allowedDoctorNames: Array.from(allowedDoctorNames),
		allowedSnils: Array.from(allowedSnils),
		isBypass: false,
	};
}

/**
 * Проверяет, принадлежит ли сертификат текущей организации/врачу (защита от IDOR и утечки сертификатов других тенантов).
 */
export function isCertificateAllowedForTenant(
	cert: CryptoProCertInfo,
	context: TenantCryptoContext,
): boolean {
	if (context.isBypass) return true;

	// 1. Совпадение по ИНН организации/врача (только цифры)
	if (context.clinicInn && cert.inn) {
		const cleanClinicInn = context.clinicInn.replace(/\D/g, "");
		const cleanCertInn = cert.inn.replace(/\D/g, "");
		if (cleanClinicInn.length > 0 && cleanClinicInn === cleanCertInn) {
			return true;
		}
	}

	// 2. Совпадение по ОГРН / ОГРНИП
	if (context.clinicOgrn) {
		const cleanClinicOgrn = context.clinicOgrn.replace(/\D/g, "");
		const cleanCertOgrn = (cert.ogrn ?? "").replace(/\D/g, "");
		const cleanCertOgrnip = (cert.ogrnip ?? "").replace(/\D/g, "");
		if (
			cleanClinicOgrn.length > 0 &&
			(cleanClinicOgrn === cleanCertOgrn || cleanClinicOgrn === cleanCertOgrnip)
		) {
			return true;
		}
	}

	// 3. Совпадение по СНИЛС врача
	if (context.allowedSnils.length > 0 && cert.doctorSnils) {
		const cleanCertSnils = cert.doctorSnils.replace(/\D/g, "");
		if (
			cleanCertSnils.length > 0 &&
			context.allowedSnils.some((s) => s.replace(/\D/g, "") === cleanCertSnils)
		) {
			return true;
		}
	}

	// 4. Совпадение по ФИО врача (точное совпадение или фамилия + инициал имени при длине фамилии >= 2)
	if (cert.doctorFullName && context.allowedDoctorNames.length > 0) {
		const certNameClean = cert.doctorFullName.trim().toLowerCase().replace(/\s+/g, " ");
		const certParts = certNameClean.split(" ").filter(Boolean);
		const certSurname = certParts[0];
		const certGiven = certParts[1];

		for (const allowedName of context.allowedDoctorNames) {
			const allowedNameClean = allowedName.trim().toLowerCase().replace(/\s+/g, " ");
			if (certNameClean === allowedNameClean) return true;

			const allowedParts = allowedNameClean.split(" ").filter(Boolean);
			const allowedSurname = allowedParts[0];
			const allowedGiven = allowedParts[1];
			if (
				certSurname &&
				certGiven &&
				allowedSurname &&
				allowedGiven &&
				certSurname.length >= 2 &&
				certSurname === allowedSurname &&
				certGiven.charAt(0) === allowedGiven.charAt(0)
			) {
				return true;
			}
		}
	}

	// 5. Точное нормализованное совпадение по наименованию организации
	if (cert.organizationName) {
		const normalizeOrgName = (val: string) =>
			val.toLowerCase().replace(/["'«»]/g, "").replace(/\s+/g, " ").trim();
		const certOrg = normalizeOrgName(cert.organizationName);
		if (certOrg.length >= 3 && context.clinicLegalName) {
			if (certOrg === normalizeOrgName(context.clinicLegalName)) {
				return true;
			}
		}
		if (certOrg.length >= 3 && context.clinicName) {
			if (certOrg === normalizeOrgName(context.clinicName)) {
				return true;
			}
		}
	}

	return false;
}

// ─── Error Status Mapper ───────────────────────────────────────────────────

export function mapCryptoErrorToHttpStatus(err: unknown): {
	statusCode: number;
	code: string;
	message: string;
	paperFallbackAvailable: boolean;
} {
	if (err instanceof CryptoProCliError) {
		let statusCode = 422;
		if (err.code === "CSP_NOT_INSTALLED") {
			statusCode = 503;
		} else if (
			err.code === "HARDWARE_TOKEN_NOT_FOUND" ||
			err.code === "CERTIFICATE_NOT_FOUND" ||
			err.code === "CERTIFICATE_KEYSET_NOT_FOUND"
		) {
			statusCode = 404;
		} else if (err.code === "CERTIFICATE_ACCESS_DENIED") {
			statusCode = 403;
		} else if (
			err.code === "INVALID_THUMBPRINT" ||
			err.code === "EMPTY_PAYLOAD" ||
			err.code === "PAYLOAD_DECODE_FAILED" ||
			err.code === "PIN_REQUIRED_OR_ACCESS_DENIED" ||
			err.code === "CERTIFICATE_PRIVATE_KEY_MISSING" ||
			err.code === "VALIDATION_ERROR"
		) {
			statusCode = 400;
		}

		const safeMessage =
			err.code === "CERTIFICATES_ENUM_FAILED"
				? "Не удалось получить список сертификатов из КриптоПро CSP."
				: err.code === "SIGNING_FAILED"
					? "Не удалось сформировать электронную подпись КриптоПро CSP."
					: err.message;

		return {
			statusCode,
			code: err.code,
			message: safeMessage,
			paperFallbackAvailable: true,
		};
	}

	const sysErr = err as { code?: string };
	if (sysErr?.code === "ENOENT") {
		return {
			statusCode: 503,
			code: "CSP_NOT_INSTALLED",
			message:
				"КриптоПро CSP не обнаружен в операционной системе. Доступна работа в автономном режиме и печать бумажного бланка для личной подписи врача.",
			paperFallbackAvailable: true,
		};
	}

	return {
		statusCode: 503,
		code: "CRYPTO_SERVICE_UNAVAILABLE",
		message:
			"Сервис электронной подписи временно недоступен. Вы можете распечатать бумажный бланк документа для живой подписи врача.",
		paperFallbackAvailable: true,
	};
}


// ─── Route Registration ─────────────────────────────────────────────────────

export async function registerCryptoProNativeRoutes(app: FastifyInstance) {
	const handleStatus = async (request: FastifyRequest, reply: FastifyReply) => {
		const context = await requireClinicalReadContext(request, reply, "crypto status");
		if (!context) return;

		const status = await getCryptoProCliStatus();
		return reply.send({
			success: true,
			installed: status.installed,
			signingAvailable: status.signingAvailable,
			paperFallbackAvailable: status.paperFallbackAvailable,
			message: status.message,
			paths: {
				csptest: Boolean(status.paths.csptest),
				cryptcp: Boolean(status.paths.cryptcp),
				certmgr: Boolean(status.paths.certmgr),
			},
		});
	};

	/**
	 * GET /api/crypto/status & GET /api/cryptopro/native/status
	 * Проверка статуса наличия КриптоПро CSP в операционной системе.
	 */
	const selfManagedRouteConfig = { config: { tenantTxSelfManaged: true } } as const;
	app.get("/api/crypto/status", selfManagedRouteConfig, handleStatus);
	app.get("/api/cryptopro/native/status", selfManagedRouteConfig, handleStatus);

	const handleCertificates = async (request: FastifyRequest, reply: FastifyReply) => {
		const context = await requireClinicalReadContext(request, reply, "crypto certificates");
		if (!context) return;

		const installed = await isCryptoProInstalled();
		if (!installed) {
			return reply.status(503).send({
				success: false,
				code: "CSP_NOT_INSTALLED",
				paperFallbackAvailable: true,
				message:
					"КриптоПро CSP не обнаружен в операционной системе. Доступна работа в автономном режиме и печать бумажного бланка для личной подписи врача.",
			});
		}

		try {
			const certs = await listInstalledCertificates();
			const tenantContext = await getTenantCryptoContext(request, context.organizationId);
			const filteredCerts = certs.filter((c) => isCertificateAllowedForTenant(c, tenantContext));

			return reply.send({
				success: true,
				certificates: filteredCerts,
				total: filteredCerts.length,
				paperFallbackAvailable: true,
			});
		} catch (err: unknown) {
			request.log.warn({ err, organizationId: context.organizationId }, "[CryptoPro] Ошибка перечисления сертификатов");
			const mapped = mapCryptoErrorToHttpStatus(err);
			return reply.status(mapped.statusCode).send({
				success: false,
				code: mapped.code,
				message: mapped.message,
				paperFallbackAvailable: mapped.paperFallbackAvailable,
			});
		}
	};

	/**
	 * GET /api/crypto/certificates & GET /api/cryptopro/native/certificates
	 * Получение списка установленных сертификатов УКЭП с фильтрацией по текущей клинике/врачу.
	 */
	app.get("/api/crypto/certificates", selfManagedRouteConfig, handleCertificates);
	app.get("/api/cryptopro/native/certificates", selfManagedRouteConfig, handleCertificates);

	const handleCertificateByThumbprint = async (request: FastifyRequest<{ Params: { thumbprint: string } }>, reply: FastifyReply) => {
		const context = await requireClinicalReadContext(request, reply, "crypto certificate details");
		if (!context) return;

		const paramCheck = thumbprintParamSchema.safeParse(request.params);
		if (!paramCheck.success) {
			return reply.status(400).send({
				success: false,
				code: "INVALID_THUMBPRINT",
				message: "Некорректный отпечаток сертификата",
			});
		}

		const cleanThumbprint = paramCheck.data.thumbprint.replace(/[\s:-]/g, "").toUpperCase();
		if (!/^[A-F0-9]{40}$/i.test(cleanThumbprint)) {
			return reply.status(400).send({
				success: false,
				code: "INVALID_THUMBPRINT",
				message: "Некорректный отпечаток: ожидается 40-значный шестнадцатеричный SHA-1 отпечаток",
			});
		}

		const installed = await isCryptoProInstalled();
		if (!installed) {
			return reply.status(503).send({
				success: false,
				code: "CSP_NOT_INSTALLED",
				paperFallbackAvailable: true,
				message:
					"КриптоПро CSP не обнаружен в операционной системе. Доступна работа в автономном режиме и печать бумажного бланка для личной подписи врача.",
			});
		}

		try {
			const certs = await listInstalledCertificates();
			const cert = certs.find((c) => c.thumbprint.replace(/[\s:-]/g, "").toUpperCase() === cleanThumbprint);

			if (!cert) {
				return reply.status(404).send({
					success: false,
					code: "CERTIFICATE_NOT_FOUND",
					message: `Сертификат с отпечатком ${cleanThumbprint} не найден в хранилище uMy`,
				});
			}

			const tenantContext = await getTenantCryptoContext(request, context.organizationId);
			if (!isCertificateAllowedForTenant(cert, tenantContext)) {
				return reply.status(403).send({
					success: false,
					code: "CERTIFICATE_ACCESS_DENIED",
					message: "Сертификат с данным отпечатком принадлежит другой организации или врачу (доступ запрещен)",
				});
			}

			if (!cert.hasPrivateKey) {
				return reply.status(400).send({
					success: false,
					code: "CERTIFICATE_PRIVATE_KEY_MISSING",
					message: "У данного сертификата отсутствует закрытый ключ (подписание невозможно)",
					certificate: cert,
				});
			}

			return reply.send({
				success: true,
				certificate: cert,
			});
		} catch (err: unknown) {
			request.log.warn({ err, organizationId: context.organizationId }, "[CryptoPro] Ошибка перечисления сертификатов");
			const mapped = mapCryptoErrorToHttpStatus(err);
			return reply.status(mapped.statusCode).send({
				success: false,
				code: mapped.code,
				message: mapped.message,
				paperFallbackAvailable: mapped.paperFallbackAvailable,
			});
		}
	};

	/**
	 * GET /api/crypto/certificates/:thumbprint & GET /api/cryptopro/native/certificates/:thumbprint
	 */
	app.get<{ Params: { thumbprint: string } }>("/api/crypto/certificates/:thumbprint", selfManagedRouteConfig, handleCertificateByThumbprint);
	app.get<{ Params: { thumbprint: string } }>("/api/cryptopro/native/certificates/:thumbprint", selfManagedRouteConfig, handleCertificateByThumbprint);

	const handleSign = async (request: FastifyRequest, reply: FastifyReply) => {
		const context = await requireClinicalMutationContext(request, reply, "crypto sign");
		if (!context) return;

		const organizationId = context.organizationId;
		const identity = getRequestIdentity(request);

		const idempotencyKey = extractIdempotencyKey(request);
		if (idempotencyKey && !isValidUuid(idempotencyKey)) {
			return reply.status(400).send({
				success: false,
				code: "INVALID_IDEMPOTENCY_KEY",
				message: "Заголовок Idempotency-Key должен содержать валидный UUID/UUIDv7.",
			});
		}
		if (idempotencyKey) {
			reply.header("Idempotency-Key", idempotencyKey);
		}

		const installed = await isCryptoProInstalled();
		if (!installed) {
			return reply.status(503).send({
				success: false,
				code: "CSP_NOT_INSTALLED",
				paperFallbackAvailable: true,
				message:
					"КриптоПро CSP не обнаружен в операционной системе. Доступна работа в автономном режиме и печать бумажного бланка для личной подписи врача.",
			});
		}

		const parsed = signPayloadBodySchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.status(400).send({
				success: false,
				code: "VALIDATION_ERROR",
				message: "Некорректные параметры запроса на подписание",
				errors: parsed.error.issues,
			});
		}

		const { data, dataEncoding, thumbprint, pin, requestId, documentId, documentKind } = parsed.data;
		const cleanThumbprint = thumbprint.replace(/[\s:-]/g, "").toUpperCase();

		if (!/^[A-F0-9]{40}$/i.test(cleanThumbprint)) {
			return reply.status(400).send({
				success: false,
				code: "INVALID_THUMBPRINT",
				message: "Некорректный отпечаток сертификата: ожидается 40-значный шестнадцатеричный SHA-1 отпечаток",
			});
		}

		if (documentId) {
			const docPreflightRejection = await withTenantCtx(organizationId, async (tx) => {
				const doc = await getDocumentById(organizationId, documentId, tx);
				if (!doc) {
					return {
						status: 404 as const,
						body: {
							success: false,
							code: "DOCUMENT_NOT_FOUND",
							message: "Документ не найден в данной клинике",
						},
					};
				}
				const access = evaluateClinicalAccess(identity.role, {
					clinicalRole: identity.clinicalRole ?? null,
					canSignMedicalRecords: identity.canSignMedicalRecords ?? false,
					specialties: identity.specialties ?? null,
				});
				if (
					clinicalDocKinds.has(doc.kind) &&
					!access.hasClinicalAccess &&
					!isReceptionistAllowedPrimaryDoc(doc.kind, identity.role)
				) {
					return {
						status: 403 as const,
						body: {
							success: false,
							code: "PermissionDenied",
							message: "Подписание клинического документа недоступно для вашей роли",
						},
					};
				}
				const patient = await getPatientByIdFromDb(organizationId, doc.patientId);
				if (patient?.status === "archived" && !access.hasClinicalAccess) {
					return {
						status: 403 as const,
						body: {
							success: false,
							code: "PermissionDenied",
							message: "Отказ в доступе к документам архивированного пациента",
						},
					};
				}
				return null;
			});
			if (docPreflightRejection) {
				return reply.status(docPreflightRejection.status).send(docPreflightRejection.body);
			}
		}

		// Преобразуем входящие данные в байтовый Buffer
		let dataBuffer: Buffer;
		try {
			if (dataEncoding === "base64") {
				dataBuffer = Buffer.from(data, "base64");
			} else if (dataEncoding === "hex") {
				dataBuffer = Buffer.from(data, "hex");
			} else {
				dataBuffer = Buffer.from(data, "utf8");
			}
		} catch (err: unknown) {
			return reply.status(400).send({
				success: false,
				code: "PAYLOAD_DECODE_FAILED",
				message: `Не удалось декодировать данные в кодировке ${dataEncoding}`,
			});
		}

		if (dataBuffer.length === 0) {
			return reply.status(400).send({
				success: false,
				code: "EMPTY_PAYLOAD",
				message: "Тело документа для формирования подписи не должно быть пустым",
			});
		}

		try {
			// Проверяем принадлежность сертификата текущему тенанту (защита от IDOR)
			const certs = await listInstalledCertificates();
			const cert = certs.find((c) => c.thumbprint.replace(/[\s:-]/g, "").toUpperCase() === cleanThumbprint);

			if (!cert) {
				return reply.status(404).send({
					success: false,
					code: "CERTIFICATE_NOT_FOUND",
					message: "Сертификат с данным отпечатком не найден в хранилище",
				});
			}

			const tenantContext = await getTenantCryptoContext(request, organizationId);
			if (!isCertificateAllowedForTenant(cert, tenantContext)) {
				return reply.status(403).send({
					success: false,
					code: "CERTIFICATE_ACCESS_DENIED",
					message: "Сертификат с данным отпечатком принадлежит другой организации или другому врачу (доступ запрещен)",
				});
			}

			if (!cert.hasPrivateKey) {
				return reply.status(400).send({
					success: false,
					code: "CERTIFICATE_PRIVATE_KEY_MISSING",
					message: "У данного сертификата отсутствует закрытый ключ (подписание невозможно)",
				});
			}

			if (!cert.isValid) {
				return reply.status(400).send({
					success: false,
					code: "CERTIFICATE_EXPIRED_OR_INVALID",
					message: "Срок действия сертификата УКЭП истек или его период действия не подтвержден",
				});
			}

			const signatureBuffer = await signDetachedGost(dataBuffer, cleanThumbprint, { requestId, pin });
			const signatureBase64 = signatureBuffer.toString("base64");
			const signedAt = new Date().toISOString();

			await withTenantCtx(organizationId, (tx) =>
				recordAuditEvent({
					organizationId,
					actorUserId: identity.userId ?? null,
					entityType: documentId ? "generated_document" : "crypto_payload",
					entityId: documentId ?? cleanThumbprint,
					action: "ukep_payload_signed_gost",
					reason: JSON.stringify({
						thumbprint: cleanThumbprint,
						documentKind: documentKind ?? null,
						algorithm: "GOST R 34.10-2012",
						signedAt,
					}),
					tx,
				}),
			);

			return reply.send({
				success: true,
				signatureBase64,
				thumbprint: cleanThumbprint,
				documentId: documentId ?? null,
				documentKind: documentKind ?? null,
				algorithm: "GOST R 34.10-2012",
				containerFormat: "CMS_PKCS7_DETACHED_CADES_BES",
				signedAt,
			});
		} catch (err: unknown) {
			request.log.warn({ err, organizationId, documentId }, "[CryptoPro] Ошибка формирования подписи ГОСТ");
			const mapped = mapCryptoErrorToHttpStatus(err);
			return reply.status(mapped.statusCode).send({
				success: false,
				code: mapped.code,
				message: mapped.message,
			});
		}
	};

	const signPayloadRouteOptions = {
		config: { tenantTxSelfManaged: true },
		schema: {
			description:
				"Формирование отсоединенной подписи УКЭП ГОСТ Р 34.10-2012 с проверкой Idempotency-Key и изоляцией organizationId",
			headers: {
				type: "object",
				properties: {
					"idempotency-key": { type: "string" },
					"x-idempotency-key": { type: "string" },
				},
			},
			body: {
				type: "object",
				required: ["data", "thumbprint"],
				additionalProperties: false,
				properties: {
					data: { type: "string", minLength: 1 },
					dataEncoding: { type: "string", enum: ["utf8", "base64", "hex"] },
					thumbprint: { type: "string", minLength: 1 },
					pin: { type: "string" },
					requestId: { type: "string" },
					documentId: {
						type: "string",
						pattern:
							"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$",
					},
					documentKind: { type: "string" },
				},
			},
		},
	};

	/**
	 * POST /api/crypto/sign & POST /api/cryptopro/native/sign
	 * Формирование отсоединенной электронной подписи (detached CMS / PKCS#7)
	 * по ГОСТ Р 34.10-2012 для CDA R3 XML, выгрузок в ЕГИСЗ РЭМД или меддокументов.
	 * Требует Idempotency-Key и tenant organizationId изоляцию (Мандат 8bo / RFC 9562).
	 */
	app.post("/api/crypto/sign", signPayloadRouteOptions, async (request, reply) => {
		const parsedBody = signPayloadBodySchema.safeParse(request.body);
		if (!parsedBody.success) {
			return reply.status(400).send({
				success: false,
				code: "VALIDATION_ERROR",
				message: "Некорректные параметры запроса на подписание",
				errors: parsedBody.error.issues,
			});
		}
		return handleSign(request, reply);
	});

	app.post("/api/cryptopro/native/sign", signPayloadRouteOptions, async (request, reply) => {
		const parsedBody = signPayloadBodySchema.safeParse(request.body);
		if (!parsedBody.success) {
			return reply.status(400).send({
				success: false,
				code: "VALIDATION_ERROR",
				message: "Некорректные параметры запроса на подписание",
				errors: parsedBody.error.issues,
			});
		}
		return handleSign(request, reply);
	});
}
