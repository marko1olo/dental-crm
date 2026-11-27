import type { FastifyInstance } from "fastify";
import { registerSberbankCancelReconcileRoute } from "./sberbankCancelReconcileRoute.js";
import {
	registerSberbankPayRoute,
	type RegisterSberbankPayRouteOptions,
} from "./sberbankPayRoute.js";
import { registerSberbankStatusRoutes } from "./sberbankStatusRoute.js";

/**
 * Registers Sberbank internet acquiring payment and status reconciliation endpoints:
 * - POST /api/sberbank/pay
 * - GET /api/sberbank/status/:orderId
 * - POST /api/sberbank/status/:orderId
 * - POST /api/sberbank/cancel-or-reconcile
 */
export async function registerSberbankPaymentRoutes(
	app: FastifyInstance,
	options?: RegisterSberbankPayRouteOptions,
): Promise<void> {
	await registerSberbankPayRoute(app, options);
	await registerSberbankStatusRoutes(app);
	await registerSberbankCancelReconcileRoute(app);
}
