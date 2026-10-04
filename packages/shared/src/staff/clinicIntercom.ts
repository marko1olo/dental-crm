/**
 * clinicIntercom.ts — Shared Types, Schemas & Engine for Clinic Staff Messenger & Chairside Intercom.
 *
 * Implements:
 * 1. Clinic Channels: #общий (general), #ресепшен (reception), #интерком-ассистенты (intercom_assistants), #лаборатория-зтл (lab_ztl) + Direct Messages.
 * 2. Universal Clinical Intercom Pings (Chairside Presets): Therapy/Endo, Surgery/Implant, Orthopedics, Hygiene, SOS.
 * 3. Dynamic chairside targeting (All assistants, Reception, X-Ray, Dental Lab).
 * 4. 2-Way Interactive Ack-Loop: instant 1-click status responses [🏃 Иду! (1 мин)], [⏱ Через 3-5 мин], [❌ Занят, передал коллеге].
 * 5. Web Audio API non-blocking synth alerts + Mobile-first responsive UX.
 */

import { z } from "zod";

// ─── Enums & Value Constants ───

export const staffChatChannelTypeSchema = z.enum(["channel", "direct"]);
export type StaffChatChannelType = z.infer<typeof staffChatChannelTypeSchema>;

export const staffChatMessageTypeSchema = z.enum(["text", "intercom_ping", "patient_card"]);
export type StaffChatMessageType = z.infer<typeof staffChatMessageTypeSchema>;

export const staffChatUrgencySchema = z.enum(["normal", "urgent", "critical"]);
export type StaffChatUrgency = z.infer<typeof staffChatUrgencySchema>;

export const intercomPresetKeySchema = z.enum([
	"patient_arrived",
	"call_assistant",
	"xray_ready",
	"lab_work_ready",
	"patient_delay",
	"urgent_doctor_call",
]);
export type IntercomPresetKey = z.infer<typeof intercomPresetKeySchema>;

export const intercomAckTypeSchema = z.enum([
	"on_my_way", // 🏃 Иду! (1 мин)
	"coming_soon", // ⏱ Через 3-5 мин
	"busy_reassigned", // ❌ Занят, передал коллеге
]);
export type IntercomAckType = z.infer<typeof intercomAckTypeSchema>;

export const intercomTargetAudienceSchema = z.enum([
	"all_assistants",
	"reception",
	"xray_tech",
	"dental_lab",
	"doctor_sos",
]);
export type IntercomTargetAudience = z.infer<typeof intercomTargetAudienceSchema>;

export interface DefaultChannelDefinition {
	slug: string;
	name: string;
	description: string;
	icon: "hospital" | "bell" | "chair" | "tooth";
	order: number;
}

export const DEFAULT_CLINIC_CHANNELS: readonly DefaultChannelDefinition[] = [
	{
		slug: "general",
		name: "Общий чат",
		description: "Объявления, смены, общие новости клиники",
		icon: "hospital",
		order: 1,
	},
	{
		slug: "reception",
		name: "Ресепшен и визиты",
		description: "Приход пациентов, задержки, готовность к приёму",
		icon: "bell",
		order: 2,
	},
	{
		slug: "intercom_assistants",
		name: "Интерком и ассистенты",
		description: "Срочный вызов ассистента у кресла в кабинет, материалы",
		icon: "chair",
		order: 3,
	},
	{
		slug: "lab_ztl",
		name: "Лаборатория ЗТЛ",
		description: "Обсуждение нарядов-заказов, примерки, цвет Vita",
		icon: "tooth",
		order: 4,
	},
] as const;

export interface ClinicalCallReasonCategory {
	id: string;
	name: string;
	icon: string;
	reasons: readonly string[];
}

export const CLINICAL_ASSISTANT_REASONS_BY_SPECIALTY: readonly ClinicalCallReasonCategory[] = [
	{
		id: "therapy_endo",
		name: "Терапия / Эндодонтия",
		icon: "🦷",
		reasons: [
			"Коффердам / изоляция",
			"Анестезия / карпула",
			"Замешать цемент / подкладку",
			"Гуттаперча / силер",
			"Слюноотсос / спрей",
		],
	},
	{
		id: "surgery_implant",
		name: "Хирургия / Имплантация",
		icon: "🪚",
		reasons: [
			"Хирургический набор",
			"Аспирация / наконечник",
			"Физраствор / охлаждение",
			"Шовный материал",
			"Костный графт / мембрана",
		],
	},
	{
		id: "orthopedics",
		name: "Ортопедия / Протезирование",
		icon: "👑",
		reasons: [
			"Слепочная масса / ложка",
			"Ретракционная нить",
			"Припасовка конструкции",
			"Интраоральный сканер",
			"Временная коронка / цемент",
		],
	},
	{
		id: "hygiene",
		name: "Гигиена / Профосмотр",
		icon: "🪥",
		reasons: [
			"Оптрагейт",
			"Air-Flow порошок",
			"Фотопротокол / зеркала",
			"УЗ-наконечник / кюреты",
		],
	},
	{
		id: "sos_emergency",
		name: "Экстренно / SOS",
		icon: "🚨",
		reasons: [
			"Нашатырь / дурно пациенту",
			"Второе мнение главврача",
			"Срочная остановка кровотечения",
		],
	},
] as const;

export const COMMON_ASSISTANT_REASONS = [
	...CLINICAL_ASSISTANT_REASONS_BY_SPECIALTY.flatMap((cat) => cat.reasons),
] as const;

export interface IntercomPresetDefinition {
	key: IntercomPresetKey;
	label: string;
	badge: string;
	channelSlug: string;
	defaultUrgency: StaffChatUrgency;
	description: string;
	formatMessage: (params: {
		patientName?: string;
		cabinetNumber?: string;
		reason?: string;
		delayMinutes?: number;
		orderNumber?: string;
		doctorName?: string;
		customNote?: string;
	}) => string;
}

export const INTERCOM_PRESETS: Record<IntercomPresetKey, IntercomPresetDefinition> = {
	patient_arrived: {
		key: "patient_arrived",
		label: "Пациент в холле",
		badge: "🛎️",
		channelSlug: "reception",
		defaultUrgency: "normal",
		description: "Пациент подошел на приём, оформлен и ожидает в холле клиники",
		formatMessage: ({ patientName = "Пациент" }) =>
			`Пациент ${patientName} подошел(ла) в клинику и ожидает в холле. Готов(а) к приёму.`,
	},
	call_assistant: {
		key: "call_assistant",
		label: "Вызов ассистента в кабинет",
		badge: "🪑",
		channelSlug: "intercom_assistants",
		defaultUrgency: "urgent",
		description: "Срочный вызов ассистента к стоматологической установке",
		formatMessage: ({
			cabinetNumber = "кабинет",
			reason = "помощь на приёме",
			customNote,
		}) => {
			const locStr =
				cabinetNumber.toLowerCase().includes("каб") ||
				cabinetNumber.toLowerCase().includes("кресл")
					? cabinetNumber
					: `каб. ${cabinetNumber}`;
			let text = `Срочно требуется ассистент в ${locStr}! Повод: ${reason}.`;
			if (customNote) {
				text += ` [Примечание: ${customNote}]`;
			}
			return text;
		},
	},
	xray_ready: {
		key: "xray_ready",
		label: "Готов снимок КТ / ОПТГ",
		badge: "📷",
		channelSlug: "reception",
		defaultUrgency: "normal",
		description: "Рентген-лаборант завершил исследование, снимок прикреплен к карте",
		formatMessage: ({ patientName = "Пациент" }) =>
			`Рентген-диагностика завершена: снимок КТ/ОПТГ для пациента ${patientName} загружен в систему.`,
	},
	lab_work_ready: {
		key: "lab_work_ready",
		label: "Готова работа из ЗТЛ",
		badge: "🦷",
		channelSlug: "lab_ztl",
		defaultUrgency: "normal",
		description: "Ортопедическая работа поступила из зуботехнической лаборатории",
		formatMessage: ({ patientName = "Пациент", orderNumber = "б/н" }) =>
			`Ортопедическая конструкция (наряд ЗТЛ №${orderNumber}) для пациента ${patientName} поступила в клинику.`,
	},
	patient_delay: {
		key: "patient_delay",
		label: "Пациент задерживается",
		badge: "⏳",
		channelSlug: "reception",
		defaultUrgency: "normal",
		description: "Предупреждение врача о задержке пациента в пути",
		formatMessage: ({ patientName = "Пациент", delayMinutes = 10 }) =>
			`Пациент ${patientName} предупредил(а) о задержке на ${delayMinutes} мин.`,
	},
	urgent_doctor_call: {
		key: "urgent_doctor_call",
		label: "Срочный вызов врача",
		badge: "🚨",
		channelSlug: "general",
		defaultUrgency: "critical",
		description: "Экстренный вызов дежурного врача или заведующего отделением",
		formatMessage: ({ doctorName = "Дежурный врач", cabinetNumber = "ресепшен", customNote }) => {
			let text = `ВНИМАНИЕ! Срочно требуется врач ${doctorName} в зону: ${cabinetNumber}!`;
			if (customNote) {
				text += ` Причина: ${customNote}`;
			}
			return text;
		},
	},
};

// ─── Zod Schemas ───

export const patientCardAttachmentSchema = z.object({
	patientId: z.string().uuid(),
	fullName: z.string().min(1),
	phone: z.string().optional().nullable(),
	birthDate: z.string().optional().nullable(),
	cardRecordNumber: z.string().optional().nullable(),
	cabinetNumber: z.string().optional().nullable(),
	appointmentId: z.string().uuid().optional().nullable(),
	visitId: z.string().uuid().optional().nullable(),
	doctorName: z.string().optional().nullable(),
	diagnosisSummary: z.string().optional().nullable(),
	hasAllergyAlert: z.boolean().optional(),
});
export type PatientCardAttachment = z.infer<typeof patientCardAttachmentSchema>;

export const intercomAckSchema = z.object({
	staffId: z.string(),
	staffName: z.string(),
	staffRole: z.string(),
	ackType: intercomAckTypeSchema,
	customComment: z.string().optional(),
	timestamp: z.string(),
});
export type IntercomAck = z.infer<typeof intercomAckSchema>;

export const staffChatChannelSchema = z.object({
	id: z.string().uuid(),
	organizationId: z.string().uuid(),
	type: staffChatChannelTypeSchema,
	slug: z.string().nullable(),
	name: z.string().min(1),
	description: z.string().nullable().optional(),
	icon: z.string().nullable().optional(),
	isDefault: z.boolean().default(false),
	directUser1Id: z.string().uuid().nullable().optional(),
	directUser2Id: z.string().uuid().nullable().optional(),
	unreadCount: z.number().int().nonnegative().default(0),
	lastMessage: z.lazy(() => staffChatMessageSchema.nullable().optional()),
	createdAt: z.string(),
	updatedAt: z.string().optional(),
});
export type StaffChatChannel = z.infer<typeof staffChatChannelSchema>;

export const staffChatMessageSchema = z.object({
	id: z.string().uuid(),
	organizationId: z.string().uuid(),
	channelId: z.string().uuid(),
	senderUserId: z.string().uuid().nullable().optional(),
	senderName: z.string().min(1),
	senderRole: z.string().min(1),
	messageType: staffChatMessageTypeSchema.default("text"),
	content: z.string().min(1),
	urgency: staffChatUrgencySchema.default("normal"),
	pinned: z.boolean().default(false),
	patientAttachment: patientCardAttachmentSchema.nullable().optional(),
	intercomPreset: intercomPresetKeySchema.nullable().optional(),
	targetAudience: z.string().nullable().optional(),
	intercomAcks: z.array(intercomAckSchema).default([]),
	metadata: z.record(z.unknown()).nullable().optional(),
	readByStaffIds: z.array(z.string()).default([]),
	createdAt: z.string(),
});
export type StaffChatMessage = z.infer<typeof staffChatMessageSchema>;

export const sendStaffChatMessageInputSchema = z.object({
	channelId: z.string().uuid().optional(),
	channelSlug: z.string().optional(),
	directUserId: z.string().uuid().optional(),
	content: z.string().min(1).max(4000),
	messageType: staffChatMessageTypeSchema.default("text"),
	urgency: staffChatUrgencySchema.default("normal"),
	patientAttachment: patientCardAttachmentSchema.optional(),
	intercomPreset: intercomPresetKeySchema.optional(),
	targetAudience: z.string().optional(),
	metadata: z.record(z.unknown()).optional(),
});
export type SendStaffChatMessageInput = z.infer<typeof sendStaffChatMessageInputSchema>;

export const sendIntercomPingInputSchema = z.object({
	presetKey: intercomPresetKeySchema,
	cabinetNumber: z.string().optional(),
	chairId: z.string().uuid().optional(),
	targetAudience: intercomTargetAudienceSchema.optional(),
	reason: z.string().optional(),
	specialtyCategory: z.string().optional(),
	patientId: z.string().uuid().optional(),
	patientName: z.string().optional(),
	delayMinutes: z.number().int().min(1).max(180).optional(),
	orderNumber: z.string().optional(),
	doctorName: z.string().optional(),
	urgency: staffChatUrgencySchema.optional(),
	customNote: z.string().optional(),
});
export type SendIntercomPingInput = z.infer<typeof sendIntercomPingInputSchema>;

export const sendIntercomAckInputSchema = z.object({
	messageId: z.string().uuid(),
	ackType: intercomAckTypeSchema,
	customComment: z.string().optional(),
});
export type SendIntercomAckInput = z.infer<typeof sendIntercomAckInputSchema>;

export const staffMemberPresenceItemSchema = z.object({
	staffId: z.string(),
	fullName: z.string(),
	role: z.string(),
	specialty: z.string().nullable().optional(),
	cabinetNumber: z.string().nullable().optional(),
	status: z.enum(["online", "in_visit", "busy", "away", "offline"]),
	currentVisitId: z.string().uuid().nullable().optional(),
	currentPatientName: z.string().nullable().optional(),
	lastSeenAt: z.string(),
});
export type StaffMemberPresenceItem = z.infer<typeof staffMemberPresenceItemSchema>;

export interface IntercomLocationItem {
	id: string;
	name: string;
	code?: string;
	isChair: boolean;
}
