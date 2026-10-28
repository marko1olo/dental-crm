import { z } from "zod";

export const APPT_REASON_TYPES = ["common", "block"] as const;
export const STOMX_APPT_REASON_TYPES = APPT_REASON_TYPES;
export type ApptReasonType = (typeof APPT_REASON_TYPES)[number];
export type StomxApptReasonType = ApptReasonType;

export const APPT_REASONS = [
	"acute_pain", "routine_checkup", "follow_up", "treatment", "consultation",
	"hygiene", "lunch", "break", "vacation", "study", "absent", "other_block",
] as const;

export const STOMX_APPT_REASONS = APPT_REASONS;
export const apptReasonSchema = z.enum(APPT_REASONS);
export const stomxApptReasonSchema = apptReasonSchema;
export type ApptReason = z.infer<typeof apptReasonSchema>;
export type StomxApptReason = ApptReason;

export interface ApptReasonMeta {
	readonly id?: number;
	readonly code: ApptReason;
	readonly nameRu: string;
	readonly type: ApptReasonType;
	readonly isEmergency: boolean;
	readonly colorHex: string;
}

export type StomxApptReasonMeta = ApptReasonMeta;

export const APPT_REASONS_CATALOG: readonly ApptReasonMeta[] = [
	{ id: 1, code: "acute_pain", nameRu: "Острая боль", type: "common", isEmergency: true, colorHex: "#ef4444" },
	{ id: 2, code: "routine_checkup", nameRu: "Плановое обследование", type: "common", isEmergency: false, colorHex: "#3b82f6" },
	{ id: 3, code: "follow_up", nameRu: "Повторно", type: "common", isEmergency: false, colorHex: "#10b981" },
	{ id: 4, code: "treatment", nameRu: "Лечение", type: "common", isEmergency: false, colorHex: "#8b5cf6" },
	{ code: "consultation", nameRu: "Первичная консультация", type: "common", isEmergency: false, colorHex: "#06b6d4" },
	{ code: "hygiene", nameRu: "Профессиональная гигиена", type: "common", isEmergency: false, colorHex: "#14b8a6" },
	{ id: 5, code: "lunch", nameRu: "Обед", type: "block", isEmergency: false, colorHex: "#f59e0b" },
	{ id: 6, code: "break", nameRu: "Перерыв", type: "block", isEmergency: false, colorHex: "#eab308" },
	{ id: 7, code: "vacation", nameRu: "Отпуск", type: "block", isEmergency: false, colorHex: "#64748b" },
	{ id: 8, code: "study", nameRu: "Учеба", type: "block", isEmergency: false, colorHex: "#6366f1" },
	{ id: 9, code: "absent", nameRu: "Отсутствует", type: "block", isEmergency: false, colorHex: "#94a3b8" },
	{ id: 10, code: "other_block", nameRu: "Другое", type: "block", isEmergency: false, colorHex: "#71717a" },
];

export const STOMX_APPT_REASONS_CATALOG = APPT_REASONS_CATALOG;
export const APPOINTMENT_REASONS_CATALOG = APPT_REASONS_CATALOG;

export const APPT_REASON_BY_CODE = Object.freeze(
	Object.fromEntries(APPT_REASONS_CATALOG.map((item) => [item.code, item])) as Record<ApptReason, ApptReasonMeta>,
);

export const STOMX_APPT_REASON_BY_CODE = APPT_REASON_BY_CODE;
export const APPOINTMENT_REASON_BY_CODE = APPT_REASON_BY_CODE;

export const REFUSE_RESPONSIBILITY = ["patient", "clinic", "system"] as const;
export const STOMX_REFUSE_RESPONSIBILITY = REFUSE_RESPONSIBILITY;
export type RefuseResponsibility = (typeof REFUSE_RESPONSIBILITY)[number];
export type StomxRefuseResponsibility = RefuseResponsibility;

export const APPT_REFUSE_REASONS = [
	"no_show_confirmed", "no_show_unconfirmed", "patient_cancelled", "patient_refused_clinic",
	"patient_rescheduled", "clinic_cancelled", "clinic_rescheduled_better_time",
	"clinic_error", "no_available_time", "expired_slot",
] as const;

export const STOMX_APPT_REFUSE_REASONS = APPT_REFUSE_REASONS;
export const apptRefuseReasonSchema = z.enum(APPT_REFUSE_REASONS);
export const stomxApptRefuseReasonSchema = apptRefuseReasonSchema;
export type ApptRefuseReason = z.infer<typeof apptRefuseReasonSchema>;
export type StomxApptRefuseReason = ApptRefuseReason;

export interface ApptRefuseReasonMeta {
	readonly id: number;
	readonly code: ApptRefuseReason;
	readonly nameRu: string;
	readonly responsibility: RefuseResponsibility;
	readonly isSystem: boolean;
}

export type StomxApptRefuseReasonMeta = ApptRefuseReasonMeta;

export const REFUSE_REASONS_CATALOG: readonly ApptRefuseReasonMeta[] = [
	{ id: 1, code: "no_show_confirmed", nameRu: "Пациент не пришел (после подтверждения)", responsibility: "patient", isSystem: false },
	{ id: 2, code: "no_show_unconfirmed", nameRu: "Пациент не пришел (без подтверждения)", responsibility: "patient", isSystem: false },
	{ id: 3, code: "patient_cancelled", nameRu: "Пациент отказался от приема", responsibility: "patient", isSystem: false },
	{ id: 4, code: "patient_refused_clinic", nameRu: "Пациент отказался от клиники", responsibility: "patient", isSystem: false },
	{ id: 5, code: "patient_rescheduled", nameRu: "Пациент перенес прием", responsibility: "patient", isSystem: false },
	{ id: 6, code: "clinic_cancelled", nameRu: "Клиника отменила прием", responsibility: "clinic", isSystem: false },
	{ id: 7, code: "clinic_rescheduled_better_time", nameRu: "Клиника предложила лучшее время", responsibility: "clinic", isSystem: false },
	{ id: 8, code: "clinic_error", nameRu: "Клиника ошибочно добавила", responsibility: "clinic", isSystem: false },
	{ id: 9, code: "no_available_time", nameRu: "Нет свободного времени", responsibility: "clinic", isSystem: false },
	{ id: 10, code: "expired_slot", nameRu: "Истек срок приема", responsibility: "system", isSystem: true },
];

export const STOMX_REFUSE_REASONS_CATALOG = REFUSE_REASONS_CATALOG;
export const STOMX_APPT_REFUSE_REASONS_CATALOG = REFUSE_REASONS_CATALOG;
export const APPOINTMENT_REFUSAL_REASONS_CATALOG = REFUSE_REASONS_CATALOG;

export const REFUSE_REASON_BY_CODE = Object.freeze(
	Object.fromEntries(REFUSE_REASONS_CATALOG.map((item) => [item.code, item])) as Record<ApptRefuseReason, ApptRefuseReasonMeta>,
);

export const STOMX_REFUSE_REASON_BY_CODE = REFUSE_REASON_BY_CODE;
export const APPOINTMENT_REFUSAL_REASON_BY_CODE = REFUSE_REASON_BY_CODE;

export function getApptReasonMeta(code: ApptReason): ApptReasonMeta | undefined {
	return APPT_REASON_BY_CODE[code];
}

export function getApptRefuseReasonMeta(code: ApptRefuseReason): ApptRefuseReasonMeta | undefined {
	return REFUSE_REASON_BY_CODE[code];
}

export type AppointmentRefusalReason = ApptRefuseReason;
export type AppointmentRefusalReasonMeta = ApptRefuseReasonMeta;
export type AppointmentClinicalReason = ApptReason;
export type AppointmentClinicalReasonMeta = ApptReasonMeta;
