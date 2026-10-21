import type { FastifyInstance } from "fastify";
import { handleCreateExpressOrder } from "./expressModules/expressOrderHandlers.js";
import {
	handleCheckPlanContinuity,
	handleGetExpressPresets,
} from "./expressModules/expressPresetsAndPlanHandlers.js";

export async function registerExpressOrderRoutes(app: FastifyInstance) {
	/**
	 * GET /api/clinical/dental-lab/presets
	 * Каталог стандартных пресетов для 1-клик и 3-клик заказов ЗТЛ.
	 */
	app.get("/api/clinical/dental-lab/presets", handleGetExpressPresets);

	/**
	 * POST /api/clinical/dental-lab/check-plan-continuity
	 * Проверка срока плана лечения без блокировок оформления нарядов.
	 */
	app.post("/api/clinical/dental-lab/check-plan-continuity", handleCheckPlanContinuity);

	/**
	 * POST /api/clinical/dental-lab/express-order
	 * Создание наряда в ЗТЛ в 3 клика / 1-клик пресет без бюрократических барьеров.
	 */
	app.post("/api/clinical/dental-lab/express-order", handleCreateExpressOrder);
}
