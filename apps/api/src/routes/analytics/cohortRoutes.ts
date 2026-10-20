import type { FastifyInstance } from "fastify";
import {
	requireClinicalReadAccess,
	requireResolvedOrganizationId,
} from "../../accessGuard.js";
import {
	calculateCohortLtv,
	type CohortCalculationResult,
	type CohortLtvItem,
} from "./cohortLtvCalculator.js";

export type { CohortCalculationResult, CohortLtvItem };
export { calculateCohortLtv };

export async function registerCohortRoutes(app: FastifyInstance) {
	app.get("/api/analytics/cohorts", async (request, reply) => {
		const readAllowed = await requireClinicalReadAccess(request, reply, "cohort analytics");
		if (!readAllowed) return;

		const orgId = await requireResolvedOrganizationId(request, reply, "cohort analytics");
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
