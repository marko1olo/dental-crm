/**
 * treatmentPlansRoutesFacade.test.ts — Red Team аудит маршрутов планов лечения и 3-Tier смет API.
 *
 * Проверяет:
 * 1. Экспорт канонического Fastify-плагина treatmentPlanRoutes / treatmentPlans.
 * 2. Zod-схему параметров запроса воронки и конвейера.
 * 3. Отсутствие номеров советских приказов в интерфейсах роутов.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { treatmentPlanRoutes, default as defaultExport } from "../routes/treatmentPlans.js";
import { treatmentPlanQuerySchema } from "../routes/treatmentPlan/pipelineTypes.js";

describe("Treatment Plans API Routes & Types Facade (apps/api/src/routes/treatmentPlans.ts)", () => {
	it("1. Exports FastifyPluginAsync as both named and default export", () => {
		assert.equal(typeof treatmentPlanRoutes, "function", "treatmentPlanRoutes must be a Fastify plugin function");
		assert.equal(treatmentPlanRoutes, defaultExport, "Default export must equal named export");
	});

	it("2. Validates query parameters schema for treatment plan pipeline", () => {
		const validQuery = {
			search: "Иванов",
			status: "proposed",
			page: "1",
			limit: "20",
		};
		const result = treatmentPlanQuerySchema.safeParse(validQuery);
		assert.equal(result.success, true, "Valid query must parse successfully");
	});

	it("3. Upholds Mandate 8ap: Route definitions contain no Soviet law numbers", () => {
		const routePluginString = treatmentPlanRoutes.toString();
		assert.ok(!routePluginString.includes("54-ФЗ"), "Routes must not contain 54-ФЗ");
		assert.ok(!routePluginString.includes("54Fz"), "Routes must not contain 54Fz");
	});
});
