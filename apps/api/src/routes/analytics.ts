import { desc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { requireResolvedOrganizationId } from "../accessGuard.js";
import { db } from "../db/client.js";
import { biAnalyticsSnapshots } from "../db/schema.js";

export async function registerAnalyticsRoutes(app: FastifyInstance) {
	app.get("/api/analytics/dashboard", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"analytics dashboard",
		);
		if (!orgId) return;

		// Try to get the latest snapshot
		const latestSnapshot = await db
			.select()
			.from(biAnalyticsSnapshots)
			.where(eq(biAnalyticsSnapshots.organizationId, orgId))
			.orderBy(desc(biAnalyticsSnapshots.createdAt))
			.limit(1);

		if (latestSnapshot.length > 0) {
			return { success: true, data: latestSnapshot[0] };
		}

		// Fallback if no snapshot exists yet
		return {
			success: true,
			data: {
				cohortLtvJson: [],
				planFunnelJson: [],
				chairUtilizationJson: [],
				doctorProfitabilityJson: [],
			},
		};
	});
}
