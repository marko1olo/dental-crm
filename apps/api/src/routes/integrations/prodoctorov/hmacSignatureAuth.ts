/**
 * routes/integrations/prodoctorov/hmacSignatureAuth.ts
 * Layer 1: Проверка цифровой подписи HMAC-SHA256 и авторизации входящих вебхуков.
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import { verifyWebhookSecret } from "../../../security/webhookAuth.js";

/**
 * Валидация криптографической подписи HMAC-SHA256 для вебхуков агрегаторов ПроДокторов / МедФлекс.
 */
export function verifyHmacSha256Signature(
	secret: string,
	rawPayload: string | Buffer,
	signatureHex: string,
): boolean {
	if (!secret || !signatureHex) return false;
	try {
		const computed = createHmac("sha256", secret)
			.update(typeof rawPayload === "string" ? Buffer.from(rawPayload, "utf-8") : rawPayload)
			.digest("hex");

		const computedBuf = Buffer.from(computed, "hex");
		const providedBuf = Buffer.from(signatureHex.replace(/^sha256=/i, ""), "hex");

		if (computedBuf.length !== providedBuf.length) {
			return false;
		}

		return timingSafeEqual(computedBuf, providedBuf);
	} catch {
		return false;
	}
}

/**
 * Проверка секрета и цифровой подписи входящего вебхука ПроДокторов / МедФлекс.
 * Проверяет переменные окружения PRODOCTOROV_WEBHOOK_SECRET, MEDFLEX_WEBHOOK_SECRET, DENTE_WEBHOOK_SECRET
 * и заголовки x-prodoctorov-signature, x-medflex-signature, x-medflex-secret.
 */
export function verifyProdoctorovWebhookAuth(
	req: FastifyRequest,
	reply: FastifyReply,
): boolean {
	return verifyWebhookSecret(req, reply, {
		channel: "prodoctorov",
		secretEnvNames: [
			"PRODOCTOROV_WEBHOOK_SECRET",
			"MEDFLEX_WEBHOOK_SECRET",
			"DENTE_WEBHOOK_SECRET",
		],
		extraHeaderNames: [
			"x-prodoctorov-signature",
			"x-medflex-signature",
			"x-medflex-secret",
		],
	});
}
