import type { FastifyInstance } from "fastify";
import { requireExecutiveAccess } from "./executiveAccessGuard.js";
import {
	calculateCohortLtv,
	type CohortCalculationResult,
	type CohortLtvItem,
} from "./cohortLtvCalculator.js";

export type { CohortCalculationResult, CohortLtvItem };
export { calculateCohortLtv };

export async function registerCohortRoutes(app: FastifyInstance) {
	app.get("/api/analytics/cohorts", async (request, reply) => {
		const orgId = await requireExecutiveAccess(request, reply);
		if (!orgId) return;

		try {
			const result = await calculateCohortLtv(orgId, new Date());
			return { success: true, data: result };
		} catch (e) {
			request.log.error({ err: e }, "Не удалось рассчитать когортный анализ");
			return reply.code(503).send({
				success: false,
				error: "CohortAnalyticsUnavailable",
				message: "Не удалось рассчитать когортный анализ. Повторите позже.",
			});
		}
	});
}
