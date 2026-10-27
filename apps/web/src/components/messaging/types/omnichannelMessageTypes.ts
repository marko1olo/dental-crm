/**
 * omnichannelMessageTypes.ts — Базовые типы сообщений, каналов и доставки.
 * Строго <= 120 строк по Мандату 8b.
 */

export type OmnichannelChannel = "whatsapp" | "telegram" | "sms" | "vk" | "web";
export type OmnichannelChannelFilter = OmnichannelChannel | "all";

export type MessageDirection = "inbound" | "outbound";
export type MessageSenderType = "patient" | "clinic_staff" | "automated_bot";
export type MessageDeliveryStatus =
	| "queued"
	| "sending"
	| "sent"
	| "delivered"
	| "read"
	| "failed";

export type TemplateCategory =
	| "visit_reminder"
	| "appointment_confirmation"
	| "treatment_plan"
	| "nps_survey"
	| "sbp_payment"
	| "birthday_greeting"
	| "hygiene_recall"
	| "custom";

export interface InteractiveButtonPayload {
	readonly id: string;
	readonly title: string;
	readonly action?: string | undefined;
	readonly variant?: "primary" | "secondary" | "danger" | undefined;
}

export interface MessageAttachment {
	readonly id: string;
	readonly name: string;
	readonly type: "image" | "pdf" | "qr_code" | "document";
	readonly url: string;
	readonly sizeFormatted?: string | undefined;
}

export interface OmnichannelMessageInteractivePayload {
	readonly buttons?: readonly InteractiveButtonPayload[] | undefined;
	readonly paymentUrl?: string | undefined;
	readonly paymentAmountRub?: number | undefined;
	readonly paymentQrPayload?: string | undefined;
	readonly treatmentPlanTeeth?: readonly number[] | undefined;
	readonly npsScore?: number | undefined;
	readonly appointmentStatus?: "confirmed" | "reschedule_requested" | "cancelled" | undefined;
}

export interface OmnichannelMessage {
	readonly id: string;
	readonly patientId: string;
	readonly channel: OmnichannelChannel;
	readonly direction: MessageDirection;
	readonly senderName: string;
	readonly senderType: MessageSenderType;
	readonly timestamp: string;
	readonly body: string;
	readonly status: MessageDeliveryStatus;
	readonly templateCategory?: TemplateCategory | undefined;
	readonly interactivePayload?: OmnichannelMessageInteractivePayload | undefined;
	readonly attachments?: readonly MessageAttachment[] | undefined;
}
