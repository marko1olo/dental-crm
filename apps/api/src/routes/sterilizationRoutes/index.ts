import type { FastifyInstance } from "fastify";
import { registerSterilizationKraftRoutes } from "./sterilizationKraftHandlers.js";
import { registerSterilizationLogRoutes } from "./sterilizationLogHandlers.js";

export * from "./types.js";
export * from "./sterilizationHelpers.js";
export * from "./sterilizationLogHandlers.js";
export * from "./sterilizationKraftHandlers.js";

/**
 * Fastify plugin: Регистрация всех маршрутов контроля стерилизации (СанПиН 3.3686-21).
 */
export async function registerSterilizationRoutes(app: FastifyInstance): Promise<void> {
	await registerSterilizationLogRoutes(app);
	await registerSterilizationKraftRoutes(app);
}
