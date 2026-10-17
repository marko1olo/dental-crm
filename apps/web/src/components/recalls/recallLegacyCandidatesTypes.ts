import type { RecallContactStatus } from "./recallCycleCatalog";

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
