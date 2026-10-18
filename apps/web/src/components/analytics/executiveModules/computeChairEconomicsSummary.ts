import {
	calculateChairHourlyCost,
	calculateChairRentalEconomics,
	calculateClinicLostRevenue,
	type ExecutiveKpisSummary,
} from "@dental/shared";
import type { ExecutiveChairEconomicsSummary } from "./executiveAnalyticsInterfaces";

/**
 * Вычисляет себестоимость кресло-часа, рентабельность утилизации кабинета и потери от No-Show
 * через канонические SSOT-калькуляторы @dental/shared.
 */
export function computeChairEconomicsSummary(
	kpis?: ExecutiveKpisSummary | null,
): ExecutiveChairEconomicsSummary {
	const activeChairsCount = Math.max(1, kpis?.totalChairsCount ?? 1);
	const chairUtilizationRate = Math.max(0.1, Math.min(1, (kpis?.chairOccupancyRatePercent ?? 75) / 100));
	const opexRub = Math.max(0, Math.round((kpis?.opexKopecks ?? 0) / 100));
	const cogsRub = Math.max(0, Math.round((kpis?.cogsKopecks ?? 0) / 100));

	const chairCost = calculateChairHourlyCost({
		activeChairsCount,
		workingDaysPerMonth: 26,
		workingHoursPerDay: 12,
		chairUtilizationRate,
		monthlyRentRub: Math.round(opexRub * 0.45),
		monthlyUtilitiesRub: Math.round(opexRub * 0.12),
		monthlyAdministrativePayrollRub: Math.round(opexRub * 0.25),
		monthlyEquipmentDepreciationRub: Math.round(opexRub * 0.08),
		monthlySanpinSterilizationRub: Math.round(cogsRub * 0.15),
		monthlyMarketingAndOtherRub: Math.round(opexRub * 0.1),
	});

	const occupiedHours = Math.max(1, Math.round((kpis?.totalOccupiedMinutes ?? 60) / 60));
	const grossRevenueKopecks = Math.max(0, kpis?.totalRevenueKopecks ?? 0);
	const consumablesKopecks = Math.max(0, Math.round((kpis?.cogsKopecks ?? 0) * 0.25));

	const rentalEconomics = calculateChairRentalEconomics({
		model: "revenue_percent",
		grossRevenueKopecks,
		hoursWorked: occupiedHours,
		hourlyRateKopecks: Math.max(150_000, Math.round(chairCost.hourlyCostRealOccupiedRub * 100)),
		landlordPercent: 65,
		consumablesKopecks,
	});

	const avgEstimateRub = Math.max(5000, Math.round((kpis?.averageCheckKopecks ?? 1200000) / 100));
	const cancelledVisitsCount = Math.max(0, kpis?.cancelledVisitsCount ?? 2);
	const cancelledPerDay = Math.max(0.2, Number((cancelledVisitsCount / 26).toFixed(1)));

	const lostRevenue = calculateClinicLostRevenue({
		monthlyNewConsultations: Math.max(10, kpis?.totalLeadsCount ?? 50),
		abandonedEstimateRate: 0.65,
		averageEstimateSum: avgEstimateRub,
		cancelledVisitsPerDay: cancelledPerDay,
		averageSlotValue: avgEstimateRub > 0 ? avgEstimateRub : 5000,
		workingDaysPerMonth: 26,
		totalActivePatientBase: Math.max(100, (kpis?.primaryPatientsCount ?? 10) + (kpis?.repeatPatientsCount ?? 50)),
		annualRecallRateWithoutBot: 0.18,
		averageRecallTicket: 6500,
		secondaryTreatmentFromRecallRate: 0.35,
		averageSecondaryTreatmentValue: 28000,
		automationMonthlyCostRub: 19900,
	});

	const chairHourlyCostRub = Math.round(chairCost.hourlyCostRealOccupiedRub);
	const chairHourlyMarginRub = Math.round(
		rentalEconomics.effectiveHourlyIncomeRub - chairHourlyCostRub,
	);
	const noShowLostRevenueRub = Math.round(lostRevenue.monthlyLosses.emptySlotsRub);

	return {
		chairCost,
		rentalEconomics,
		lostRevenue,
		chairHourlyCostRub,
		chairHourlyMarginRub,
		noShowLostRevenueRub,
	};
}
