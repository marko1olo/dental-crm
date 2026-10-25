import type {
	ClinicalRecallTriggerType,
	RecallChannel,
	RecallContactStatus,
	RecallCycleType,
	RecallUrgencyStatus,
} from "./recallCycleTypes";
import type { ClinicalTaskCallType } from "@dental/shared";
import type { RecallChannelType, RecallUrgencyLevel } from "./recallFilterTypes";

export * from "./recallFilterTypes";
export * from "./recallMetricsTypes";
export * from "./recallTaskCallClassifier";

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
	readonly implantMilestoneMonth?: number | undefined;
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
