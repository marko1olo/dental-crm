/**
 * apps/api/src/routes/sanpin/summaryRoutes.ts
 * Тонкий фасад сводного дашборда санитарно-эпидемиологического режима.
 * Мандат 8b: строго <= 120 строк (фасад <= 25 строк).
 */

import type { FastifyInstance } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../accessGuard.js";
import { collectSanpinSummary } from "./summaryModules/sanpinSummaryCollector.js";

export function registerSanpinSummaryRoutes(app: FastifyInstance) {
	app.get("/api/registers/summary", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"sanpin summary read",
		);
		if (!organizationId) return;

		const todayStr = new Date().toISOString().slice(0, 10);
		return collectSanpinSummary(organizationId, todayStr);
	});
}
