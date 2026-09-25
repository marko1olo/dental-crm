/**
 * packages/shared/src/schedule/patientShiftQueueTypes.ts
 *
 * Zod schemas, TypeScript types, and metadata constants for Patient Shift Queue & Live Operational Board.
 * Mandate 8s: Strict Bounded Context & Single Canonical Authority.
 */

import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// 1. ZOD SCHEMAS & TYPES
// ─────────────────────────────────────────────────────────────────────────────

export const patientOperationalStatusSchema = z.enum([
	"planned",
	"confirmed",
	"arrived",
	"in_chair",
	"ready_for_checkout",
	"completed",
	"cancelled",
	"no_show",
]);
export type PatientOperationalStatus = z.infer<
	typeof patientOperationalStatusSchema
>;

export const patientShiftQueueTabSchema = z.enum([
	"all",
	"waiting",
	"in_chair",
	"checkout",
	"completed",
]);
export type PatientShiftQueueTab = z.infer<typeof patientShiftQueueTabSchema>;

export const waitSeveritySchema = z.enum(["normal", "warning", "critical"]);
export type WaitSeverity = z.infer<typeof waitSeveritySchema>;

export const chairDurationSeveritySchema = z.enum([
	"normal",
	"warning",
	"overtime",
]);
export type ChairDurationSeverity = z.infer<typeof chairDurationSeveritySchema>;

export const queueActionRoleSchema = z.enum([
	"reception",
	"doctor",
	"assistant",
	"cashier",
]);
export type QueueActionRole = z.infer<typeof queueActionRoleSchema>;

export const patientQueueActionIdSchema = z.enum([
	"mark_arrived",
	"invite_to_chair",
	"send_to_checkout",
	"complete_checkout",
	"revert_to_waiting",
	"revert_to_chair",
	"mark_cancelled",
	"mark_no_show",
]);
export type PatientQueueActionId = z.infer<typeof patientQueueActionIdSchema>;

export const patientQueueActionSchema = z.object({
	actionId: patientQueueActionIdSchema,
	labelRu: z.string().min(1),
	targetStatus: patientOperationalStatusSchema,
	roleRu: z.string().min(1),
	role: queueActionRoleSchema,
	buttonVariant: z.enum(["primary", "secondary", "success", "warning"]),
	iconName: z.string().min(1),
	descriptionRu: z.string().optional(),
});
export type PatientQueueAction = z.infer<typeof patientQueueActionSchema>;

export interface PatientQueueItem {
	id: string;
	patientId: string | null;
	patientName: string;
	patientPhone: string;
	doctorUserId: string | null;
	doctorName: string;
	doctorSpecialty?: string | null;
	chairId: string | null;
	chairName: string;
	startsAt: string;
	endsAt: string;
	timeRange: string;
	rawStatus: string;
	operationalStatus: PatientOperationalStatus;
	queueTab: "waiting" | "in_chair" | "checkout" | "completed" | "scheduled" | "cancelled";
	waitMinutes: number | null;
	waitSeverity: WaitSeverity | null;
	waitFormatted: string | null;
	chairDurationMinutes: number | null;
	chairDurationSeverity: ChairDurationSeverity | null;
	chairDurationFormatted: string | null;
	isOvertime: boolean;
	overtimeMinutes: number;
	plannedDurationMinutes: number;
	reason: string;
	comment: string | null;
	primaryAction: PatientQueueAction | null;
	secondaryActions: PatientQueueAction[];
}

export interface PatientShiftQueueSummary {
	totalToday: number;
	waitingCount: number;
	waitingOvertimeCount: number;
	inChairCount: number;
	inChairOvertimeCount: number;
	checkoutCount: number;
	completedCount: number;
	cancelledCount: number;
	averageWaitMinutes: number;
}

export interface PatientShiftQueueResult {
	itemsByTab: {
		all: PatientQueueItem[];
		waiting: PatientQueueItem[];
		in_chair: PatientQueueItem[];
		checkout: PatientQueueItem[];
		completed: PatientQueueItem[];
	};
	counts: Record<PatientShiftQueueTab, number>;
	summary: PatientShiftQueueSummary;
	waitingForDoctorAlerts: PatientQueueItem[];
}

export interface PatientShiftQueueOptions {
	targetDateKey?: string;
	nowMs?: number;
	selectedDoctorId?: string | null;
	selectedChairId?: string | null;
	patientsById?: Map<string, { fullName?: string; phone?: string; name?: string }>;
	staffById?: Map<string, { name?: string; fullName?: string; specialty?: string }>;
	chairsById?: Map<string, { name?: string; title?: string }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. CONSTANTS & METADATA
// ─────────────────────────────────────────────────────────────────────────────

export const PATIENT_SHIFT_QUEUE_TABS_META: Record<
	PatientShiftQueueTab,
	{ labelRu: string; shortLabelRu: string; descriptionRu: string; iconName: string }
> = {
	all: {
		labelRu: "Все на сегодня",
		shortLabelRu: "Все",
		descriptionRu: "Все запланированные приемы смены",
		iconName: "CalendarDays",
	},
	waiting: {
		labelRu: "Ожидают в холле / Пришли",
		shortLabelRu: "В холле",
		descriptionRu: "Пациенты, прибывшие в клинику и ожидающие вызова в кабинет",
		iconName: "Clock",
	},
	in_chair: {
		labelRu: "В кресле у врача",
		shortLabelRu: "В кресле",
		descriptionRu: "Пациенты на приеме в стоматологическом кресле прямо сейчас",
		iconName: "Activity",
	},
	checkout: {
		labelRu: "Ожидают расчета на кассе",
		shortLabelRu: "На кассе",
		descriptionRu: "Прием завершен, пациент направлен на расчет и чек 54-ФЗ",
		iconName: "CreditCard",
	},
	completed: {
		labelRu: "Прием завершен",
		shortLabelRu: "Завершен",
		descriptionRu: "Прием проведен, услуги зафиксированы, чек пробит",
		iconName: "CheckCircle2",
	},
};

export const OPERATIONAL_STATUS_META: Record<
	PatientOperationalStatus,
	{ labelRu: string; badgeVariant: "neutral" | "info" | "warning" | "success" | "danger" }
> = {
	planned: { labelRu: "Запланирован", badgeVariant: "neutral" },
	confirmed: { labelRu: "Подтвержден", badgeVariant: "info" },
	arrived: { labelRu: "Прибыл в клинику", badgeVariant: "warning" },
	in_chair: { labelRu: "В кресле у врача", badgeVariant: "info" },
	ready_for_checkout: { labelRu: "Ожидает расчета", badgeVariant: "warning" },
	completed: { labelRu: "Завершен", badgeVariant: "success" },
	cancelled: { labelRu: "Отменен", badgeVariant: "danger" },
	no_show: { labelRu: "Не явился", badgeVariant: "danger" },
};
