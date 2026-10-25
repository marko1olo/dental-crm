import type { RecallCycleType } from "./recallCycleTypes";
import type { PatientRecallRecord } from "./recallRecordTypes";

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

export const DEFAULT_RECALL_CANDIDATES: readonly PatientRecallRecord[] = [];
