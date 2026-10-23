import type { ClinicalTaskCallType } from "@dental/shared";
import type {
	ClinicalRecallTriggerType,
	RecallChannel,
	RecallContactStatus,
	RecallCycleType,
	RecallPeriodFilter,
	RecallUrgencyStatus,
	CanonicalRecallWorkflowStatus,
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

export interface PatientRecallItem {
	readonly id: string;
	readonly patientId: string;
	readonly fullName: string;
	readonly phone: string | null;
	readonly email?: string | null | undefined;
	readonly category: "hygiene" | "implants" | "orthodontics" | "endodontics";
	readonly categoryLabel: string;
	readonly lastVisitDate: string; // YYYY-MM-DD
	readonly dueDate: string; // YYYY-MM-DD
	readonly daysOverdue: number; // positive = overdue
	readonly urgency: RecallUrgencyLevel;
	readonly attendingDoctorId?: string | undefined;
	readonly attendingDoctorName?: string | undefined;
	readonly lastProcedures?: readonly string[] | undefined;
	readonly clinicalNotes?: string | undefined;
	readonly implantsCount?: number | undefined;
	readonly periodontalPocketMm?: number | undefined;
	readonly status: RecallContactStatus;
	readonly lastContactedAt?: string | undefined;
	readonly lastContactChannel?: RecallChannelType | undefined;
	readonly scheduledAppointmentDate?: string | undefined;
}

export interface PatientRecallRecord {
	readonly id: string;
	readonly patientId: string;
	readonly fullName: string;
	readonly phone: string | null;
	readonly email?: string | null | undefined;
	readonly birthDate?: string | null | undefined;
	readonly age?: number | undefined;
	readonly cycleType: RecallCycleType;
	readonly clinicalTriggerType?: ClinicalRecallTriggerType | undefined;
	readonly customIntervalValue?: number | undefined;
	readonly lastVisitDate: string; // ISO YYYY-MM-DD
	readonly dueDate: string; // ISO YYYY-MM-DD
	readonly daysOverdue: number; // >0 = просрочено, <0 = осталось дней
	readonly urgencyStatus: RecallUrgencyStatus;
	readonly status: RecallContactStatus;
	readonly attendingDoctorId?: string | undefined;
	readonly attendingDoctorName?: string | undefined;
	readonly implantSurgeryDate?: string | undefined;
	readonly implantMilestoneMonth?: number | undefined; // 1, 3, 6, 12
	readonly implantsCount?: number | undefined;
	readonly orthoDeviceType?: ("braces" | "aligners" | "retainer") | undefined;
	readonly hasBraces?: boolean | undefined;
	readonly isChildUnder14?: boolean | undefined;
	readonly treatmentPlanTitle?: string | undefined;
	readonly periodontalPocketMaxMm?: number | undefined;
	readonly decayedTeethCount?: number | undefined;
	readonly lastProcedures?: readonly string[] | undefined;
	readonly clinicalNotes?: string | undefined;
	readonly taskCallType?: ClinicalTaskCallType | undefined;
	readonly lastContactedAt?: string | undefined;
	readonly lastContactChannel?: RecallChannel | undefined;
	readonly scheduledAppointmentId?: string | undefined;
	readonly scheduledDate?: string | undefined;
	readonly historicalRevenueRub?: number | undefined;
	readonly visitsCount?: number | undefined;
	readonly isArchived?: boolean | undefined;
	readonly isDeceased?: boolean | undefined;
	readonly patientStatus?: string | undefined;
	readonly postponedUntil?: string | undefined;
	readonly postponeReason?: string | undefined;
	readonly channelId?: string | undefined;
}

export type PatientRecallCandidate = PatientRecallRecord;

export function determineTaskCallTypeForCandidate(c: PatientRecallRecord): ClinicalTaskCallType {
	if (c.taskCallType) return c.taskCallType;
	if (c.implantSurgeryDate || (c.clinicalNotes && /удалени|имплант|операци/i.test(c.clinicalNotes))) {
		return "learn_health";
	}
	if (c.clinicalNotes && /план лечения не начат/i.test(c.clinicalNotes)) {
		return "medplan_not_started";
	}
	if (c.clinicalNotes && /план лечения не закончен/i.test(c.clinicalNotes)) {
		return "medplan_not_finished";
	}
	if (c.status === "scheduled") {
		return "appointment_confirmation";
	}
	if (c.status === "declined") {
		return "appointment_refuse";
	}
	return "preventive_inspection";
}

export interface RecallTemplateVariables {
	readonly patientFirstName: string;
	readonly patientFullName: string;
	readonly doctorName: string;
	readonly clinicName: string;
	readonly serviceName: string;
	readonly lastVisitDateFormatted: string;
	readonly dueDateFormatted: string;
	readonly intervalDescription: string;
	readonly bookingUrl: string;
	readonly phone: string;
}

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

