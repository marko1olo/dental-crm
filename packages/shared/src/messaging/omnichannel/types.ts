/**
 * types.ts — Layer 0: Contracts, Schemas & DTOs for Omnichannel Messaging & Bot Engine.
 *
 * Invariants:
 * - 0 runtime circular dependencies
 * - Pure TypeScript interfaces, Zod schemas, and DTO contracts
 * - Strictly UTF-8 without BOM
 */

import { z } from "zod";

// ─── Enums & Schemas ───

export const omnichannelChannelSchema = z.enum([
	"whatsapp",
	"telegram",
	"sms",
	"maxibot",
	"vk",
]);
export type OmnichannelChannel = z.infer<typeof omnichannelChannelSchema>;

export const omnichannelProviderSchema = z.enum([
	"waba_360dialog",
	"telegram_bot",
	"sms_gateway",
	"maxibot_bridge",
	"vk_bridge",
]);
export type OmnichannelProvider = z.infer<typeof omnichannelProviderSchema>;

export const omnichannelTriggerTypeSchema = z.enum([
	"reminder_24h",
	"reminder_2h",
	"appointment_confirmation",
	"appointment_reschedule",
	"appointment_cancelled",
	"post_visit_nps",
	"sbp_payment",
	"birthday_greeting",
	"hygiene_recall_6m",
	"custom",
]);
export type OmnichannelTriggerType = z.infer<typeof omnichannelTriggerTypeSchema>;

export const omnichannelPatientActionSchema = z.enum([
	"CONFIRMED",
	"RESCHEDULE_REQUESTED",
	"CANCELLED",
	"NPS_FEEDBACK",
	"PAYMENT_CONFIRMED",
	"UNKNOWN",
]);
export type OmnichannelPatientAction = z.infer<typeof omnichannelPatientActionSchema>;

export const omnichannelAppointmentStatusSchema = z.enum([
	"planned",
	"confirmed",
	"reschedule_requested",
	"cancelled",
	"arrived",
	"in_treatment",
	"completed",
	"no_show",
]);
export type OmnichannelAppointmentStatus = z.infer<typeof omnichannelAppointmentStatusSchema>;

// ─── Context Schemas ───

export const clinicCoordinatesSchema = z.object({
	latitude: z.number().min(-90).max(90),
	longitude: z.number().min(-180).max(180),
});
export type ClinicCoordinates = z.infer<typeof clinicCoordinatesSchema>;

export const omnichannelAppointmentContextSchema = z.object({
	appointmentId: z.string().min(1),
	organizationId: z.string().min(1),
	patientId: z.string().min(1),
	patientFullName: z.string().min(1),
	patientFirstName: z.string().optional(),
	patientPhone: z.string().min(6),
	telegramChatId: z.union([z.string(), z.number()]).optional().nullable(),
	doctorFullName: z.string().min(1),
	doctorSpecialty: z.string().default("Врач стоматолог"),
	appointmentDateTime: z.string().min(1), // ISO date string or formatted date
	appointmentDateFormatted: z.string().optional(), // "29 августа 2026"
	appointmentTimeFormatted: z.string().optional(), // "14:30"
	clinicName: z.string().default("DENTE Clinic"),
	clinicAddress: z.string().default("г. Москва, ул. Арбат, д. 24, стр. 1"),
	clinicFloorOffice: z.string().optional(), // "2 этаж, каб. 4"
	clinicPhone: z.string().default(""),
	clinicCoordinates: clinicCoordinatesSchema.default({
		latitude: 55.751244,
		longitude: 37.618423,
	}),
	yandexMapsUrl: z.string().optional(),
	twoGisUrl: z.string().optional(),
	parkingDirections: z.string().optional(),
	rescheduleUrl: z.string().optional(),
	paymentAmountKopecks: z.number().int().optional(),
});
export type OmnichannelAppointmentContext = z.input<typeof omnichannelAppointmentContextSchema>;
export type OmnichannelAppointmentContextOutput = z.output<typeof omnichannelAppointmentContextSchema>;

// ─── Message Payload Types ───

export interface TelegramInlineButton {
	text: string;
	callback_data?: string | undefined;
	url?: string | undefined;
}

export interface TelegramSendMessagePayload {
	chat_id: string | number;
	text: string;
	parse_mode: "HTML" | "MarkdownV2" | "Markdown";
	reply_markup?: {
		inline_keyboard: TelegramInlineButton[][];
	} | undefined;
}

export interface TelegramSendLocationPayload {
	chat_id: string | number;
	latitude: number;
	longitude: number;
	title?: string | undefined;
	address?: string | undefined;
	reply_markup?: {
		inline_keyboard: TelegramInlineButton[][];
	} | undefined;
}

export interface WhatsappWabaButtonPayload {
	messaging_product: "whatsapp";
	recipient_type: "individual";
	to: string;
	type: "interactive";
	interactive: {
		type: "button";
		header?: { type: "text"; text: string } | undefined;
		body: { text: string };
		footer?: { text: string } | undefined;
		action: {
			buttons: Array<{
				type: "reply";
				reply: { id: string; title: string };
			}>;
		};
	};
}

export interface SmsDispatchPayload {
	to: string;
	text: string;
}

export interface OmnichannelDispatchPackage {
	triggerType: OmnichannelTriggerType;
	channel: OmnichannelChannel;
	provider: OmnichannelProvider;
	recipientId: string;
	appointmentId: string;
	plainText: string;
	telegramPayload?: TelegramSendMessagePayload | TelegramSendLocationPayload | undefined;
	whatsappPayload?: WhatsappWabaButtonPayload | undefined;
	smsPayload?: SmsDispatchPayload | undefined;
	scheduledAt?: string | undefined;
}

export interface BirthdayGreetingOptions {
	bonusAmountRubles?: number;
	discountPercent?: number;
	promoCode?: string;
	validDays?: number;
}

export interface HygieneRecall6mOptions {
	lastVisitMonthsAgo?: number;
	recommendedDoctorFullName?: string;
	discountPercent?: number;
}

export interface ParsedOmnichannelWebhookResult {
	channel: OmnichannelChannel;
	senderId: string;
	appointmentId: string | null;
	action: OmnichannelPatientAction;
	confidence: "explicit_button" | "keyword_match" | "unrecognized";
	rawMessageText: string;
	nextAppointmentStatus: OmnichannelAppointmentStatus | null;
	autoReplyText: string;
	extractedScore?: number | undefined;
}

// ─── Extended Bot Dialog & FSM Contracts ───

export type BotIntentType =
	| "booking"
	| "reschedule"
	| "cancel"
	| "emergency_pain"
	| "price_faq"
	| "lab_status"
	| "operator_handover"
	| "confirm"
	| "greeting"
	| "feedback"
	| "unknown";

export interface IncomingBotMessage {
	channel: OmnichannelChannel;
	senderId: string;
	senderName?: string | undefined;
	text: string;
	payload?: string | undefined;
	timestamp?: number | undefined;
	organizationId?: string | undefined;
	clinicId?: string | undefined;
	metadata?: Record<string, unknown> | undefined;
}

export interface BotKeyboardButton {
	text: string;
	callbackData?: string | undefined;
	url?: string | undefined;
}

export interface BotReplyMessage {
	text: string;
	buttons?: BotKeyboardButton[][] | undefined;
	actionExecuted?: string | undefined;
	nextStep?: string | undefined;
	handoverToOperator?: boolean | undefined;
	metadata?: Record<string, unknown> | undefined;
}

export type BotDialogState =
	| "idle"
	| "awaiting_specialty"
	| "awaiting_date"
	| "awaiting_slot"
	| "awaiting_patient_name"
	| "awaiting_phone"
	| "awaiting_confirmation"
	| "handover_operator"
	| "completed";

export interface BotDialogHistoryEntry {
	role: "patient" | "bot" | "operator";
	text: string;
	timestamp: number;
	intent?: BotIntentType | undefined;
}

export interface BotDialogContext {
	dialogId: string;
	organizationId: string;
	patientId?: string | undefined;
	patientPhone: string;
	patientName?: string | undefined;
	channel: OmnichannelChannel;
	currentState: BotDialogState;
	lastIntent?: BotIntentType | undefined;
	selectedSpecialty?: string | undefined;
	selectedDoctorId?: string | undefined;
	selectedDoctorName?: string | undefined;
	selectedSlotTime?: string | undefined;
	appointmentId?: string | undefined;
	history: BotDialogHistoryEntry[];
	handoverActive: boolean;
	operatorId?: string | undefined;
	createdAt: number;
	updatedAt: number;
	sessionExpiresAt: number;
	metadata?: Record<string, unknown> | undefined;
}

export interface DoctorAvailableSlot {
	slotId: string;
	doctorId: string;
	doctorName: string;
	specialty: string;
	startDateTime: string;
	endDateTime: string;
	dateFormatted: string;
	timeFormatted: string;
	isFree: boolean;
}

export interface SlotMatchCriteria {
	specialty?: string | undefined;
	doctorId?: string | undefined;
	preferredDate?: string | undefined; // YYYY-MM-DD
	timeOfDay?: "morning" | "afternoon" | "evening" | "any" | undefined;
	limit?: number | undefined;
}

export interface SlotMatchResult {
	matches: DoctorAvailableSlot[];
	found: boolean;
	messageText: string;
	suggestedButtons: BotKeyboardButton[][];
}

export interface OperatorHandoverRequest {
	dialogId: string;
	organizationId: string;
	channel: OmnichannelChannel;
	patientPhone: string;
	patientName?: string | undefined;
	reason: "pain_emergency" | "explicit_request" | "unrecognized_intent" | "complex_medical_question";
	urgency: "critical" | "high" | "normal";
	lastPatientMessage: string;
	dialogHistorySnippet: string;
	requestedAt: number;
}

export interface OperatorHandoverResult {
	handoverId: string;
	dialogId: string;
	status: "escalated" | "assigned" | "resolved";
	notificationPayload: {
		title: string;
		body: string;
		channel: OmnichannelChannel;
		phone: string;
		urgency: "critical" | "high" | "normal";
	};
	botAutoReply: string;
}
