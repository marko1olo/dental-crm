/**
 * Core ChannelAdapter Architecture & Messaging Protocol Types
 *
 * Implements a pluggable, multi-channel notification and conversation system
 * supporting Meta WhatsApp Cloud API / Kapso proxy, Telegram, SMS, and Email.
 */

export type Channel =
	| "whatsapp"
	| "telegram"
	| "sms"
	| "email"
	| "max"
	| "phone"
	| "in_person";

export type SendStatus =
	| "queued"
	| "sending"
	| "sent"
	| "delivered"
	| "read"
	| "failed"
	| "skipped"
	| "received";

export type MessageKind = "template" | "session" | "interactive";

export type MessageDirection = "outbound" | "inbound";

export type SupportedLocale = "ru" | "es" | "en" | "de" | "fr" | "pt";

export interface InteractiveButton {
	id: string;
	title: string;
	payload?: string;
}

export interface InteractiveActionPayload {
	type: "button_reply" | "list_reply" | "quick_reply";
	buttonId?: string;
	title?: string;
	description?: string;
}

export interface OutboundMessage {
	channel: Channel;
	toAddress: string; // E.164 phone number, email, or chat ID
	organizationId: string;
	templateKey: string;
	locale?: SupportedLocale | string;
	context?: Record<string, unknown>;
	toName?: string | null;
	patientId?: string | null;
	messageKind?: MessageKind;
	providerTemplateName?: string | null;
	subject?: string | null;
	bodyHtml?: string | null;
	bodyText?: string | null;
	buttons?: InteractiveButton[];
	metadata?: Record<string, unknown>;
}

export interface AdapterResult {
	status: SendStatus;
	provider: string;
	providerMessageId?: string | null;
	errorMessage?: string | null;
	sentAt?: Date | null;
	deliveredAt?: Date | null;
	rawResponse?: Record<string, unknown> | null;
}

export interface ChannelAdapter {
	readonly channel: Channel;
	readonly adapterName: string;
	supports(organizationId: string): Promise<boolean>;
	send(msg: OutboundMessage): Promise<AdapterResult>;
}

export interface KapsoConfig {
	phoneNumberId: string;
	apiKey: string;
	businessAccountId?: string | null;
	webhookSecret?: string | null;
	displayPhoneNumber?: string | null;
	isActive: boolean;
	isVerified?: boolean;
}

export interface InboundWebhookEvent {
	organizationId: string;
	channel: Channel;
	providerMessageId: string;
	fromAddress: string;
	bodyText: string;
	patientId?: string | null;
	occurredAt: Date;
	interactivePayload?: InteractiveActionPayload | null;
	rawPayload?: Record<string, unknown>;
}

export interface DeliveryReceiptEvent {
	organizationId: string;
	providerMessageId: string;
	status: "delivered" | "read" | "failed";
	timestamp: Date;
	errorCode?: string | number | null;
	errorMessage?: string | null;
}

export type RecallStatus =
	| "pending"
	| "contacted_no_answer"
	| "contacted_scheduled"
	| "contacted_declined"
	| "done"
	| "cancelled"
	| "needs_review";

export type RecallPriority = "low" | "normal" | "high";

export interface RecallItem {
	id: string;
	organizationId: string;
	patientId: string;
	dueMonth: string; // YYYY-MM-01
	dueDate?: string | null;
	reason: string;
	reasonNote?: string | null;
	priority: RecallPriority;
	status: RecallStatus;
	contactAttemptCount: number;
	lastContactAttemptAt?: Date | null;
	linkedAppointmentId?: string | null;
	linkedTreatmentId?: string | null;
	linkedTreatmentCategoryKey?: string | null;
	assignedProfessionalId?: string | null;
	completedAt?: Date | null;
	createdAt: Date;
	updatedAt: Date;
}
