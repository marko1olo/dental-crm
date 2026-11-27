import type { FastifyInstance } from "fastify";
import { defineStreamRoute } from "../../core/routeFactories.js";
import { withTenantReadCtx } from "../../db/rls.js";
import { requireExecutiveAccess } from "./executiveAccessGuard.js";
import {
	calculateCohortLtv,
	type CohortCalculationResult,
	type CohortLtvItem,
} from "./cohortLtvCalculator.js";

export type { CohortCalculationResult, CohortLtvItem };
export { calculateCohortLtv };

export async function registerCohortRoutes(app: FastifyInstance) {
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/analytics/cohorts",
		permission: "public",
		handler: async ({ request, reply }) => {
			const orgId = await requireExecutiveAccess(request, reply);
			if (!orgId) return;

			try {
				const result = await withTenantReadCtx(orgId, (tx) =>
					calculateCohortLtv(orgId, new Date(), tx),
				);
				return { success: true, data: result };
			} catch (e) {
				request.log.error({ err: e }, "Не удалось рассчитать когортный анализ");
				return reply.code(503).send({
					success: false,
					error: "CohortAnalyticsUnavailable",
					message: "Не удалось рассчитать когортный анализ. Повторите позже.",
				});
			}
		},
	});
}
