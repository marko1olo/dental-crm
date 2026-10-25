/**
 * apps/api/src/routes/sanpin/cleaningRoutes.ts
 * Тонкий фасад роутов генеральных уборок и дезинфекции.
 * Мандат 8b: строго <= 120 строк (фасад <= 30 строк).
 */

import type { FastifyInstance } from "fastify";
import { handlePostCleaningAutopilotMonth } from "./cleaningModules/cleaningAutopilotHandler.js";
import {
	handleGetCleaning,
	handlePostCleaning,
	handleVerifyCleaning,
} from "./cleaningModules/cleaningCrudHandlers.js";

export function registerSanpinCleaningRoutes(app: FastifyInstance) {
	// 1. Журнал генеральных уборок и дезинфекции
	app.get("/api/registers/cleaning", handleGetCleaning);
	app.post("/api/registers/cleaning", handlePostCleaning);
	app.put("/api/registers/cleaning/:id/verify", handleVerifyCleaning);

	// 2. Месячный график генеральных уборок в 1 клик
	app.post("/api/registers/cleaning/autopilot-month", handlePostCleaningAutopilotMonth);
}
