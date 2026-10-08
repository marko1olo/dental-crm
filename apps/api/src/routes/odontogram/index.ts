import type { FastifyInstance } from "fastify";
import { registerHistoryRoutes } from "./historyRoutes.js";
import { registerPediatricRoutes } from "./pediatricRoutes.js";
import { registerPeriodontalRoutes } from "./periodontalRoutes.js";
import { registerPlanCompletionRoutes } from "./planCompletionRoutes.js";
import { registerPlanCrudRoutes } from "./planCrudRoutes.js";
import { registerPlanVariantRoutes } from "./planVariantRoutes.js";
import { registerStatusRoutes } from "./statusRoutes.js";
import { registerSurfaceRoutes } from "./surfaceRoutes.js";

export * from "./types.js";
export * from "./planHelpers.js";
export * from "./statusRoutes.js";
export * from "./surfaceRoutes.js";
export * from "./historyRoutes.js";
export * from "./periodontalRoutes.js";
export * from "./pediatricRoutes.js";
export * from "./planCrudRoutes.js";
export * from "./planCompletionRoutes.js";
export * from "./planVariantRoutes.js";

/**
 * Главный Fastify-плагин маршрутов зубной формулы, эндодонтии и планов лечения
 * Обеспечивает единую точку монтажа для всех доменных суброутов
 */
export async function registerOdontogramRoutes(app: FastifyInstance): Promise<void> {
	registerStatusRoutes(app);
	registerSurfaceRoutes(app);
	registerHistoryRoutes(app);
	registerPeriodontalRoutes(app);
	registerPediatricRoutes(app);
	registerPlanCrudRoutes(app);
	registerPlanCompletionRoutes(app);
	registerPlanVariantRoutes(app);
}

export default registerOdontogramRoutes;
