/**
 * Корневой фасад маршрутов аналитических отчётов руководителя (Manager Reports).
 * Декомпозирован по Mandate 8b / Sweet Spot (<= 100 строк).
 *
 * Подмодули:
 * - reports/revenueAndDebtReportsRoutes.ts (выручка, дебиторка, сводка)
 * - reports/clinicalWorkloadReportsRoutes.ts (кресла, расписание, приёмы, воронка)
 * - reports/doctorPerformancePayrollRoutes.ts (выработка врачей, продажи услуг, зарплатная ведомость)
 * - reports/reportsShared.ts (валидация периода, разбор часового пояса клиники)
 */

import type { FastifyInstance } from "fastify";
import { registerRevenueAndDebtReportsRoutes } from "./reports/revenueAndDebtReportsRoutes.js";
import { registerClinicalWorkloadReportsRoutes } from "./reports/clinicalWorkloadReportsRoutes.js";
import { registerDoctorPerformancePayrollRoutes } from "./reports/doctorPerformancePayrollRoutes.js";

export {
	CALENDAR_DATE_PATTERN,
	MAX_PERIOD_DAYS,
	badRequest,
	periodBoundarySchema,
	periodQuerySchema,
	resolvePeriod,
	resolvePeriodBoundary,
	scopeForReport,
	type PeriodQuery,
	type ReportScopeContext,
} from "./reports/reportsShared.js";

export async function registerReportRoutes(app: FastifyInstance) {
	await registerRevenueAndDebtReportsRoutes(app);
	await registerClinicalWorkloadReportsRoutes(app);
	await registerDoctorPerformancePayrollRoutes(app);
}
