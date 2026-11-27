import type { FastifyReply, FastifyRequest } from "fastify";
import { verifyAndResolveAcquiringWebhook } from "../../sberbankRoutes/acquiringWebhookSecurity.js";
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
	const verified = await verifyAndResolveAcquiringWebhook(
		request,
		reply,
		"sbp",
	);
	if (!verified.ok) return;
	const { orderId: operationId, payload } = verified;

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
