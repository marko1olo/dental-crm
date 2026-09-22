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
	CryptoProCliError,
	getCryptoProCliStatus,
	isCryptoProInstalled,
	listInstalledCertificates,
	signDetachedGost,
} from "../crypto/cryptoProCliEngine.js";
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
	 * Получение списка установленных сертификатов УКЭП (личные хранилища uMy / аппаратные токены Рутокен/JaCarta).
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
			return reply.send({
				success: true,
				certificates: certs,
				total: certs.length,
			});
		} catch (err: unknown) {
			if (err instanceof CryptoProCliError) {
				const statusCode = err.code === "CSP_NOT_INSTALLED" ? 503 : 500;
				return reply.status(statusCode).send({
					success: false,
					code: err.code,
					message: err.message,
					details: err.details,
				});
			}

			const message = err instanceof Error ? err.message : String(err);
			return reply.status(500).send({
				success: false,
				code: "CERTIFICATES_FETCH_ERROR",
				message: `Ошибка получения списка сертификатов: ${message}`,
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
			const signatureBuffer = await signDetachedGost(dataBuffer, thumbprint, { requestId });
			const signatureBase64 = signatureBuffer.toString("base64");

			return reply.send({
				success: true,
				signatureBase64,
				thumbprint: thumbprint.replace(/[\s:-]/g, "").toUpperCase(),
				documentId: documentId ?? null,
				documentKind: documentKind ?? null,
				algorithm: "GOST R 34.10-2012",
				containerFormat: "CMS_PKCS7_DETACHED_CADES_BES",
				signedAt: new Date().toISOString(),
			});
		} catch (err: unknown) {
			if (err instanceof CryptoProCliError) {
				const statusCode =
					err.code === "CSP_NOT_INSTALLED"
						? 503
						: err.code === "INVALID_THUMBPRINT" || err.code === "EMPTY_PAYLOAD"
							? 400
							: 422;

				return reply.status(statusCode).send({
					success: false,
					code: err.code,
					message: err.message,
					details: err.details,
				});
			}

			const message = err instanceof Error ? err.message : String(err);
			return reply.status(500).send({
				success: false,
				code: "SIGNING_FAILED",
				message: `Ошибка подписания документа через КриптоПро: ${message}`,
			});
		}
	});
}
