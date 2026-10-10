import type { FastifyInstance } from "fastify";
import { registerSberbankPaymentRoutes } from "./sberbankPaymentHandlers.js";
import { registerSberbankWebhookRoutes } from "./sberbankWebhookHandlers.js";

/**
 * Master Fastify Registration Plugin for Sberbank Acquiring & Webhook Routes.
 * Assembles payment handlers and webhook callbacks in a clean, decoupled DAG.
 */
export async function registerSberbankRoutes(app: FastifyInstance): Promise<void> {
	await registerSberbankPaymentRoutes(app);
	await registerSberbankWebhookRoutes(app);
}

export default registerSberbankRoutes;

export * from "./types.js";
export * from "./sberbankSecurityHelpers.js";
export * from "./sberbankPaymentHandlers.js";
export * from "./sberbankWebhookHandlers.js";
