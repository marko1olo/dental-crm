import type {
	Appointment,
	Dashboard,
	DenteTelegramChatLinkListResponse,
	DenteTelegramLinkCodeCreated,
	DenteTelegramLinkCodeListResponse,
	DenteTelegramMessagePreview,
	DenteTelegramOutboxResponse,
	DenteTelegramOutboxSendDueResponse,
	DenteTelegramOutboxSendResponse,
	Patient,
} from "@dental/shared";
import type React from "react";
import type { DenteTelegramHandoffTarget } from "../../../AppConstants";
import type { useTelegramSettings } from "../../useTelegramSettings";
import type { AppView } from "../../../utils/routeUtils";

export type UseTelegramModuleOptions = {
	settingsAdminSecretSession?: string | null | undefined;
	loadDashboard: () => Promise<void>;
	setError: (error: string | null) => void;
	dashboard?: Dashboard | null | undefined;
	currentView: string;
	settingsTab: string;
	onboardingDismissed: boolean;
	onboardingStep: string;
	activePatient?: Patient | { id: string; [key: string]: unknown } | null | undefined;
	activeDoctor?: { id: string; [key: string]: unknown } | null | undefined;
	activeAppointment?: Appointment | { id: string; [key: string]: unknown } | null | undefined;
	uiPreferencesHydrated: boolean;
	setCurrentView: (view: AppView) => void;
	setSelectedDocumentKind: (kind: string | null) => void;
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
	dashboard?: Dashboard | null | undefined;
	activePatient?: Patient | { id: string; [key: string]: unknown } | null | undefined;
	activeDoctor?: { id: string; [key: string]: unknown } | null | undefined;
	activeAppointment?: Appointment | { id: string; [key: string]: unknown } | null | undefined;
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
