import type { FastifyInstance } from "fastify";
import { handleGenerateQr, handleVerifyPayload } from "./handlers/sbpQrRouteHandlers.js";
import { handleGetSbpStatus } from "./handlers/sbpStatusRouteHandler.js";
import { handleSbpWebhook } from "./handlers/sbpWebhookRouteHandler.js";

export {
	handleGenerateQr,
	handleVerifyPayload,
	handleSbpWebhook,
	handleGetSbpStatus,
};

/**
 * Registers all SBP routes on Fastify instance.
 */
export function registerSbpRoutes(app: FastifyInstance): void {
	const sbpQrRouteOptions = {
		schema: {
			description:
				"SBP dynamic QR generation with mandatory RFC 9562 Idempotency-Key and organizationId isolation",
			headers: {
				type: "object",
				properties: {
					"idempotency-key": { type: "string" },
					"x-idempotency-key": { type: "string" },
				},
			},
		},
	};

	app.post("/api/billing/sbp/generate-qr", sbpQrRouteOptions, handleGenerateQr);
	app.post("/api/sbp/generate-qr", sbpQrRouteOptions, handleGenerateQr);
	app.post("/api/sbp/create-qr", sbpQrRouteOptions, handleGenerateQr);

	app.post("/api/billing/sbp/verify-payload", handleVerifyPayload);
	app.post("/api/sbp/verify-payload", handleVerifyPayload);

	app.post("/api/billing/sbp/webhook", handleSbpWebhook);
	app.post("/api/sbp/webhook", handleSbpWebhook);

	app.get("/api/billing/sbp/status/:id", handleGetSbpStatus);
	app.get("/api/sbp/status/:id", handleGetSbpStatus);
}
