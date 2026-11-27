import type { FastifyInstance } from "fastify";
import { requireResolvedOrganizationId } from "../../accessGuard.js";
import { defineStreamRoute } from "../../core/routeFactories.js";
import { withTenantReadCtx } from "../../db/rls.js";
import { calculateLeadPipelineMetrics, type PipelineMetricsResult } from "../leadsMetrics.js";

export type { PipelineMetricsResult };

export async function registerLeadSourceAnalyticsRoutes(app: FastifyInstance): Promise<void> {
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/leads/pipeline-metrics",
		permission: "public",
		handler: async ({ request: req, reply }) => {
			const organizationId = await requireResolvedOrganizationId(
				req,
				reply,
				"leads pipeline metrics read",
			);
			if (!organizationId) return;

			return await withTenantReadCtx(organizationId, (tx) =>
				calculateLeadPipelineMetrics(tx, organizationId),
			);
		},
	});
}
