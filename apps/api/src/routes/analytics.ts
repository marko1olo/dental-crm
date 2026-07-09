import { FastifyInstance } from "fastify";
import { db } from "../db/client.js";
import { biAnalyticsSnapshots } from "../db/schema.js";
import { desc, eq } from "drizzle-orm";

export async function registerAnalyticsRoutes(app: FastifyInstance) {
  app.get("/api/analytics/dashboard", async (request, reply) => {
    // In a real app we'd get organizationId from auth. Hardcoding for MVP
    const orgId = "00000000-0000-0000-0000-000000000000"; // Assuming test org

    // Try to get the latest snapshot
    const latestSnapshot = await db.select()
      .from(biAnalyticsSnapshots)
      // .where(eq(biAnalyticsSnapshots.organizationId, orgId)) // Ignoring org filter for MVP to just get data
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
        doctorProfitabilityJson: []
      }
    };
  });
}
