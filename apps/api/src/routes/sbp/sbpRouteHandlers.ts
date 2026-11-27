import type { FastifyInstance } from "fastify";
import { definePublicRoute, defineStreamRoute, defineWebhookRoute } from "../../core/routeFactories.js";
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
		config: { tenantTxSelfManaged: true },
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

	definePublicRoute(app, {
		method: "POST",
		path: "/api/billing/sbp/verify-payload",
		handler: async ({ request, reply }) => handleVerifyPayload(request, reply),
	});
	definePublicRoute(app, {
		method: "POST",
		path: "/api/sbp/verify-payload",
		handler: async ({ request, reply }) => handleVerifyPayload(request, reply),
	});

	defineWebhookRoute(app, {
		method: "POST",
		path: "/api/billing/sbp/webhook",
		handler: async ({ request, reply }) => handleSbpWebhook(request, reply),
	});
	defineWebhookRoute(app, {
		method: "POST",
		path: "/api/sbp/webhook",
		handler: async ({ request, reply }) => handleSbpWebhook(request, reply),
	});

	defineStreamRoute(app, {
		method: "GET",
		path: "/api/billing/sbp/status/:id",
		permission: "public",
		handler: async ({ request, reply }) =>
			handleGetSbpStatus(request as Parameters<typeof handleGetSbpStatus>[0], reply),
	});
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/sbp/status/:id",
		permission: "public",
		handler: async ({ request, reply }) =>
			handleGetSbpStatus(request as Parameters<typeof handleGetSbpStatus>[0], reply),
	});
}
