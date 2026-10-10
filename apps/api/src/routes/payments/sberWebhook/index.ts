export { verifySberPosWebhookChecksum } from "./signatureVerifier.js";
export type { SberPosTransactionStatus, InitiateSberPosPaymentInput } from "./types.js";
export { reconcileInvoiceBalanceInDb, webhookHandler } from "./paymentStateTransition.js";

import type { FastifyInstance } from "fastify";
import { reconcileInvoiceBalanceInDb, webhookHandler } from "./paymentStateTransition.js";
import {
    initiateSberPosPaymentHandler,
    getSberPosStatusHandler,
    reconcileRrnHandler,
    voidSberPosHandler,
    sberPosTransactionHandler,
} from "./idempotencyHandler.js";

export async function registerSberPosWebhookRoutes(app: FastifyInstance) {
	app.post("/api/payments/sberbank/pos/initiate", initiateSberPosPaymentHandler);
	app.get("/api/payments/sberbank/pos/status/:orderId", getSberPosStatusHandler);
	app.post("/api/payments/sberbank/pos/webhook", webhookHandler);
	app.post("/api/payments/sberbank/qr/webhook", webhookHandler);
	app.post("/api/payments/sberpos/webhook", webhookHandler);
	app.post("/api/payments/sberbank/pos/reconcile-rrn", reconcileRrnHandler);
	app.post("/api/payments/sberbank/pos/void", voidSberPosHandler);
	app.post("/api/payments/sberbank/pos/transaction", sberPosTransactionHandler);
	
	app.post("/api/payments/sberbank/pos/reversal", async (req, rep) => {
		try {
			const res = await app.inject({
				method: "POST",
				url: "/api/payments/sberbank/pos/void",
				headers: req.headers as Record<string, string>,
				payload: req.body as Record<string, unknown>,
			});
			return rep.status(res.statusCode).send(res.json());
		} catch (err) {
			return rep.status(500).send({
				error: "Failed to process POS reversal",
				details: (err as Error).message,
			});
		}
	});
}
