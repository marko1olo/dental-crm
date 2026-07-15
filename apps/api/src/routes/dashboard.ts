import { dashboardSchema } from "@dental/shared";
import type { FastifyInstance } from "fastify";
import { requireResolvedOrganizationId } from "../accessGuard.js";
import { getDashboardFromDb } from "../db/dashboardQuery.js";

export async function registerDashboardRoutes(app: FastifyInstance) {
	app.get("/api/dashboard", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"dashboard read",
		);
		if (!orgId) return;

		try {
			const dashboard = dashboardSchema.parse(await getDashboardFromDb(orgId));
			return dashboard;
		} catch (e: any) {
			console.error(
				"[Dashboard] Error fetching from DB:",
				e.message || String(e),
			);
			return reply
				.code(500)
				.send({ error: "DatabaseError", details: e.message });
		}
	});
}
