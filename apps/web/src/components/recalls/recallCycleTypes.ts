import type { ClinicalTaskCallType } from "@dental/shared";
import {
	type RecallContactStatus,
	type CanonicalRecallWorkflowStatus,
	CANONICAL_RECALL_STATUS_CONFIG,
	toCanonicalRecallStatus,
	fromCanonicalRecallStatus,
} from "./recallCanonicalStatus";

export type { ClinicalTaskCallType, RecallContactStatus, CanonicalRecallWorkflowStatus };
export { CANONICAL_RECALL_STATUS_CONFIG, toCanonicalRecallStatus, fromCanonicalRecallStatus };

export type RecallCycleType =
	| "standard_prophylaxis"
	| "periodontal_maintenance"
	| "implant_monitoring"
	| "orthodontic_braces"
	| "orthodontic_aligners"
	| "orthodontic_retention"
	| "pediatric_fluoridation"
	| "caries_high_risk"
	| "prosthetic_check"
	| "endodontic_check";

export type RecallUrgencyStatus =
	| "upcoming"
	| "due_now"
	| "overdue_30"
	| "overdue_90"
	| "completed";

export type ClinicalRecallTriggerType =
	| "hygiene_6m"
	| "implant_monitoring_6m"
	| "implant_prosthetic_12m"
	| "ortho_activation_1m"
	| "pediatric_3_4m"
	| "endodontic_1m"
	| "periodontal_3m";

export interface ClinicalRecallTriggerInfo {
	readonly triggerType: ClinicalRecallTriggerType;
	readonly title: string;
	readonly shortTitle: string;
	readonly intervalMonths: number;
	readonly intervalWeeks?: number | undefined;
	readonly nextDueDate: Date;
	readonly formattedDueDate: string;
	readonly clinicalRationale: string;
	readonly mappedCycleType: RecallCycleType;
}

export type RecallPeriodFilter =
	| "all"
	| "overdue"
	| "this_month"
	| "next_month"
	| "next_30_days";

export type RecallChannel = "whatsapp" | "telegram" | "sms" | "phone";

export interface RecallCycleDefinition {
	readonly id: RecallCycleType;
	readonly title: string;
	readonly shortTitle: string;
	readonly intervalUnit: "months" | "weeks" | "milestone_sequence";
	readonly defaultIntervalValue: number;
	readonly allowedIntervals: readonly number[];
	readonly defaultIntervalMonths: number;
	readonly allowedIntervalsMonths: readonly number[];
	readonly clinicalRationale: string;
	readonly targetProcedures: readonly string[];
	readonly requiresRadiologyCheck: boolean;
	readonly preservesWarranty: boolean;
	readonly badgeColorToken: string;
	readonly estimatedAverageCheckRub: number;
}
