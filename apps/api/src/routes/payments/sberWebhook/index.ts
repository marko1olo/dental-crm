import type { FastifyInstance } from "fastify";
import {
	initiateSberPosPaymentHandler,
	getSberPosStatusHandler,
	reconcileRrnHandler,
	voidSberPosHandler,
	sberPosTransactionHandler,
} from "./idempotencyHandler.js";
import { reconcileInvoiceBalanceInDb, webhookHandler } from "./paymentStateTransition.js";

export { verifySberPosWebhookChecksum } from "./signatureVerifier.js";
export type { SberPosTransactionStatus, InitiateSberPosPaymentInput } from "./types.js";
export { reconcileInvoiceBalanceInDb, webhookHandler } from "./paymentStateTransition.js";

export async function registerSberPosWebhookRoutes(app: FastifyInstance): Promise<void> {
	app.post("/api/payments/sberbank/pos/initiate", initiateSberPosPaymentHandler);
	app.get("/api/payments/sberbank/pos/status/:orderId", getSberPosStatusHandler);
	app.post("/api/payments/sberbank/pos/webhook", webhookHandler);
	app.post("/api/payments/sberbank/qr/webhook", webhookHandler);
	app.post("/api/payments/sberpos/webhook", webhookHandler);
	app.post("/api/payments/sberbank/pos/reconcile-rrn", reconcileRrnHandler);
	app.post("/api/payments/sberbank/pos/void", voidSberPosHandler);
	app.post("/api/payments/sberbank/pos/transaction", sberPosTransactionHandler);
	app.post("/api/payments/sberbank/pos/reversal", voidSberPosHandler);
}
