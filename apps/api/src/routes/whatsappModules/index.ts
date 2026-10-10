/**
 * whatsappModules/index.ts — Master Coordinator & Plugin Registration.
 *
 * Layer 5 in DAG hierarchy. Aggregates all modular WhatsApp route providers:
 * - Webhook Receiver & handshake verification
 * - Connection Hub, Settings, QR session pairing, and WABA credentials
 * - Outbound message dispatch & test verification
 * - Template catalog synchronization (HSM)
 * - Media pipeline & secure attachment upload
 */

import type { FastifyInstance } from "fastify";
import { requireNonDoctorAccess } from "../../accessGuard.js";
import {
	isWebhookPath,
	registerWhatsappWebhookRoutes,
	registerWebhookReceiverRoutes,
} from "./webhookReceiver.js";
import { registerConnectionHubRoutes } from "./connectionHubRoutes.js";
import { registerMessageSenderRoutes } from "./messageSenderRoutes.js";
import { registerTemplateManagerRoutes } from "./templateManagerRoutes.js";
import { registerMediaHandlerRoutes } from "./mediaHandlerRoutes.js";

export {
	isWebhookPath,
	registerWhatsappWebhookRoutes,
	registerWebhookReceiverRoutes,
};

export * from "./types.js";
export * from "./connectionHubRoutes.js";
export * from "./messageSenderRoutes.js";
export * from "./templateManagerRoutes.js";
export * from "./mediaHandlerRoutes.js";

/**
 * Fastify plugin: registers all WhatsApp Business Cloud API & Webhook routes.
 */
export async function registerWhatsappRoutes(
	app: FastifyInstance,
): Promise<void> {
	app.addHook("preHandler", async (request, reply) => {
		// Webhook endpoints authenticate via Meta's HMAC SHA-256 / verify token.
		// All other endpoints require staff or admin privileges.
		if (isWebhookPath(request.url)) return;
		const allowed = await requireNonDoctorAccess(request, reply);
		if (!allowed) {
			return reply;
		}
	});

	await registerWebhookReceiverRoutes(app);
	await registerConnectionHubRoutes(app);
	await registerMessageSenderRoutes(app);
	await registerTemplateManagerRoutes(app);
	await registerMediaHandlerRoutes(app);
}
