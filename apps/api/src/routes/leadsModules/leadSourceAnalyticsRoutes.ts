import type { FastifyInstance } from "fastify";
import { requireResolvedOrganizationId } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { calculateLeadPipelineMetrics, type PipelineMetricsResult } from "../leadsMetrics.js";

export type { PipelineMetricsResult };

export async function registerLeadSourceAnalyticsRoutes(app: FastifyInstance): Promise<void> {
	app.get("/api/leads/pipeline-metrics", async (req, reply) => {
		const organizationId = await requireResolvedOrganizationId(
			req,
			reply,
			"leads pipeline metrics read",
		);
		if (!organizationId) return;

		return await calculateLeadPipelineMetrics(db, organizationId);
	});
}
