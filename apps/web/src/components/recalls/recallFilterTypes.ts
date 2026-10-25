import type {
	CanonicalRecallWorkflowStatus,
	ClinicalRecallTriggerType,
	RecallContactStatus,
	RecallCycleType,
	RecallPeriodFilter,
	RecallUrgencyStatus,
} from "./recallCycleTypes";

export type RecallCategoryFilter =
	| "all"
	| "hygiene_6m"
	| "implants_1y"
	| "orthodontics"
	| "endodontics";

export type RecallUrgencyLevel =
	| "upcoming"
	| "due_now"
	| "overdue_30"
	| "overdue_90"
	| "completed";

export type RecallChannelType = "whatsapp" | "telegram" | "sms" | "phone";

export interface RecallFilterOptions {
	readonly status?: (RecallContactStatus | "all") | undefined;
	readonly canonicalStatus?: (CanonicalRecallWorkflowStatus | "all") | undefined;
	readonly urgencyStatus?: (RecallUrgencyStatus | "all") | undefined;
	readonly cycleType?: (RecallCycleType | "all") | undefined;
	readonly triggerType?: (ClinicalRecallTriggerType | "all") | undefined;
	readonly doctorId?: (string | "all") | undefined;
	readonly period?: (RecallPeriodFilter) | undefined;
	readonly referenceDate?: (Date | string) | undefined;
	readonly searchQuery?: string | undefined;
	readonly sortBy?: ("daysOverdue" | "dueDate" | "fullName" | "lastVisitDate" | "ltv") | undefined;
	readonly sortDirection?: ("asc" | "desc") | undefined;
	readonly includeArchived?: boolean | undefined;
}
