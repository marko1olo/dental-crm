import type { FastifyInstance } from "fastify";
import { registerSberbankCancelReconcileRoute } from "./sberbankCancelReconcileRoute.js";
import { registerSberbankPayRoute } from "./sberbankPayRoute.js";
import { registerSberbankStatusRoutes } from "./sberbankStatusRoute.js";

/**
 * Registers Sberbank internet acquiring payment and status reconciliation endpoints:
 * - POST /api/sberbank/pay
 * - GET /api/sberbank/status/:orderId
 * - POST /api/sberbank/status/:orderId
 * - POST /api/sberbank/cancel-or-reconcile
 */
export async function registerSberbankPaymentRoutes(app: FastifyInstance): Promise<void> {
	await registerSberbankPayRoute(app);
	await registerSberbankStatusRoutes(app);
	await registerSberbankCancelReconcileRoute(app);
}
