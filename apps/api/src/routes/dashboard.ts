import type { FastifyInstance } from "fastify";
import { dashboardSchema } from "@dental/shared";
import { buildDashboard } from "../sampleData.js";
import { requireClinicalReadAccess } from "../accessGuard.js";

export async function registerDashboardRoutes(app: FastifyInstance) {
  app.get("/api/dashboard", async (request, reply) => {
    if (!(await requireClinicalReadAccess(request, reply, "dashboard"))) return;
    return dashboardSchema.parse(buildDashboard());
  });
}
