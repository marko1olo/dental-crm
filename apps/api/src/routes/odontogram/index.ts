import type { FastifyInstance } from "fastify";
import { registerEndoRoutes } from "./endoRoutes.js";
import { registerHistoryRoutes } from "./historyRoutes.js";
import { registerPlanCompletionRoutes } from "./planCompletionRoutes.js";
import { registerPlanPriceFreezeRoutes } from "./planPriceFreezeRoutes.js";
import { registerStatusRoutes } from "./statusRoutes.js";

export * from "./types.js";
export * from "./planHelpers.js";
export * from "./statusRoutes.js";
export * from "./endoRoutes.js";
export * from "./historyRoutes.js";
export * from "./planCompletionRoutes.js";
export * from "./planPriceFreezeRoutes.js";

/**
 * Главный Fastify-плагин маршрутов зубной формулы, эндодонтии и планов лечения
 * Обеспечивает единую точку монтажа для всех доменных суброутов
 */
export async function registerOdontogramRoutes(app: FastifyInstance): Promise<void> {
	registerStatusRoutes(app);
	registerEndoRoutes(app);
	registerHistoryRoutes(app);
	registerPlanCompletionRoutes(app);
	registerPlanPriceFreezeRoutes(app);
}

export default registerOdontogramRoutes;
