/**
 * types.ts
 *
 * Types, DTOs and contracts for legacy memory store.
 */

import type {
	AppointmentStatus,
	DenteTelegramBotSettings,
	DenteTelegramChatLinkStatus,
	DenteTelegramLinkCodeStatus,
	DenteTelegramOutboxDeliveryStatus,
	DenteTelegramTemplateKind,
} from "@dental/shared";
import type { DomainState } from "../../../types/domainState.js";
export type { DomainState };

export type DenteTelegramPortalSection =
	| "home"
	| "documents"
	| "tax"
	| "care"
	| "schedule"
	| "billing";

export type DenteTelegramOutboxRuntimeScope = {
	settings: DenteTelegramBotSettings;
	botTokenConfigured?: boolean;
	botConfigId?: string | null;
	clinicId?: string | null;
};

export type ResolvedDenteTelegramOutboxRuntimeScope = {
	settings: DenteTelegramBotSettings;
	botTokenConfigured: boolean;
	botConfigId: string;
	clinicId: string;
};


export type DenteTelegramLinkCodeListStatusFilter =
	| DenteTelegramLinkCodeStatus
	| "all";

export type DenteTelegramChatLinkListStatusFilter =
	| DenteTelegramChatLinkStatus
	| "all";

export type BuildDenteTelegramLinkCodeListOptions = {
	limit?: number;
	cursor?: string | null;
	status?: DenteTelegramLinkCodeListStatusFilter;
	subjectType?: "patient" | "staff" | "all";
	subjectId?: string | null;
	organizationId?: string | null;
	clinicId?: string | null;
	botConfigId?: string | null;
};

export type BuildDenteTelegramChatLinkListOptions = {
	limit?: number;
	cursor?: string | null;
	status?: DenteTelegramChatLinkListStatusFilter;
	subjectType?: "patient" | "staff" | "all";
	subjectId?: string | null;
	organizationId?: string | null;
	clinicId?: string | null;
	botConfigId?: string | null;
};

export type NormalizedDenteTelegramLedgerOptions<TStatus extends string> = {
	limit: number;
	cursor: string;
	status: TStatus;
	subjectType: "patient" | "staff" | "all";
	subjectId: string | null;
	organizationId: string;
	clinicId: string;
	botConfigId: string;
};

export interface TelegramMessageContext {
	clinicName: string;
	appointmentTime?: string;
	hasAppointment: boolean;
	portalUrl: string | null;
	reviewUrl: string | null;
	mapsUrl: string | null;
	staffRoleLabel?: string;
	appointmentCount?: number;
	openTaskCount?: number;
	urgentTaskCount?: number;
}

export type DenteTelegramAppointmentCallbackAction =
	| "confirm"
	| "reschedule"
	| "call_request";

export type DenteTelegramAppointmentCallbackScope = {
	organizationId?: string | null;
	clinicId?: string | null;
	botConfigId?: string | null;
};


export type DenteTelegramDocumentRequestTopic =
	| "tax"
	| "billing"
	| "medical"
	| "patientForms";

export type DenteTelegramCareRequestTopic =
	| "extraction"
	| "implant"
	| "filling"
	| "endo"
	| "surgery"
	| "anesthesia"
	| "hygiene"
	| "prosthetics"
	| "orthodontics"
	| "periodontology";


export type DenteTelegramOutboxStatusFilter =
	| DenteTelegramOutboxDeliveryStatus
	| "all"
	| "due";

export type BuildDenteTelegramOutboxOptions = {
	limit?: number;
	cursor?: string | null;
	status?: DenteTelegramOutboxStatusFilter;
	templateKind?: DenteTelegramTemplateKind | "all";
};

export type NormalizedDenteTelegramOutboxOptions = {
	limit: number;
	cursor: string;
	status: DenteTelegramOutboxStatusFilter;
	templateKind: DenteTelegramTemplateKind | "all";
};

export type TelegramBotDialogStep =
	| "idle"
	| "menu"
	| "awaiting_link_code"
	| "awaiting_appointment_choice"
	| "awaiting_reschedule_reason"
	| "awaiting_callback_phone"
	| "awaiting_feedback"
	| "awaiting_care_topic"
	| "awaiting_doc_type"
	| (string & {});

export type TelegramBotDialogSession = {
	sessionId: string;
	organizationId: string;
	clinicId: string | null;
	botConfigId: string;
	chatFingerprint: string;
	chatId: string | null;
	subjectType: "patient" | "staff" | "unknown";
	subjectId: string | null;
	currentStep: TelegramBotDialogStep;
	lastCommand: string | null;
	lastMessageText: string | null;
	metadata: Record<string, unknown>;
	createdAt: number;
	lastActiveAt: number;
	expiresAt: number;
};

export type SetTelegramBotDialogSessionInput = {
	organizationId: string;
	clinicId?: string | null;
	botConfigId?: string | null;
	chatFingerprint: string;
	chatId?: string | null;
	subjectType?: "patient" | "staff" | "unknown";
	subjectId?: string | null;
	currentStep?: TelegramBotDialogStep;
	lastCommand?: string | null;
	lastMessageText?: string | null;
	metadata?: Record<string, unknown>;
	ttlMs?: number;
};
