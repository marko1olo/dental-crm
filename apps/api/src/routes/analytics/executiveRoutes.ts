import type { ExecutiveDashboardPayload } from "@dental/shared";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { requireExecutiveAccess } from "./executiveAccessGuard.js";
import { queryExecutiveDepartmentsAndDoctors } from "./executiveDoctorsQuery.js";
import {
	queryExecutiveKpiAndFunnel,
	resolveExecutiveDateRange,
} from "./executiveKpiQuery.js";

/**
 * ФИЧА #29 — РАБОЧИЙ СТОЛ ГЕНЕРАЛЬНОГО ДИРЕКТОРА КЛИНИКИ
 */
export async function registerExecutiveRoutes(app: FastifyInstance) {
	const getExecutiveSummary = async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireExecutiveAccess(request, reply);
		if (!orgId) return;

		try {
			const { period = "month", from, to } = request.query as {
				period?: string;
				from?: string;
				to?: string;
			};
			const range = resolveExecutiveDateRange(period, from, to);

			const { departments, activeDoctorsCount, topDoctors, topProcedures } =
				await queryExecutiveDepartmentsAndDoctors(orgId, range.startDate);

			const {
				kpis,
				funnelStages,
				totalRevenueKopecks,
				totalAppointments,
				plansPresentedCount,
			} = await queryExecutiveKpiAndFunnel(orgId, range, activeDoctorsCount);

			const payload: ExecutiveDashboardPayload = {
				kpis,
				funnelStages,
				departments,
				topDoctors,
				topProcedures,
				period: range.execPeriod,
				dateRangeStartIso: range.startDate.toISOString(),
				dateRangeEndIso: range.endDate.toISOString(),
				updatedAtIso: range.endDate.toISOString(),
				isEmpty:
					totalRevenueKopecks === 0 &&
					totalAppointments === 0 &&
					plansPresentedCount === 0,
			};

			return { success: true, data: payload };
		} catch (e) {
			request.log.error({ err: e }, "Не удалось сформировать дашборд руководителя");
			return reply.code(503).send({
				success: false,
				error: "ExecutiveDashboardUnavailable",
				message: "Не удалось сформировать дашборд руководителя клиники. Повторите запрос позже.",
			});
		}
	};

	app.get("/api/analytics/executive", getExecutiveSummary);
	app.get("/api/analytics/executive/summary", getExecutiveSummary);
}
