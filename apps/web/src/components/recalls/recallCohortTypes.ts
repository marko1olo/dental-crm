import type { RecallCycleType } from "./recallCycleTypes";

export interface CohortRetentionGroup {
	readonly cohortKey: string;
	readonly cohortLabel: string;
	readonly totalPatients: number;
	readonly dueCount: number;
	readonly contactedCount: number;
	readonly scheduledCount: number;
	readonly completedCount: number;
	readonly declinedCount: number;
	readonly retentionRatePercent: number;
	readonly conversionRatePercent: number;
	readonly averageLtvRub: number;
	readonly totalRevenueRub: number;
	readonly estimatedLostRevenueRub: number;
}

export interface CohortRetentionReport {
	readonly cohorts: readonly CohortRetentionGroup[];
	readonly overallRetentionRatePercent: number;
	readonly overallConversionRatePercent: number;
	readonly overallAverageLtvRub: number;
	readonly totalRecallRevenueRub: number;
	readonly totalLostRevenueRub: number;
}

export interface RecallMetrics {
	readonly totalCandidates: number;
	readonly upcomingCount: number;
	readonly dueNowCount: number;
	readonly overdue30Count: number;
	readonly overdue90Count: number;
	readonly completedCount: number;
	readonly contactedCount: number;
	readonly scheduledCount: number;
	readonly declinedCount: number;
	readonly conversionRatePercent: number;
	readonly contactResponseRatePercent: number;
	readonly retentionRatePercent: number;
	readonly totalHistoricalLtvRub: number;
	readonly averageRecallLtvRub: number;
	readonly byCycle: Record<RecallCycleType, number>;
	readonly overdueEstimatedLostRevenueRub: number;
	readonly retainedRevenueRub: number;
}
