import type { FastifyInstance } from "fastify";
import { registerEndoRoutes } from "./endoRoutes.js";

export * from "./endoRoutes.js";

/**
 * Канонический шлюз маршрутов эндодонтии и поверхностей зуба.
 * Делегирует исполнение в изолированный модуль endoRoutes.ts.
 */
export function registerSurfaceRoutes(app: FastifyInstance): void {
	registerEndoRoutes(app);
}

export default registerSurfaceRoutes;
