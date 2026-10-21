import type { ExecutiveDashboardPayload } from "@dental/shared";
import { formatRubles } from "../../../utils/formatters.js";
import { computeChairEconomicsSummary } from "./computeChairEconomicsSummary";
import type { ExecutivePeriodComputedMetrics } from "./executiveAnalyticsInterfaces";

export function computePeriodMetricsFromPayload(
	payload: ExecutiveDashboardPayload | null,
): ExecutivePeriodComputedMetrics {
	const k = payload?.kpis;
	const econ = computeChairEconomicsSummary(k);

	if (k) {
		const revRub = k.totalRevenueRub > 0 ? k.totalRevenueRub : Math.round((k.totalRevenueKopecks ?? 0) / 100);
		const planRub = Math.round((k.totalRevenuePlanKopecks ?? 0) / 100);
		const planPct = k.overallPlanFulfillmentPercent ?? 0;
		const delta = planPct >= 100 ? `+${planPct - 100}%` : `${planPct}%`;
		const avgCheckRub = Math.round((k.averageCheckKopecks ?? 0) / 100);
		const primaryAvgCheckRub = Math.round((k.primaryAverageCheckKopecks ?? 0) / 100);
		const netProfitRub = Math.round((k.netProfitKopecks ?? 0) / 100);
		const ltvRub = Math.round((k.patientLtvKopecks ?? 0) / 100);
		const cacRub = Math.round((k.cacKopecks ?? 0) / 100);

		const cashRub = k.paymentBreakdown ? k.paymentBreakdown.cashRub : 0;
		const cardDmsRub = k.paymentBreakdown ? k.paymentBreakdown.cardDmsRub : 0;
		const sbpRub = k.paymentBreakdown ? k.paymentBreakdown.sbpRub : 0;

		const docPayrollRub = k.doctorPayrollRub && k.doctorPayrollRub > 0
			? k.doctorPayrollRub
			: Math.round(revRub * 0.28);
		const docNetIncomeRub = k.doctorNetIncomeRub && k.doctorNetIncomeRub > 0
			? k.doctorNetIncomeRub
			: docPayrollRub;
		const materialsCostRub = k.materialsCostRub && k.materialsCostRub > 0
			? k.materialsCostRub
			: Math.round(revRub * 0.08);
		const labCostRub = k.labCostRub && k.labCostRub > 0
			? k.labCostRub
			: Math.round(revRub * 0.06);
		const directCogsRub = materialsCostRub + labCostRub + docPayrollRub;

		return {
			revenueFormatted: formatRubles(revRub),
			revenuePlanFormatted: formatRubles(planRub),
			revenuePercent: planPct,
			revenueDelta: delta,
			occupancyPercent: k.chairOccupancyRatePercent ?? 0,
			averageCheck: formatRubles(avgCheckRub),
			averageCheckDelta: primaryAvgCheckRub > 0 ? `Перв: ${formatRubles(primaryAvgCheckRub)}` : "0 ₽",
			primaryPatients: k.primaryPatientsCount ?? 0,
			repeatPatients: k.repeatPatientsCount ?? 0,
			primaryDelta: `${k.primaryPatientsPercent ?? 0}%`,
			ltv: ltvRub > 0 ? formatRubles(ltvRub) : "0 ₽",
			cac: cacRub > 0 ? formatRubles(cacRub) : "0 ₽",
			netProfit: formatRubles(netProfitRub),
			netMarginPercent: k.netMarginPercent ?? 0,
			chairHourlyCostFormatted: `${formatRubles(econ.chairHourlyCostRub)}/ч`,
			chairEffectiveHourlyYieldFormatted: `${formatRubles(econ.rentalEconomics.effectiveHourlyIncomeRub)}/ч`,
			lostRevenueFromNoShowsFormatted: formatRubles(econ.noShowLostRevenueRub),
			doctorPayrollFormatted: formatRubles(docPayrollRub),
			doctorNetIncomeFormatted: formatRubles(docNetIncomeRub),
			materialsCostFormatted: formatRubles(materialsCostRub),
			labCostFormatted: formatRubles(labCostRub),
			directCogsFormatted: formatRubles(directCogsRub),
			paymentBreakdown: k.paymentBreakdown ? {
				cashRub: k.paymentBreakdown.cashRub,
				cashPercent: k.paymentBreakdown.cashPercent,
				cashFormatted: formatRubles(k.paymentBreakdown.cashRub),
				cardDmsRub: k.paymentBreakdown.cardDmsRub,
				cardDmsPercent: k.paymentBreakdown.cardDmsPercent,
				cardDmsFormatted: formatRubles(k.paymentBreakdown.cardDmsRub),
				sbpRub: k.paymentBreakdown.sbpRub,
				sbpPercent: k.paymentBreakdown.sbpPercent,
				sbpFormatted: formatRubles(k.paymentBreakdown.sbpRub),
				depositRub: k.paymentBreakdown.depositRub ?? 0,
				depositPercent: k.paymentBreakdown.depositPercent ?? 0,
				depositFormatted: formatRubles(k.paymentBreakdown.depositRub ?? 0),
				totalRub: k.paymentBreakdown.totalRub,
			} : undefined,
		};
	}

	return {
		revenueFormatted: "0 ₽",
		revenuePlanFormatted: "0 ₽",
		revenuePercent: 0,
		revenueDelta: "0%",
		occupancyPercent: 0,
		averageCheck: "0 ₽",
		averageCheckDelta: "0 ₽",
		primaryPatients: 0,
		repeatPatients: 0,
		primaryDelta: "0%",
		ltv: "0 ₽",
		cac: "0 ₽",
		netProfit: "0 ₽",
		netMarginPercent: 0,
		chairHourlyCostFormatted: "0 ₽/ч",
		chairEffectiveHourlyYieldFormatted: "0 ₽/ч",
		lostRevenueFromNoShowsFormatted: "0 ₽",
		doctorPayrollFormatted: "0 ₽",
		doctorNetIncomeFormatted: "0 ₽",
		materialsCostFormatted: "0 ₽",
		labCostFormatted: "0 ₽",
		directCogsFormatted: "0 ₽",
	};
}
