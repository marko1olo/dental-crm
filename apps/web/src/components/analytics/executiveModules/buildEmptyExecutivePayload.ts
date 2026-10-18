import {
	calculateDepartmentBreakdown,
	calculateExecutiveFunnel,
	calculateExecutiveKpisSummary,
	type ExecutiveDashboardPayload,
	type ExecutiveFunnelStage,
	type ExecutivePeriod,
} from "@dental/shared";

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
