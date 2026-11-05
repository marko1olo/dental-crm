/**
 * apps/api/src/routes/managerReportsRoutes.ts
 *
 * КАНОНИЧЕСКИЙ ФАСАД УПРАВЛЕНЧЕСКОЙ АНАЛИТИКИ И РАСШИРЕННЫХ ОТЧЁТОВ РУКОВОДИТЕЛЯ (SSOT)
 *
 * Fastify эндпоинты:
 * - GET /api/v1/manager/reports/financial (Выручка кассы 54-ФЗ, структура оплат, средний чек, копейки)
 * - GET /api/v1/manager/reports/chair-occupancy (Загрузка стоматологических кресел, норма 65–85%)
 * - GET /api/v1/manager/reports/kpi (Сводные KPI, воронка пациентов, рейтинг врачей, Recall)
 *
 * (Мандат 8ap: Реляционная правда из PostgreSQL 18, zero regex parsing).
 * (Мандат 8n: Малая клиника 1–3 кресла, честные копейки amountKopecks: bigint/number).
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { requireExecutiveAccess } from "./analytics/executiveAccessGuard.js";
import { queryExecutiveDepartmentsAndDoctors } from "./analytics/executiveDoctorsQuery.js";
import {
	queryExecutiveKpiAndFunnel,
	resolveExecutiveDateRange,
} from "./analytics/executiveKpiQuery.js";
import {
	chairLoad,
	clinicTimeZone,
	financialExecutiveSummary,
	type ReportScope,
} from "../services/reports/managerReports.js";

interface ManagerReportQuery {
	readonly period?: string;
	readonly from?: string;
	readonly to?: string;
	readonly minutesPerDay?: number;
	readonly workingDaysPerWeek?: number;
}

export async function registerManagerReportsRoutes(app: FastifyInstance): Promise<void> {
	/**
	 * 1. Финансовый отчет руководителя (касса 54-ФЗ, структура оплат, средний чек в целочисленных копейках)
	 */
	const getFinancialReport = async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireExecutiveAccess(request, reply);
		if (!orgId) return;

		try {
			const query = request.query as ManagerReportQuery;
			const range = resolveExecutiveDateRange(query.period, query.from, query.to);
			const timeZone = await clinicTimeZone(orgId);

			const scope: ReportScope = {
				organizationId: orgId,
				from: range.startDate,
				to: range.endDate,
				timeZone,
			};

			const summary = await financialExecutiveSummary(scope);

			return {
				success: true,
				data: {
					...summary,
					amountKopecks: summary.totalRevenueKopecks,
					periodKey: range.execPeriod,
				},
			};
		} catch (err) {
			request.log.error({ err }, "Ошибка формирования финансового отчета руководителя");
			return reply.code(500).send({
				success: false,
				error: "FinancialReportError",
				message: "Не удалось сформировать финансовый отчет руководителя.",
			});
		}
	};

	/**
	 * 2. Загрузка стоматологических кресел (норма 65–85%, занятые часы против доступных часов)
	 */
	const getChairOccupancyReport = async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireExecutiveAccess(request, reply);
		if (!orgId) return;

		try {
			const query = request.query as ManagerReportQuery;
			const range = resolveExecutiveDateRange(query.period, query.from, query.to);
			const timeZone = await clinicTimeZone(orgId);

			const scope: ReportScope = {
				organizationId: orgId,
				from: range.startDate,
				to: range.endDate,
				timeZone,
			};

			const options: { minutesPerDay?: number; workingDaysPerWeek?: number } = {};
			if (typeof query.minutesPerDay === "number") options.minutesPerDay = query.minutesPerDay;
			if (typeof query.workingDaysPerWeek === "number") options.workingDaysPerWeek = query.workingDaysPerWeek;

			const report = await chairLoad(scope, options);

			// Расчет агрегированной загрузки по клинике в целом
			const bookedMinutes = report.rows.reduce((sum, r) => sum + r.bookedMinutes, 0);
			const chairsWithId = report.rows.filter((r) => r.chairId !== null);
			const totalChairsCount = Math.max(1, chairsWithId.length || 1);
			const totalAvailableMinutes = totalChairsCount * report.basis.totalMinutesPerChair;
			const overallOccupancyPercent = totalAvailableMinutes > 0
				? Math.min(100, Math.round((bookedMinutes / totalAvailableMinutes) * 100))
				: 0;

			const overallStatus: "low" | "optimal" | "high" =
				overallOccupancyPercent < 65
					? "low"
					: overallOccupancyPercent <= 85
						? "optimal"
						: "high";

			return {
				success: true,
				data: {
					period: {
						from: range.startDate.toISOString(),
						to: range.endDate.toISOString(),
					},
					periodKey: range.execPeriod,
					chairOccupancyPercent: overallOccupancyPercent,
					chairOccupancyStatus: overallStatus,
					occupiedMinutes: bookedMinutes,
					availableMinutes: totalAvailableMinutes,
					totalChairsCount,
					chairs: report.rows,
					basis: report.basis,
					isEmpty: report.isEmpty,
				},
			};
		} catch (err) {
			request.log.error({ err }, "Ошибка формирования отчета по загрузке кресел");
			return reply.code(500).send({
				success: false,
				error: "ChairOccupancyReportError",
				message: "Не удалось сформировать отчет загрузки стоматологических кресел.",
			});
		}
	};

	/**
	 * 3. Ключевые показатели эффективности (KPI, воронка, врачи, первичные/повторные, LTV)
	 */
	const getKpiReport = async (request: FastifyRequest, reply: FastifyReply) => {
		const orgId = await requireExecutiveAccess(request, reply);
		if (!orgId) return;

		try {
			const query = request.query as ManagerReportQuery;
			const range = resolveExecutiveDateRange(query.period, query.from, query.to);

			const { departments, activeDoctorsCount, topDoctors, topProcedures } =
				await queryExecutiveDepartmentsAndDoctors(orgId, range.startDate);

			const {
				kpis,
				funnelStages,
				totalRevenueKopecks,
				totalAppointments,
				plansPresentedCount,
			} = await queryExecutiveKpiAndFunnel(orgId, range, activeDoctorsCount);

			const isEmpty =
				totalRevenueKopecks === 0 &&
				totalAppointments === 0 &&
				plansPresentedCount === 0;

			return {
				success: true,
				data: {
					kpis,
					funnelStages,
					departments,
					topDoctors,
					topProcedures,
					period: range.execPeriod,
					dateRangeStartIso: range.startDate.toISOString(),
					dateRangeEndIso: range.endDate.toISOString(),
					updatedAtIso: range.endDate.toISOString(),
					isEmpty,
				},
			};
		} catch (err) {
			request.log.error({ err }, "Ошибка формирования сводного KPI отчета");
			return reply.code(500).send({
				success: false,
				error: "KpiReportError",
				message: "Не удалось сформировать сводный KPI отчет руководителя.",
			});
		}
	};

	// Канонические маршруты v1
	app.get("/api/v1/manager/reports/financial", getFinancialReport);
	app.get("/api/v1/manager/reports/chair-occupancy", getChairOccupancyReport);
	app.get("/api/v1/manager/reports/kpi", getKpiReport);

	// Обратная совместимость без v1
	app.get("/api/manager/reports/financial", getFinancialReport);
	app.get("/api/manager/reports/chair-occupancy", getChairOccupancyReport);
	app.get("/api/manager/reports/kpi", getKpiReport);
}
