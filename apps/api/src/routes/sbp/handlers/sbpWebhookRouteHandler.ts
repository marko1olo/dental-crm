import type { FastifyReply, FastifyRequest } from "fastify";
import { namedDevelopmentModeActive } from "../../../accessGuard.js";
import { verifySbpWebhookSignature } from "../bankGatewaySecurity.js";
import {
	locateSbpWebhookContext,
	processSbpWebhookTransaction,
} from "../sbpPaymentService.js";

/**
 * 4. POST /api/billing/sbp/webhook & POST /api/sbp/webhook
 * Приём входящих уведомлений об оплате по СБП (B2C Dynamic QR / NSPK)
 * с валидацией HMAC-SHA256 / SHA-256 подписи и пессимистической блокировкой.
 */
export async function handleSbpWebhook(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	const secret =
		process.env.SBP_WEBHOOK_SECRET ||
		process.env.DENTE_WEBHOOK_SECRET ||
		process.env.SBERBANK_WEBHOOK_SECRET ||
		process.env.SBERBANK_SECRET_KEY;

	if (!secret && !namedDevelopmentModeActive()) {
		return reply.status(503).send({
			error: "WebhookSecretNotConfigured",
			message:
				"Приём уведомлений от СБП временно недоступен: клиника не подключила защищённую интеграцию.",
		});
	}

	const body = (request.body as Record<string, unknown>) || {};
	const query = (request.query as Record<string, unknown>) || {};
	const payload = { ...query, ...body };

	const incomingSignature =
		(payload.signature as string) ||
		(payload.sign as string) ||
		(payload.checksum as string) ||
		(request.headers["x-sbp-signature"] as string) ||
		(request.headers["x-signature"] as string) ||
		(request.headers["x-dente-webhook-secret"] as string) ||
		(request.headers["x-webhook-secret"] as string);

	if (!incomingSignature) {
		return reply.status(400).send({
			error: "MissingSignature",
			message: "Параметр подписи/контрольной суммы (signature) отсутствует.",
		});
	}

	const effectiveSecret =
		secret || (namedDevelopmentModeActive() ? "dev-sbp-secret" : "");
	if (!effectiveSecret) {
		return reply.status(503).send({
			error: "WebhookSecretNotConfigured",
			message:
				"Приём уведомлений от СБП временно недоступен: клиника не подключила защищённую интеграцию.",
		});
	}

	const isValidSignature = verifySbpWebhookSignature(
		payload,
		effectiveSecret,
		incomingSignature,
	);

	if (!isValidSignature) {
		return reply.status(401).send({
			error: "InvalidSignature",
			message: "Неверная подпись/контрольная сумма вебхука СБП.",
		});
	}

	// Signature guard passed with ZERO DB calls so far.
	const operationId =
		(payload.operationId as string) ||
		(payload.orderId as string) ||
		(payload.mdOrder as string) ||
		(payload.trxId as string) ||
		(payload.paymentId as string) ||
		(payload.clientMutationId as string);

	if (!operationId) {
		return reply.status(400).send({
			error: "MissingOperationId",
			message: "Идентификатор операции (operationId) отсутствует в запросе.",
		});
	}

	const targetContext = await locateSbpWebhookContext(operationId, payload);

	if (!targetContext || !targetContext.organizationId) {
		return reply.status(404).send({
			error: "TransactionNotFound",
			message: `Транзакция СБП с идентификатором '${operationId}' не найдена.`,
		});
	}

	const orgId = targetContext.organizationId;
	const result = await processSbpWebhookTransaction({
		orgId,
		operationId,
		targetContext,
		payload,
		logWarn: (obj, msg) => request.log.warn(obj, msg),
	});

	return reply.status(result.statusCode).send(result.body);
}
