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

const sberPosMutationOptions = {
	schema: {
		description: "Sberbank POS mutation with mandatory RFC 9562 Idempotency-Key",
		headers: {
			type: "object",
			properties: {
				"idempotency-key": { type: "string" },
				"x-idempotency-key": { type: "string" },
				organizationid: { type: "string" },
				"x-organization-id": { type: "string" },
			},
		},
	},
} as const;

export async function registerSberPosWebhookRoutes(app: FastifyInstance): Promise<void> {
	app.post("/api/payments/sberbank/pos/initiate", sberPosMutationOptions, initiateSberPosPaymentHandler);
	app.get("/api/payments/sberbank/pos/status/:orderId", getSberPosStatusHandler);
	app.post("/api/payments/sberbank/pos/webhook", webhookHandler);
	app.post("/api/payments/sberbank/qr/webhook", webhookHandler);
	app.post("/api/payments/sberpos/webhook", webhookHandler);
	app.post("/api/payments/sberbank/pos/reconcile-rrn", sberPosMutationOptions, reconcileRrnHandler);
	app.post("/api/payments/sberbank/pos/void", sberPosMutationOptions, voidSberPosHandler);
	app.post("/api/payments/sberbank/pos/transaction", sberPosMutationOptions, sberPosTransactionHandler);
	app.post("/api/payments/sberbank/pos/reversal", sberPosMutationOptions, voidSberPosHandler);
}
