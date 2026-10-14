/**
 * demoFinanceAndWarehouseBuilder.ts
 *
 * Layer 2: Demo Showcase Financial and Warehouse Analytics Builder
 *
 * Формирует сквозную управленческую аналитику руководителя (воронка, выручка, отделения)
 * и операционную аналитику клиники (KPI, касса/безнал 54-ФЗ, загрузка кресел, маржинальность врачей).
 */

import type {
	ExecutiveDashboardPayload,
	ExecutivePeriod,
	ExecutiveFunnelStage,
} from "@dental/shared";
import {
	calculateDepartmentBreakdown,
	calculateExecutiveFunnel,
	calculateExecutiveKpisSummary,
} from "@dental/shared";
import type { AnalyticsDashboardData } from "../../pages/analyticsDoctorMetrics.js";
import {
	DEMO_CHAIR_1_ID,
	DEMO_CHAIR_2_ID,
	DEMO_CHAIR_3_ID,
	DEMO_DOCTOR_1_ID,
	DEMO_DOCTOR_ORTHOPEDIST_ID,
	DEMO_DOCTOR_2_ID,
	DEMO_DOCTOR_SURGEON_ID,
	DEMO_OWNER_ID,
} from "../demo/demoConstants.js";

/**
 * Образцовая витринная сквозная аналитика руководителя (генерального директора).
 */
export function getDemoExecutiveAnalytics(
	period: ExecutivePeriod = "month",
): ExecutiveDashboardPayload {
	const scale =
		period === "day"
			? 1 / 26
			: period === "week"
				? 7 / 26
				: period === "quarter"
					? 3
					: period === "year"
						? 12
						: 1;

	const rawStages = [
		{ stage: "lead" as ExecutiveFunnelStage, count: Math.max(1, Math.round(120 * scale)) },
		{ stage: "consultation_booking" as ExecutiveFunnelStage, count: Math.max(1, Math.round(98 * scale)) },
		{ stage: "attended" as ExecutiveFunnelStage, count: Math.max(1, Math.round(88 * scale)) },
		{ stage: "ai_examination" as ExecutiveFunnelStage, count: Math.max(1, Math.round(82 * scale)), isAiAssisted: true },
		{ stage: "plan_presentation" as ExecutiveFunnelStage, count: Math.max(1, Math.round(78 * scale)), totalVolumeKopecks: Math.round(1240000000 * scale) },
		{ stage: "plan_approved" as ExecutiveFunnelStage, count: Math.max(1, Math.round(56 * scale)), totalVolumeKopecks: Math.round(820000000 * scale) },
		{ stage: "treatment_started" as ExecutiveFunnelStage, count: Math.max(1, Math.round(48 * scale)), totalVolumeKopecks: Math.round(680000000 * scale) },
		{ stage: "sanitation_completed" as ExecutiveFunnelStage, count: Math.max(1, Math.round(38 * scale)) },
	];

	const totalMarketingSpendKopecks = Math.round(32000000 * scale);
	const funnelStages = calculateExecutiveFunnel(rawStages, totalMarketingSpendKopecks);

	const rawDepts = [
		{
			departmentKey: "therapy" as const,
			planRevenueKopecks: Math.round(150000000 * scale),
			factRevenueKopecks: Math.round(158000000 * scale),
			completedVisitsCount: Math.max(1, Math.round(142 * scale)),
			uniquePatientsCount: Math.max(1, Math.round(110 * scale)),
		},
		{
			departmentKey: "orthopedics" as const,
			planRevenueKopecks: Math.round(160000000 * scale),
			factRevenueKopecks: Math.round(152000000 * scale),
			completedVisitsCount: Math.max(1, Math.round(48 * scale)),
			uniquePatientsCount: Math.max(1, Math.round(36 * scale)),
		},
		{
			departmentKey: "surgery_implantation" as const,
			planRevenueKopecks: Math.round(110000000 * scale),
			factRevenueKopecks: Math.round(105000000 * scale),
			completedVisitsCount: Math.max(1, Math.round(38 * scale)),
			uniquePatientsCount: Math.max(1, Math.round(30 * scale)),
		},
		{
			departmentKey: "orthodontics" as const,
			planRevenueKopecks: Math.round(55000000 * scale),
			factRevenueKopecks: Math.round(51000000 * scale),
			completedVisitsCount: Math.max(1, Math.round(28 * scale)),
			uniquePatientsCount: Math.max(1, Math.round(24 * scale)),
		},
		{
			departmentKey: "pediatric" as const,
			planRevenueKopecks: Math.round(25000000 * scale),
			factRevenueKopecks: Math.round(19000000 * scale),
			completedVisitsCount: Math.max(1, Math.round(22 * scale)),
			uniquePatientsCount: Math.max(1, Math.round(18 * scale)),
		},
	];

	const departments = calculateDepartmentBreakdown(rawDepts);

	const totalRevenueKopecks = Math.round(485000000 * scale);
	const totalRevenuePlanKopecks = Math.round(500000000 * scale);
	const primaryRevenueKopecks = Math.round(145500000 * scale);
	const repeatRevenueKopecks = Math.round(339500000 * scale);

	const kpis = calculateExecutiveKpisSummary({
		period,
		totalRevenueKopecks,
		totalRevenuePlanKopecks,
		primaryRevenueKopecks,
		repeatRevenueKopecks,
		primaryPatientsCount: Math.max(1, Math.round(48 * scale)),
		repeatPatientsCount: Math.max(1, Math.round(170 * scale)),
		totalMarketingSpendKopecks,
		historicalCohortLtvKopecks: 14500000,
		totalOccupiedMinutes: Math.round(27720 * scale),
		totalAvailableMinutes: Math.round(36000 * scale),
		totalChairsCount: 3,
		totalLeadsCount: Math.max(1, Math.round(120 * scale)),
		aiExaminedLeadsCount: Math.max(1, Math.round(82 * scale)),
		totalSanitationCount: Math.max(1, Math.round(38 * scale)),
		totalCompletedVisits: Math.max(1, Math.round(278 * scale)),
		activeDoctorsCount: 5,
		cancelledVisitsCount: Math.max(0, Math.round(12 * scale)),
		noShowVisitsCount: Math.max(0, Math.round(4 * scale)),
		cogsKopecks: Math.round(121250000 * scale),
		opexKopecks: Math.round(218250000 * scale),
	});

	const now = new Date();
	const startDate =
		period === "day"
			? new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
			: period === "week"
				? new Date(now.getFullYear(), now.getMonth(), now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1), 0, 0, 0, 0)
				: period === "quarter"
					? new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
					: period === "year"
						? new Date(now.getFullYear(), 0, 1)
						: new Date(now.getFullYear(), now.getMonth(), 1);

	return {
		kpis,
		funnelStages,
		departments,
		period,
		dateRangeStartIso: startDate.toISOString(),
		dateRangeEndIso: now.toISOString(),
		updatedAtIso: now.toISOString(),
		isEmpty: false,
	};
}

/**
 * Образцовая витринная операционная аналитика клиники.
 */
export function getDemoDashboardAnalytics(
	_dateRange?: string,
): AnalyticsDashboardData {
	return {
		kpis: {
			totalPatients: 218,
			totalRevenue: 2450000,
			totalAppointments: 395,
			avgRevenuePerPatient: 11238,
			cashRevenue: 650000,
			cardRevenue: 1450000,
			cashlessRevenue: 250000,
			advanceRevenue: 100000,
			sbpRevenue: 0,
			bankTransferRevenue: 0,
			insuranceRevenue: 0,
			bonusRevenue: 0,
			averageCheck: 6200,
			primaryPatientsCount: 98,
			repeatPatientsCount: 297,
			chairOccupancyRatePercent: 78,
		},
		cohortLtvJson: [
			{ cohort: "2025-Q1", "Month 12": 138000 },
			{ cohort: "2025-Q2", "Month 12": 142000 },
			{ cohort: "2025-Q3", "Month 12": 149000 },
			{ cohort: "2025-Q4", "Month 12": 154000 },
		],
		planFunnelJson: [
			{ name: "Консультация", value: 98, fill: "var(--teal, #0d9488)" },
			{ name: "ИИ-диагностика КЛКТ", value: 82, fill: "var(--brand-300, #0d9488)" },
			{ name: "Презентация плана", value: 78, fill: "var(--accent, #6366f1)" },
			{ name: "Согласовано", value: 56, fill: "var(--ok-fg, #10b981)" },
			{ name: "Начато лечение", value: 48, fill: "var(--brand-accent, #0ea5e9)" },
			{ name: "Санирован", value: 38, fill: "var(--gold, #f59e0b)" },
		],
		chairUtilizationJson: [
			{
				chairId: DEMO_CHAIR_1_ID,
				name: "Кресло 1 (Терапия/Хирургия)",
				value: 82,
				occupiedMinutes: 9840,
				availableMinutes: 12000,
				utilizationPercent: 82,
				fill: "var(--teal, #0d9488)",
			},
			{
				chairId: DEMO_CHAIR_2_ID,
				name: "Кресло 2 (Ортопедия/Ортодонтия)",
				value: 76,
				occupiedMinutes: 9120,
				availableMinutes: 12000,
				utilizationPercent: 76,
				fill: "var(--accent, #6366f1)",
			},
			{
				chairId: DEMO_CHAIR_3_ID,
				name: "Кресло 3 (Детство/Гигиена)",
				value: 74,
				occupiedMinutes: 8880,
				availableMinutes: 12000,
				utilizationPercent: 74,
				fill: "var(--ok-fg, #10b981)",
			},
		],
		doctorProfitabilityJson: [
			{
				doctorId: DEMO_DOCTOR_1_ID,
				name: "Д-р Соколов А. В. (Терапевт)",
				revenue: 860000,
				appointmentsCount: 138,
				avgTicketRub: 6232,
				workedHours: 154,
				hourlyRevenueRub: 5584,
				margin: 645000,
				completionRate: 96,
				services804nCount: 184,
				labOrdersCount: 0,
				labOrdersCostRub: 0,
				doctorPayrollRub: 215000,
				clinicMarginRub: 645000,
			},
			{
				doctorId: DEMO_DOCTOR_ORTHOPEDIST_ID,
				name: "Д-р Орлов А. В. (Ортопед)",
				revenue: 750000,
				appointmentsCount: 42,
				avgTicketRub: 17857,
				workedHours: 120,
				hourlyRevenueRub: 6250,
				margin: 380000,
				completionRate: 94,
				services804nCount: 56,
				labOrdersCount: 22,
				labOrdersCostRub: 220000,
				doctorPayrollRub: 150000,
				clinicMarginRub: 380000,
			},
			{
				doctorId: DEMO_DOCTOR_SURGEON_ID,
				name: "Д-р Громов К. Д. (Хирург-имплантолог)",
				revenue: 420000,
				appointmentsCount: 28,
				avgTicketRub: 15000,
				workedHours: 64,
				hourlyRevenueRub: 6562,
				margin: 327600,
				completionRate: 92,
				services804nCount: 38,
				labOrdersCount: 8,
				labOrdersCostRub: 45000,
				doctorPayrollRub: 92400,
				clinicMarginRub: 282600,
			},
			{
				doctorId: DEMO_DOCTOR_2_ID,
				name: "Д-р Морозова Е. И. (Ортодонт)",
				revenue: 300000,
				appointmentsCount: 64,
				avgTicketRub: 4688,
				workedHours: 96,
				hourlyRevenueRub: 3125,
				margin: 234000,
				completionRate: 95,
				services804nCount: 72,
				labOrdersCount: 6,
				labOrdersCostRub: 35000,
				doctorPayrollRub: 66000,
				clinicMarginRub: 199000,
			},
			{
				doctorId: DEMO_OWNER_ID,
				name: "Д-р Воронов М. С. (Главврач / Владелец)",
				revenue: 120000,
				appointmentsCount: 20,
				avgTicketRub: 6000,
				workedHours: 48,
				hourlyRevenueRub: 2500,
				margin: 0,
				completionRate: 90,
				services804nCount: 25,
				labOrdersCount: 0,
				labOrdersCostRub: 0,
				doctorPayrollRub: 120000,
				clinicMarginRub: 0,
			},
		],
		tierAcceptance: {
			totalConsultations: 98,
			consultationToPlanConversionPercent: 79.6,
			totalPlansCount: 78,
			acceptedPlansCount: 56,
			overallAcceptancePercent: 71.8,
			tiers: [
				{
					tier: "optimum",
					label: "Оптимальный (Комплексный)",
					totalPlans: 42,
					acceptedPlans: 34,
					acceptanceRatePercent: 81,
					totalRub: 4420000,
				},
				{
					tier: "premium",
					label: "Премиум (All-on-4 / Керамика)",
					totalPlans: 18,
					acceptedPlans: 11,
					acceptanceRatePercent: 61.1,
					totalRub: 2970000,
				},
				{
					tier: "basic",
					label: "Базовый (Купирование)",
					totalPlans: 18,
					acceptedPlans: 11,
					acceptanceRatePercent: 61.1,
					totalRub: 810000,
				},
			],
		},
		noShowHeatmap: {
			totalCancelled: 12,
			totalNoShow: 4,
			peakDay: "Среда",
			peakHour: 18,
			cells: [
				{ dayOfWeek: 1, dayName: "Пн", hour: 10, cancelledCount: 1, noShowCount: 0, totalLost: 1 },
				{ dayOfWeek: 2, dayName: "Вт", hour: 14, cancelledCount: 2, noShowCount: 1, totalLost: 3 },
				{ dayOfWeek: 3, dayName: "Ср", hour: 18, cancelledCount: 4, noShowCount: 2, totalLost: 6 },
				{ dayOfWeek: 4, dayName: "Чт", hour: 11, cancelledCount: 1, noShowCount: 0, totalLost: 1 },
				{ dayOfWeek: 5, dayName: "Пт", hour: 16, cancelledCount: 3, noShowCount: 1, totalLost: 4 },
				{ dayOfWeek: 6, dayName: "Сб", hour: 12, cancelledCount: 1, noShowCount: 0, totalLost: 1 },
			],
		},
		isEmpty: false,
	};
}
