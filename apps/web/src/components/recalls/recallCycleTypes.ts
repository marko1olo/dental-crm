import type { ClinicalTaskCallType, StomxTaskCallType } from "@dental/shared";

export type { ClinicalTaskCallType, StomxTaskCallType };

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

export type RecallContactStatus =
	| "due_now"
	| "invited"
	| "scheduled"
	| "completed"
	| "declined"
	| "pending"
	| "contacted";

export type CanonicalRecallWorkflowStatus =
	| "not_called"
	| "reached"
	| "declined"
	| "scheduled";

export const CANONICAL_RECALL_STATUS_CONFIG: Readonly<
	Record<CanonicalRecallWorkflowStatus, { readonly id: CanonicalRecallWorkflowStatus; readonly label: string; readonly badgeColorToken: string }>
> = {
	not_called: { id: "not_called", label: "Не звонили", badgeColorToken: "warning" },
	reached: { id: "reached", label: "Дозвонились", badgeColorToken: "info" },
	declined: { id: "declined", label: "Отказ", badgeColorToken: "danger" },
	scheduled: { id: "scheduled", label: "Записан", badgeColorToken: "success" },
};

export function toCanonicalRecallStatus(status: RecallContactStatus): CanonicalRecallWorkflowStatus {
	switch (status) {
		case "due_now":
		case "pending":
			return "not_called";
		case "invited":
		case "contacted":
			return "reached";
		case "declined":
			return "declined";
		case "scheduled":
		case "completed":
			return "scheduled";
		default:
			return "not_called";
	}
}

export function fromCanonicalRecallStatus(canonical: CanonicalRecallWorkflowStatus): RecallContactStatus {
	switch (canonical) {
		case "not_called":
			return "due_now";
		case "reached":
			return "contacted";
		case "declined":
			return "declined";
		case "scheduled":
			return "scheduled";
	}
}

export type ClinicalRecallTriggerType =
	| "hygiene_6m"
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
