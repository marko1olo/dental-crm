import type { FastifyInstance } from "fastify";
import { registerSanpinSterilizationRoutes } from "../sanpin/sterilizationRoutes.js";

export * from "./types.js";
export * from "./sterilizationHelpers.js";
export * from "./sterilizationLogHandlers.js";
export * from "./sterilizationKraftHandlers.js";

/**
 * Fastify plugin: Регистрация маршрутов контроля стерилизации (СанПиН 2.1.3678-20, СанПиН 3.3686-21).
 * Делегирует единому SSOT в registerSanpinSterilizationRoutes.
 */
export async function registerSterilizationRoutes(app: FastifyInstance): Promise<void> {
	registerSanpinSterilizationRoutes(app);
}
