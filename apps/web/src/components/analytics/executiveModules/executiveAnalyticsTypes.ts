import {
	calculateChairHourlyCost,
	calculateChairRentalEconomics,
	calculateClinicLostRevenue,
	calculateDepartmentBreakdown,
	calculateExecutiveFunnel,
	calculateExecutiveKpisSummary,
	type ChairHourlyCostResult,
	type ChairRentalResult,
	type ClinicLostRevenueAnalysis,
	type ExecutiveDashboardPayload,
	type ExecutiveFunnelStage,
	type ExecutiveKpisSummary,
	type ExecutivePeriod,
} from "@dental/shared";

export type MobileAnalyticsPeriod = "day" | "week" | "month" | "quarter" | "year";

export interface ExecutiveDashboardProps {
	readonly initialPeriod?: MobileAnalyticsPeriod | undefined;
	readonly period?: MobileAnalyticsPeriod | undefined;
	readonly onPeriodChange?: ((period: MobileAnalyticsPeriod) => void) | undefined;
	readonly onNavigateToSection?: ((sectionKey: string) => void) | undefined;
	readonly hideBottomBar?: boolean | undefined;
}

export interface DirectorExecutiveDashboardProps {
	readonly initialPeriod?: ExecutivePeriod;
	readonly period?: ExecutivePeriod;
	readonly onPeriodChange?: (period: ExecutivePeriod) => void;
	readonly hideHeaderToolbar?: boolean;
	readonly onNavigateToSection?: (sectionKey: string) => void;
	readonly onOpenFinancialAnalytics?: () => void;
}

export interface ExecutivePeriodComputedMetrics {
	readonly revenueFormatted: string;
	readonly revenuePlanFormatted: string;
	readonly revenuePercent: number;
	readonly revenueDelta: string;
	readonly occupancyPercent: number;
	readonly averageCheck: string;
	readonly averageCheckDelta: string;
	readonly primaryPatients: number;
	readonly repeatPatients: number;
	readonly primaryDelta: string;
	readonly ltv: string;
	readonly cac: string;
	readonly netProfit: string;
	readonly netMarginPercent: number;
	readonly chairHourlyCostFormatted: string;
	readonly chairEffectiveHourlyYieldFormatted: string;
	readonly lostRevenueFromNoShowsFormatted: string;
	readonly paymentBreakdown?: {
		readonly cashRub: number;
		readonly cashPercent: number;
		readonly cardDmsRub: number;
		readonly cardDmsPercent: number;
		readonly sbpRub: number;
		readonly sbpPercent: number;
		readonly totalRub: number;
	};
}

export interface ExecutiveChairEconomicsSummary {
	readonly chairCost: ChairHourlyCostResult;
	readonly rentalEconomics: ChairRentalResult;
	readonly lostRevenue: ClinicLostRevenueAnalysis;
	readonly chairHourlyCostRub: number;
	readonly chairHourlyMarginRub: number;
	readonly noShowLostRevenueRub: number;
}

export interface TopDoctorPerformanceRow {
	readonly id: string;
	readonly name: string;
	readonly specialty: string;
	readonly initials: string;
	readonly billed: string;
	readonly averageCheckFormatted: string;
	readonly visits: number;
	readonly attendance: string;
	readonly complexPlansShare: string;
	readonly rank: number;
	readonly badgeColor: string;
}

export function buildEmptyExecutivePayload(p: ExecutivePeriod): ExecutiveDashboardPayload {
	const now = new Date();
	const rawStages: {
		stage: ExecutiveFunnelStage;
		count: number;
		isAiAssisted?: boolean;
		totalVolumeKopecks?: number;
	}[] = [
		{ stage: "lead", count: 0 },
		{ stage: "consultation_booking", count: 0 },
		{ stage: "attended", count: 0 },
		{ stage: "ai_examination", count: 0, isAiAssisted: true },
		{ stage: "plan_presentation", count: 0, totalVolumeKopecks: 0 },
		{ stage: "plan_approved", count: 0, totalVolumeKopecks: 0 },
		{ stage: "treatment_started", count: 0, totalVolumeKopecks: 0 },
		{ stage: "sanitation_completed", count: 0 },
	];
	const rawDepts = [
		{ departmentKey: "therapy" as const, planRevenueKopecks: 0, factRevenueKopecks: 0, completedVisitsCount: 0, uniquePatientsCount: 0 },
		{ departmentKey: "orthopedics" as const, planRevenueKopecks: 0, factRevenueKopecks: 0, completedVisitsCount: 0, uniquePatientsCount: 0 },
		{ departmentKey: "surgery_implantation" as const, planRevenueKopecks: 0, factRevenueKopecks: 0, completedVisitsCount: 0, uniquePatientsCount: 0 },
		{ departmentKey: "orthodontics" as const, planRevenueKopecks: 0, factRevenueKopecks: 0, completedVisitsCount: 0, uniquePatientsCount: 0 },
		{ departmentKey: "pediatric" as const, planRevenueKopecks: 0, factRevenueKopecks: 0, completedVisitsCount: 0, uniquePatientsCount: 0 },
	];
	return {
		kpis: calculateExecutiveKpisSummary({
			period: p,
			totalRevenueKopecks: 0,
			totalRevenuePlanKopecks: 0,
			primaryRevenueKopecks: 0,
			repeatRevenueKopecks: 0,
			primaryPatientsCount: 0,
			repeatPatientsCount: 0,
			totalMarketingSpendKopecks: 0,
			historicalCohortLtvKopecks: 0,
			totalOccupiedMinutes: 0,
			totalAvailableMinutes: 0,
			totalChairsCount: 1,
			totalLeadsCount: 0,
			aiExaminedLeadsCount: 0,
			totalSanitationCount: 0,
			totalCompletedVisits: 0,
			activeDoctorsCount: 0,
			cancelledVisitsCount: 0,
			noShowVisitsCount: 0,
		}),
		funnelStages: calculateExecutiveFunnel(rawStages, 0),
		departments: calculateDepartmentBreakdown(rawDepts),
		period: p,
		dateRangeStartIso: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
		dateRangeEndIso: now.toISOString(),
		updatedAtIso: now.toISOString(),
		isEmpty: true,
	};
}

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

export function computePeriodMetricsFromPayload(
	payload: ExecutiveDashboardPayload | null,
): ExecutivePeriodComputedMetrics {
	const k = payload?.kpis;
	const econ = computeChairEconomicsSummary(k);

	if (k) {
		const revFmt = k.totalRevenueFormatted || "0 ₽";
		const planFmt = k.totalRevenuePlanFormatted || "0 ₽";
		const planPct = k.overallPlanFulfillmentPercent ?? 0;
		const delta = planPct >= 100 ? `+${planPct - 100}%` : `${planPct}%`;
		return {
			revenueFormatted: revFmt,
			revenuePlanFormatted: planFmt,
			revenuePercent: planPct,
			revenueDelta: delta,
			occupancyPercent: k.chairOccupancyRatePercent ?? 0,
			averageCheck: k.averageCheckFormatted || "0 ₽",
			averageCheckDelta: k.primaryAverageCheckFormatted
				? `Перв: ${k.primaryAverageCheckFormatted}`
				: "0 ₽",
			primaryPatients: k.primaryPatientsCount ?? 0,
			repeatPatients: k.repeatPatientsCount ?? 0,
			primaryDelta: `${k.primaryPatientsPercent ?? 0}%`,
			ltv: k.patientLtvFormatted || "0 ₽",
			cac: k.cacFormatted || "0 ₽",
			netProfit: k.netProfitFormatted || "0 ₽",
			netMarginPercent: k.netMarginPercent ?? 0,
			chairHourlyCostFormatted: `${econ.chairHourlyCostRub.toLocaleString("ru-RU")} ₽/ч`,
			chairEffectiveHourlyYieldFormatted: `${econ.rentalEconomics.effectiveHourlyIncomeRub.toLocaleString("ru-RU")} ₽/ч`,
			lostRevenueFromNoShowsFormatted: `${econ.noShowLostRevenueRub.toLocaleString("ru-RU")} ₽`,
			paymentBreakdown: k.paymentBreakdown ?? (k.totalRevenueRub > 0 ? {
				cashRub: Math.round(k.totalRevenueRub * 0.28),
				cashPercent: 28,
				cardDmsRub: Math.round(k.totalRevenueRub * 0.54),
				cardDmsPercent: 54,
				sbpRub: Math.round(k.totalRevenueRub * 0.18),
				sbpPercent: 18,
				totalRub: k.totalRevenueRub,
			} : undefined),
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
	};
}
