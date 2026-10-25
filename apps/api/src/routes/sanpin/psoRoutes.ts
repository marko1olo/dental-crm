/**
 * apps/api/src/routes/sanpin/psoRoutes.ts
 * Тонкий фасад роутов предстерилизационной очистки.
 * Мандат 8b: строго <= 120 строк (фасад <= 30 строк).
 */

import type { FastifyInstance } from "fastify";
import {
	handleDeletePso,
	handleGetPso,
	handlePostPso,
} from "./psoModules/psoCrudHandlers.js";
import { handlePostPsoQuickNorm } from "./psoModules/psoQuickNormHandler.js";

export function registerSanpinPsoRoutes(app: FastifyInstance) {
	// 1. Журнал предстерилизационной очистки
	app.get("/api/registers/pso", handleGetPso);
	app.post("/api/registers/pso", handlePostPso);
	app.delete("/api/registers/pso/:id", handleDeletePso);

	// 2. 1-клик фиксация нормы (азопирам + фенолфталеин)
	app.post("/api/registers/pso/quick-norm", handlePostPsoQuickNorm);
}
