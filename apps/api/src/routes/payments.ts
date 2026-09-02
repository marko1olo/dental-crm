/**
 * apps/api/src/routes/payments.ts
 *
 * DENTE Dental CRM — Centralized Payment Routes Barrel.
 * Registers Sberbank acquiring, Sberbank POS terminal, SberPay QR, and payment webhooks.
 */

import type { FastifyInstance } from "fastify";
import { registerSberbankRoutes } from "./sberbank.js";
import { registerSberPosWebhookRoutes } from "./payments/sberPosWebhookRoute.js";

export async function registerPaymentRoutes(app: FastifyInstance): Promise<void> {
	await registerSberbankRoutes(app);
	await registerSberPosWebhookRoutes(app);
}

export * from "./sberbank.js";
export * from "./payments/sberPosWebhookRoute.js";
