/**
 * apps/api/src/routes/sanpin/summaryRoutes.ts
 * Тонкий фасад сводного дашборда санитарно-эпидемиологического режима.
 * Мандат 8b: строго <= 120 строк (фасад <= 25 строк).
 */

import { resolveValidIanaTimeZone, todayDateKeyInTimeZone } from "@dental/shared";
import type { FastifyInstance } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../accessGuard.js";
import { defineStreamRoute } from "../../core/routeFactories.js";
import { clinicTimeZone } from "../../services/reports/managerReports/timezone.js";
import { collectSanpinSummary } from "./summaryModules/sanpinSummaryCollector.js";

export function registerSanpinSummaryRoutes(app: FastifyInstance) {
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/registers/summary",
		permission: "public",
		handler: async ({ request, reply }) => {
			const organizationId = await requireResolvedStaffOrAdminOrganizationId(
				request,
				reply,
				"sanpin summary read",
			);
			if (!organizationId) return reply;

			const clinicTz = resolveValidIanaTimeZone(await clinicTimeZone(organizationId));
			const todayStr = todayDateKeyInTimeZone(clinicTz);
			return collectSanpinSummary(organizationId, todayStr);
		},
	});
}
