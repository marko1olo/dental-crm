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
import {
	requireClinicalMutationAccess,
	requireClinicalReadAccess,
} from "../accessGuard.js";
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

// ─── Request Schemas ────────────────────────────────────────────────────────

const signPayloadBodySchema = z.object({
	data: z.string({
		required_error: "Поле data (содержимое документа для подписи) обязательно",
		invalid_type_error: "Поле data должно быть строкой",
	}).min(1, "Данные для подписания не могут быть пустыми"),
	dataEncoding: z.enum(["utf8", "base64"]).default("utf8"),
	thumbprint: z.string({
		required_error: "Отпечаток сертификата thumbprint обязателен",
		invalid_type_error: "Отпечаток сертификата должен быть строкой",
	}).trim().min(1, "Отпечаток сертификата обязателен"),
	requestId: z.string().trim().optional(),
	documentId: z.string().trim().optional(),
	documentKind: z.string().trim().optional(),
});

const thumbprintParamSchema = z.object({
	thumbprint: z.string().trim().min(1, "Отпечаток сертификата обязателен"),
});

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
 */
export async function getTenantCryptoContext(request: FastifyRequest): Promise<TenantCryptoContext> {
	const identity = getRequestIdentity(request);
	if (!identity.organizationId) {
		return {
			organizationId: null,
			clinicInn: null,
			clinicOgrn: null,
			clinicName: null,
			clinicLegalName: null,
			allowedDoctorNames: identity.fullName ? [identity.fullName.trim().toLowerCase()] : [],
			allowedSnils: [],
			isBypass: true,
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
		const settings = await getClinicSettingsFromDb(identity.organizationId);
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
	} catch {
		// При отсутствии БД или настроек фильтруем по identity
	}

	return {
		organizationId: identity.organizationId,
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

	// 4. Совпадение по ФИО врача (фамилия + имя или полное совпадение)
	if (cert.doctorFullName && context.allowedDoctorNames.length > 0) {
		const certNameClean = cert.doctorFullName.trim().toLowerCase().replace(/\s+/g, " ");
		const certParts = certNameClean.split(" ").filter(Boolean);

		for (const allowedName of context.allowedDoctorNames) {
			const allowedNameClean = allowedName.trim().toLowerCase().replace(/\s+/g, " ");
			if (certNameClean === allowedNameClean) return true;
			if (certNameClean.includes(allowedNameClean) || allowedNameClean.includes(certNameClean)) {
				return true;
			}

			const allowedParts = allowedNameClean.split(" ").filter(Boolean);
			// Проверка совпадения фамилии и первой буквы имени
			if (certParts.length >= 2 && allowedParts.length >= 2) {
				if (certParts[0] === allowedParts[0] && certParts[1]![0] === allowedParts[1]![0]) {
					return true;
				}
			} else if (certParts.length >= 1 && allowedParts.length >= 1) {
				if (certParts[0] === allowedParts[0] && certParts[0]!.length >= 3) {
					return true;
				}
			}
		}
	}

	// 5. Совпадение по наименованию организации
	if (cert.organizationName) {
		const certOrg = cert.organizationName.toLowerCase().replace(/["'«»]/g, "").trim();
		if (context.clinicLegalName) {
			const legalName = context.clinicLegalName.toLowerCase().replace(/["'«»]/g, "").trim();
			if (certOrg.length >= 3 && (certOrg === legalName || certOrg.includes(legalName) || legalName.includes(certOrg))) {
				return true;
			}
		}
		if (context.clinicName) {
			const clinicName = context.clinicName.toLowerCase().replace(/["'«»]/g, "").trim();
			if (certOrg.length >= 3 && (certOrg === clinicName || certOrg.includes(clinicName) || clinicName.includes(certOrg))) {
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
	details?: unknown;
} {
	if (err instanceof CryptoProCliError) {
		let statusCode = 500;
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

		return {
			statusCode,
			code: err.code,
			message: err.message,
			details: err.details,
		};
	}

	const message = err instanceof Error ? err.message : String(err);
	return {
		statusCode: 500,
		code: "CRYPTO_INTERNAL_ERROR",
		message,
	};
}

// ─── Access Guard Helper ───────────────────────────────────────────────────

async function checkCryptoAccess(
	request: FastifyRequest,
	reply: FastifyReply,
	mode: "read" | "mutation",
	areaName: string,
): Promise<boolean> {
	const identity = getRequestIdentity(request);
	// 1. Авторизованный сотрудник клиники (врач, главный врач, управляющий, администратор)
	if (identity.organizationId && identity.userId) {
		return true;
	}

	// 2. Доступ по секрету администратора или dev-режиму
	if (mode === "read") {
		return requireClinicalReadAccess(request, reply, areaName);
	}
	return requireClinicalMutationAccess(request, reply, areaName);
}

// ─── Route Registration ─────────────────────────────────────────────────────

export async function registerCryptoProNativeRoutes(app: FastifyInstance) {
	/**
	 * GET /api/crypto/status
	 * Проверка статуса наличия КриптоПро CSP в операционной системе.
	 */
	app.get("/api/crypto/status", async (request, reply) => {
		const allowed = await checkCryptoAccess(request, reply, "read", "crypto status");
		if (!allowed) return;

		const status = await getCryptoProCliStatus();
		return reply.send({
			success: true,
			installed: status.installed,
			paths: status.paths,
		});
	});

	/**
	 * GET /api/crypto/certificates
	 * Получение списка установленных сертификатов УКЭП с фильтрацией по текущей клинике/врачу.
	 * КАТЕГОРИЧЕСКИЙ ЗАПРЕТ НА ФЕЙКОВЫЕ СЕРТИФИКАТЫ:
	 * Если КриптоПро CSP не обнаружен в системе — возвращает HTTP 503 с кодом CSP_NOT_INSTALLED.
	 */
	app.get("/api/crypto/certificates", async (request, reply) => {
		const allowed = await checkCryptoAccess(request, reply, "read", "crypto certificates");
		if (!allowed) return;

		const installed = await isCryptoProInstalled();
		if (!installed) {
			return reply.status(503).send({
				success: false,
				code: "CSP_NOT_INSTALLED",
				message: "КриптоПро CSP не обнаружен в операционной системе",
			});
		}

		try {
			const certs = await listInstalledCertificates();
			const tenantContext = await getTenantCryptoContext(request);
			const filteredCerts = certs.filter((c) => isCertificateAllowedForTenant(c, tenantContext));

			return reply.send({
				success: true,
				certificates: filteredCerts,
				total: filteredCerts.length,
			});
		} catch (err: unknown) {
			const mapped = mapCryptoErrorToHttpStatus(err);
			return reply.status(mapped.statusCode).send({
				success: false,
				code: mapped.code,
				message: mapped.message,
				details: mapped.details,
			});
		}
	});

	/**
	 * GET /api/crypto/certificates/:thumbprint
	 * Получение конкретного сертификата по отпечатку с валидацией принадлежности клинике
	 * и наличия закрытого ключа.
	 */
	app.get<{ Params: { thumbprint: string } }>("/api/crypto/certificates/:thumbprint", async (request, reply) => {
		const allowed = await checkCryptoAccess(request, reply, "read", "crypto certificate details");
		if (!allowed) return;

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
				message: "КриптоПро CSP не обнаружен в операционной системе",
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

			const tenantContext = await getTenantCryptoContext(request);
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
			const mapped = mapCryptoErrorToHttpStatus(err);
			return reply.status(mapped.statusCode).send({
				success: false,
				code: mapped.code,
				message: mapped.message,
				details: mapped.details,
			});
		}
	});

	/**
	 * POST /api/crypto/sign
	 * Формирование отсоединенной электронной подписи (detached CMS / PKCS#7)
	 * по ГОСТ Р 34.10-2012 для CDA R3 XML, выгрузок в ЕГИСЗ РЭМД или формы 043/у.
	 *
	 * КАТЕГОРИЧЕСКИЙ ЗАПРЕТ НА ФЕЙКОВЫЕ ПОДПИСИ:
	 * При отсутствии КриптоПро в системе возвращает честный HTTP 503 CSP_NOT_INSTALLED
	 * (строгий запрет на Math.random() и фальшивые CMS).
	 */
	app.post("/api/crypto/sign", async (request, reply) => {
		const allowed = await checkCryptoAccess(request, reply, "mutation", "crypto sign");
		if (!allowed) return;

		const installed = await isCryptoProInstalled();
		if (!installed) {
			return reply.status(503).send({
				success: false,
				code: "CSP_NOT_INSTALLED",
				message: "КриптоПро CSP не обнаружен в операционной системе",
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

		const { data, dataEncoding, thumbprint, requestId, documentId, documentKind } = parsed.data;
		const cleanThumbprint = thumbprint.replace(/[\s:-]/g, "").toUpperCase();

		if (!/^[A-F0-9]{40}$/i.test(cleanThumbprint)) {
			return reply.status(400).send({
				success: false,
				code: "INVALID_THUMBPRINT",
				message: "Некорректный отпечаток сертификата: ожидается 40-значный шестнадцатеричный SHA-1 отпечаток",
			});
		}

		// Преобразуем входящие данные в байтовый Buffer
		let dataBuffer: Buffer;
		try {
			dataBuffer = dataEncoding === "base64"
				? Buffer.from(data, "base64")
				: Buffer.from(data, "utf8");
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

			if (cert) {
				const tenantContext = await getTenantCryptoContext(request);
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
			}

			const signatureBuffer = await signDetachedGost(dataBuffer, cleanThumbprint, { requestId });
			const signatureBase64 = signatureBuffer.toString("base64");

			return reply.send({
				success: true,
				signatureBase64,
				thumbprint: cleanThumbprint,
				documentId: documentId ?? null,
				documentKind: documentKind ?? null,
				algorithm: "GOST R 34.10-2012",
				containerFormat: "CMS_PKCS7_DETACHED_CADES_BES",
				signedAt: new Date().toISOString(),
			});
		} catch (err: unknown) {
			const mapped = mapCryptoErrorToHttpStatus(err);
			return reply.status(mapped.statusCode).send({
				success: false,
				code: mapped.code,
				message: mapped.message,
				details: mapped.details,
			});
		}
	});
}
