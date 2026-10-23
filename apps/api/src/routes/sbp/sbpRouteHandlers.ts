import type { FastifyInstance } from "fastify";
import { handleFiscalizeReceipt } from "./handlers/sbpFiscalRouteHandlers.js";
import { handleGenerateQr, handleVerifyPayload } from "./handlers/sbpQrRouteHandlers.js";
import { handleGetSbpStatus } from "./handlers/sbpStatusRouteHandler.js";
import { handleSbpWebhook } from "./handlers/sbpWebhookRouteHandler.js";

export {
	handleGenerateQr,
	handleVerifyPayload,
	handleFiscalizeReceipt,
	handleSbpWebhook,
	handleGetSbpStatus,
};

/**
 * Registers all SBP and fiscal routes on Fastify instance.
 */
export function registerSbpRoutes(app: FastifyInstance): void {
	app.post("/api/billing/sbp/generate-qr", handleGenerateQr);
	app.post("/api/sbp/generate-qr", handleGenerateQr);
	app.post("/api/sbp/create-qr", handleGenerateQr);

	app.post("/api/billing/sbp/verify-payload", handleVerifyPayload);
	app.post("/api/sbp/verify-payload", handleVerifyPayload);

	app.post("/api/billing/fiscalize-receipt", handleFiscalizeReceipt);

	app.post("/api/billing/sbp/webhook", handleSbpWebhook);
	app.post("/api/sbp/webhook", handleSbpWebhook);

	app.get("/api/billing/sbp/status/:id", handleGetSbpStatus);
	app.get("/api/sbp/status/:id", handleGetSbpStatus);
}
