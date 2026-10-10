/**
 * whatsappModules/webhookReceiver.ts — Webhook Ingestion & Handshake Verification.
 *
 * Handles Meta Cloud API / WABA / GreenAPI inbound webhooks, X-Hub-Signature HMAC-SHA256
 * verification, hub.verify_token handshake, and event deduplication.
 */

import type { FastifyInstance } from "fastify";
import {
	configuredWhatsappAppSecret,
	isValidWhatsappSignature,
	isWebhookPath,
	registerWhatsappWebhookRoutes,
} from "../whatsappWebhookRoutes.js";

export {
	configuredWhatsappAppSecret,
	isValidWhatsappSignature,
	isWebhookPath,
	registerWhatsappWebhookRoutes,
};

/**
 * Registers all WhatsApp inbound webhook routes and handshake listeners.
 */
export async function registerWebhookReceiverRoutes(
	app: FastifyInstance,
): Promise<void> {
	await registerWhatsappWebhookRoutes(app);
}
