/**
 * packages/shared/src/analytics/executiveModules/revenueKpiAggregator.ts
 * Aggregates all KPI facets into canonical ExecutiveKpis.
 * Mandate 8b: <= 120 lines.
 */

import { formatKopecksRu } from "../../utils/money.js";
import type { ExecutivePeriod } from "./executiveKpiTypes.js";
import type { CalculateExecutiveKpisParams, ExecutiveKpis } from "./executiveSummaryTypes.js";
import { calculateRevenueAndChecks } from "./kpiRevenueMath.js";
import { calculateUnitEconomicsAndChairs } from "./kpiUnitEconomicsMath.js";
import { calculatePnlAndDoctorIncome } from "./kpiPnlMath.js";

const PERIOD_LABELS: Record<ExecutivePeriod, string> = {
	day: "Сегодня",
	yesterday: "Вчера",
	week: "Текущая неделя",
	month: "Текущий месяц",
	quarter: "Текущий квартал",
	year: "Текущий год",
	custom: "Свой диапазон",
};

/**
 * Расчет сводных KPI генерального директора клиники.
 */
export function calculateExecutiveKpisSummary(
	params: CalculateExecutiveKpisParams,
): ExecutiveKpis {
	const rev = calculateRevenueAndChecks(params);
	const unit = calculateUnitEconomicsAndChairs(params, rev.revKop, rev.primaryPatients, rev.visits);
	const pnl = calculatePnlAndDoctorIncome(params, rev.revKop);

	return {
		period: params.period,
		periodLabelRu: PERIOD_LABELS[params.period] || "Период",
		totalRevenueKopecks: rev.revKop,
		totalRevenueRub: Math.round(rev.revKop / 100),
		totalRevenueFormatted: formatKopecksRu(rev.revKop),
		totalRevenuePlanKopecks: rev.planKop,
		totalRevenuePlanRub: Math.round(rev.planKop / 100),
		totalRevenuePlanFormatted: formatKopecksRu(rev.planKop),
		overallPlanFulfillmentPercent: rev.overallPlanFulfillmentPercent,
		netProfitKopecks: pnl.netProfitKop,
		netProfitRub: pnl.netProfitRub,
		netProfitFormatted: formatKopecksRu(pnl.netProfitKop),
		netMarginPercent: pnl.netMarginPercent,
		cogsKopecks: pnl.cogsKop,
		cogsFormatted: formatKopecksRu(pnl.cogsKop),
		opexKopecks: pnl.opexKop,
		opexFormatted: formatKopecksRu(pnl.opexKop),
		doctorPayrollKopecks: pnl.docPayrollKop,
		doctorPayrollRub: Math.round(pnl.docPayrollKop / 100),
		doctorPayrollFormatted: formatKopecksRu(pnl.docPayrollKop),
		doctorNetIncomeKopecks: pnl.docNetIncomeKop,
		doctorNetIncomeRub: Math.round(pnl.docNetIncomeKop / 100),
		doctorNetIncomeFormatted: formatKopecksRu(pnl.docNetIncomeKop),
		materialsCostKopecks: pnl.materialsKop,
		materialsCostRub: Math.round(pnl.materialsKop / 100),
		materialsCostFormatted: formatKopecksRu(pnl.materialsKop),
		labCostKopecks: pnl.labKop,
		labCostRub: Math.round(pnl.labKop / 100),
		labCostFormatted: formatKopecksRu(pnl.labKop),
		totalPatientsCount: rev.totalPatients,
		primaryPatientsCount: rev.primaryPatients,
		repeatPatientsCount: rev.repeatPatients,
		primaryPatientsPercent: rev.primaryPercent,
		averageCheckKopecks: rev.averageCheckKopecks,
		averageCheckRub: Math.round(rev.averageCheckKopecks / 100),
		averageCheckFormatted: formatKopecksRu(rev.averageCheckKopecks),
		primaryAverageCheckKopecks: rev.primaryAvgCheckKopecks,
		primaryAverageCheckFormatted: formatKopecksRu(rev.primaryAvgCheckKopecks),
		repeatAverageCheckKopecks: rev.repeatAvgCheckKopecks,
		repeatAverageCheckFormatted: formatKopecksRu(rev.repeatAvgCheckKopecks),
		patientLtvKopecks: unit.ltvKopecks,
		patientLtvFormatted: formatKopecksRu(unit.ltvKopecks),
		cacKopecks: unit.cacKopecks,
		cacFormatted: unit.cacKopecks > 0 ? formatKopecksRu(unit.cacKopecks) : "0 ₽ (Органика)",
		ltvToCacRatio: unit.ltvToCacRatio,
		totalMarketingSpendKopecks: unit.mktSpend,
		totalMarketingSpendFormatted: formatKopecksRu(unit.mktSpend),
		chairOccupancyRatePercent: unit.chairOccupancyRatePercent,
		totalOccupiedMinutes: unit.occupiedMin,
		totalAvailableMinutes: unit.availableMin,
		totalChairsCount: Math.max(1, params.totalChairsCount),
		leadToSanitationConversionPercent: unit.leadToSanitationConversionPercent,
		aiDiagnosticRatePercent: unit.aiDiagnosticRatePercent,
		cancelledVisitsCount: unit.cancelledVisits,
		noShowVisitsCount: unit.noShowVisits,
		cancellationRatePercent: unit.cancellationRatePercent,
		totalCompletedVisits: rev.visits,
		activeDoctorsCount: Math.max(0, params.activeDoctorsCount),
		totalLeadsCount: unit.leads,
		totalSanitationCount: unit.sanCount,
		...(params.paymentBreakdown !== undefined ? { paymentBreakdown: params.paymentBreakdown } : {}),
	};
}
