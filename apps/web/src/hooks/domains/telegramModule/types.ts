import type {
	DenteTelegramChatLinkListResponse,
	DenteTelegramLinkCodeCreated,
	DenteTelegramLinkCodeListResponse,
	DenteTelegramMessagePreview,
	DenteTelegramOutboxResponse,
	DenteTelegramOutboxSendDueResponse,
	DenteTelegramOutboxSendResponse,
} from "@dental/shared";
import type React from "react";
import type { DenteTelegramHandoffTarget } from "../../../AppConstants";
import type { useTelegramSettings } from "../../useTelegramSettings";

export type UseTelegramModuleOptions = {
	settingsAdminSecretSession?: string | null;
	loadDashboard: () => Promise<void>;
	setError: (error: string | null) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	dashboard: any;
	currentView: string;
	settingsTab: string;
	onboardingDismissed: boolean;
	onboardingStep: string;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	activePatient: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	activeDoctor: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	activeAppointment: any;
	uiPreferencesHydrated: boolean;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setCurrentView: (view: any) => void;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	setSelectedDocumentKind: (kind: any) => void;
};

export type UseTelegramBotSettingsOptions = UseTelegramModuleOptions & {
	telegramSettingsModule?: ReturnType<typeof useTelegramSettings>;
};

export type UseTelegramBotSettingsResult = {
	telegramSettingsModule: ReturnType<typeof useTelegramSettings>;
	appendTelegramRuntimeScopeParams: (params: URLSearchParams) => URLSearchParams;
	telegramOutboxActionQueryString: () => string;
	initialTelegramHandoffTargetRef: React.RefObject<DenteTelegramHandoffTarget | null>;
};

export type UseTelegramPatientNotificationsOptions = {
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	dashboard: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	activePatient: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	activeDoctor: any;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	activeAppointment: any;
	setError: (error: string | null) => void;
	telegramControlPlaneHeaders: (
		headers?: Record<string, string>,
		secretOverride?: string | null,
	) => Record<string, string>;
	loadTelegramControlPlane: (options?: { silent?: boolean }) => Promise<void>;
	parseTelegramLinkTtlMinutes: () => number;
	telegramLinkCodeLedgerRequestParams: (cursor?: string) => URLSearchParams;
	telegramChatLinkLedgerRequestParams: (cursor?: string) => URLSearchParams;
	telegramOutboxActionQueryString: () => string;
};

export type UseTelegramPatientNotificationsResult = {
	createTelegramLinkCode: () => Promise<void>;
	copyTelegramTextToClipboard: (
		value: string | null | undefined,
		label: string,
	) => Promise<void>;
	downloadTelegramQrSvg: () => void;
	revokeTelegramChatLink: (linkId: string) => Promise<void>;
	previewTelegramTemplate: (
		templateKind: DenteTelegramMessagePreview["templateKind"],
	) => Promise<void>;
	loadMoreTelegramLinkCodes: () => Promise<void>;
	loadMoreTelegramChatLinks: () => Promise<void>;
};

export type UseTelegramBroadcastCampaignsOptions = {
	loadDashboard: () => Promise<void>;
	setError: (error: string | null) => void;
	telegramControlPlaneHeaders: (
		headers?: Record<string, string>,
		secretOverride?: string | null,
	) => Record<string, string>;
	loadTelegramControlPlane: (options?: { silent?: boolean }) => Promise<void>;
	telegramOutboxRequestParams: (cursor?: string) => URLSearchParams;
	telegramOutboxActionQueryString: () => string;
};

export type UseTelegramBroadcastCampaignsResult = {
	loadMoreTelegramOutbox: () => Promise<void>;
	sendTelegramOutboxItem: (itemId: string) => Promise<void>;
	sendDueTelegramOutbox: () => Promise<void>;
};

export type UseTelegramModuleResult = {
	telegramSettingsModule: ReturnType<typeof useTelegramSettings>;
	loadMoreTelegramOutbox: () => Promise<void>;
	loadMoreTelegramLinkCodes: () => Promise<void>;
	loadMoreTelegramChatLinks: () => Promise<void>;
	createTelegramLinkCode: () => Promise<void>;
	copyTelegramTextToClipboard: (
		value: string | null | undefined,
		label: string,
	) => Promise<void>;
	downloadTelegramQrSvg: () => void;
	revokeTelegramChatLink: (linkId: string) => Promise<void>;
	previewTelegramTemplate: (
		templateKind: DenteTelegramMessagePreview["templateKind"],
	) => Promise<void>;
	sendTelegramOutboxItem: (itemId: string) => Promise<void>;
	sendDueTelegramOutbox: () => Promise<void>;
};

/**
 * Domain definitions for Telegram broadcast campaigns, triggers and Mini App booking
 */
export type TelegramBroadcastSegment =
	| "all"
	| "active_patients"
	| "debtors"
	| "rehab_due"
	| "birthday_today";

export type TelegramNotificationTriggerKind =
	| "appointment_reminder"
	| "appointment_confirmation"
	| "post_visit_checkup"
	| "review_request"
	| "birthday_greeting"
	| "staff_daily_digest";

export type TelegramMiniAppBookingSlot = {
	doctorId: string;
	serviceId: string;
	startTimeIso: string;
	endTimeIso: string;
	chairId?: string;
};

export type TelegramMiniAppBookingPayload = {
	patientTelegramChatId: string;
	patientPhone: string;
	patientFullName: string;
	selectedSlot: TelegramMiniAppBookingSlot;
	initialComplaintToothFdi?: number;
	initialComplaintText?: string;
};
