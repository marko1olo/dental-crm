/**
 * packages/shared/src/analytics/executiveModules/revenueKpiAggregator.ts
 * Aggregates all KPI facets into canonical ExecutiveKpis.
 * Mandate 8b: <= 120 lines.
 */

import { formatKopecksRu, kopecksToRubles } from "../../money.js";
import type { ExecutivePeriod } from "./executiveKpiTypes.js";
import type { CalculateExecutiveKpisParams, ExecutiveKpis } from "./executiveSummaryTypes.js";
import { calculateRevenueAndChecks } from "./kpiRevenueMath.js";
import { calculateUnitEconomicsAndChairs } from "./kpiUnitEconomicsMath.js";

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

	// Mandates 8ap, 8z, 8f: Zero synthetic percentage guesses (no fake 35% materials, 25% lab, 28% payroll).
	// If actual accounting figures are not provided, return exact 0 kopecks without fabricating clinic expenses.
	const cogsKop = params.cogsKopecks !== undefined ? Math.max(0, Math.round(params.cogsKopecks)) : 0;
	const opexKop = params.opexKopecks !== undefined ? Math.max(0, Math.round(params.opexKopecks)) : 0;
	const netProfitKop = params.netProfitKopecks !== undefined
		? Math.round(params.netProfitKopecks)
		: Math.round(rev.revKop - (cogsKop + opexKop));
	const netProfitRub = kopecksToRubles(netProfitKop);
	const netMarginPercent = params.netMarginPercent !== undefined
		? params.netMarginPercent
		: (rev.revKop > 0 ? Number(((netProfitKop / rev.revKop) * 100).toFixed(1)) : 0.0);

	const materialsKop = typeof params.materialsCostKopecks === "number" ? Math.max(0, Math.round(params.materialsCostKopecks)) : 0;
	const labKop = typeof params.labCostKopecks === "number" ? Math.max(0, Math.round(params.labCostKopecks)) : 0;
	const docPayrollKop = typeof params.doctorPayrollKopecks === "number" ? Math.max(0, Math.round(params.doctorPayrollKopecks)) : 0;
	const docNetIncomeKop = typeof params.doctorNetIncomeKopecks === "number" ? Math.max(0, Math.round(params.doctorNetIncomeKopecks)) : Math.max(0, docPayrollKop);
	const cashPayrollKop = typeof params.cashDoctorPayrollExpensesKopecks === "number" ? Math.max(0, Math.round(params.cashDoctorPayrollExpensesKopecks)) : undefined;

	return {
		period: params.period,
		periodLabelRu: PERIOD_LABELS[params.period] || "Период",
		totalRevenueKopecks: rev.revKop,
		totalRevenueRub: kopecksToRubles(rev.revKop),
		totalRevenueFormatted: formatKopecksRu(rev.revKop),
		totalRevenuePlanKopecks: rev.planKop,
		totalRevenuePlanRub: kopecksToRubles(rev.planKop),
		totalRevenuePlanFormatted: formatKopecksRu(rev.planKop),
		overallPlanFulfillmentPercent: rev.overallPlanFulfillmentPercent,
		netProfitKopecks: netProfitKop,
		netProfitRub,
		netProfitFormatted: formatKopecksRu(netProfitKop),
		netMarginPercent,
		cogsKopecks: cogsKop,
		cogsFormatted: formatKopecksRu(cogsKop),
		opexKopecks: opexKop,
		opexFormatted: formatKopecksRu(opexKop),
		doctorPayrollKopecks: docPayrollKop,
		doctorPayrollRub: kopecksToRubles(docPayrollKop),
		doctorPayrollFormatted: formatKopecksRu(docPayrollKop),
		doctorNetIncomeKopecks: docNetIncomeKop,
		doctorNetIncomeRub: kopecksToRubles(docNetIncomeKop),
		doctorNetIncomeFormatted: formatKopecksRu(docNetIncomeKop),
		materialsCostKopecks: materialsKop,
		materialsCostRub: kopecksToRubles(materialsKop),
		materialsCostFormatted: formatKopecksRu(materialsKop),
		labCostKopecks: labKop,
		labCostRub: kopecksToRubles(labKop),
		labCostFormatted: formatKopecksRu(labKop),
		totalPatientsCount: rev.totalPatients,
		primaryPatientsCount: rev.primaryPatients,
		repeatPatientsCount: rev.repeatPatients,
		primaryPatientsPercent: rev.primaryPercent,
		averageCheckKopecks: rev.averageCheckKopecks,
		averageCheckRub: kopecksToRubles(rev.averageCheckKopecks),
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
		...(cashPayrollKop !== undefined ? {
			cashDoctorPayrollExpensesKopecks: cashPayrollKop,
			cashDoctorPayrollExpensesRub: kopecksToRubles(cashPayrollKop),
			cashDoctorPayrollExpensesFormatted: formatKopecksRu(cashPayrollKop),
		} : {}),
	};
}
