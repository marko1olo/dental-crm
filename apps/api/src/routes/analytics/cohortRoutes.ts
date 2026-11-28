import type { FastifyInstance } from "fastify";
import { defineTenantQuery } from "../../core/routeFactories.js";
import { requireExecutiveAccess } from "./executiveAccessGuard.js";
import {
	calculateCohortLtv,
	type CohortCalculationResult,
	type CohortLtvItem,
} from "./cohortLtvCalculator.js";

export type { CohortCalculationResult, CohortLtvItem };
export { calculateCohortLtv };

export async function registerCohortRoutes(app: FastifyInstance) {
	defineTenantQuery(app, {
		path: "/api/analytics/cohorts",
		permission: {
			customCheck: async (_principal, request, reply) =>
				Boolean(await requireExecutiveAccess(request, reply)),
		},
		authOptions: {
			allowAdminSecretBypass: true,
			allowClinicTokenWithoutStaff: true,
			allowUnverifiedHeaderRead: true,
		},
		handler: async ({ tx, organizationId: orgId, request, reply }) => {
			try {
				const result = await calculateCohortLtv(orgId, new Date(), tx);
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
