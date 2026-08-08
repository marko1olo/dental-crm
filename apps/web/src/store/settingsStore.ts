import type {
	DenteTelegramBotMode,
	DenteTelegramBotStatus,
	DenteTelegramChatLinkListResponse,
	DenteTelegramChatLinkPublic,
	DenteTelegramFeature,
	DenteTelegramLinkCodeCreated,
	DenteTelegramLinkCodeListResponse,
	DenteTelegramLinkCodePublic,
	DenteTelegramMessagePreview,
	DenteTelegramOutboxResponse,
	DenteTelegramPrivacyMode,
	DenteTelegramVisualCardUrls,
} from "@dental/shared";
import { create } from "zustand";
import type {
	DenteTelegramHandoffTarget,
	OnboardingStep,
	TelegramFeaturePlan,
	TelegramLinkSubjectType,
	TelegramOutboxStatusFilter,
	TelegramOutboxTemplateFilter,
} from "../AppConstants";
import { emptyTelegramVisualCardUrlDrafts } from "../utils/draftDefaults";
import {
	defaultUiPreferences,
	loadUiPreferences,
} from "../utils/preferencesUtils";
import {
	defaultTelegramPostVisitCheckupDelayDrafts,
	type TelegramPostVisitCheckupDelayDrafts,
} from "../workspaceStaticOptions";
import { resolveUpdater } from "./updater";

export type ClinicMode =
	| "solo_doctor"
	| "one_chair"
	| "small_clinic"
	| "network_clinic";

export interface SettingsState {
	/**
	 * Режим клиники, каким его знает клиент.
	 *
	 * Здесь стояло `"network_clinic"` с подписью `// default` — то есть до ответа
	 * сервера клиент считал любую клинику сетью филиалов, самым крупным из четырёх
	 * режимов. Неизвестное значение подменялось константой, причём максимальной.
	 *
	 * `null` означает «сервер ещё не сказал». Разделы при этом показываются
	 * целиком (см. lib/clinicCapabilities.ts): отнимать возможности у клиники,
	 * режим которой не известен, нельзя — пропавший раздел выглядит как поломка.
	 *
	 * Источник правды — ответ сервера `clinicSettings.profile.mode`; меняется он
	 * через changeClinicMode (useAppLogic) → POST /api/settings/clinic/mode.
	 * Читать режим для решений следует оттуда через resolveClinicMode.
	 */
	clinicMode: ClinicMode | null;
	onboardingDismissed: any;
	onboardingDismissedAt: string | null;
	onboardingStep: OnboardingStep;
	onboardingDraftMode: any;
	onboardingGuideExpanded: any;
	telegramHandoffNotice: DenteTelegramHandoffTarget | null;
	telegramStatus: DenteTelegramBotStatus | null;
	telegramFeaturePlan: TelegramFeaturePlan | null;
	telegramOutbox: DenteTelegramOutboxResponse | null;
	telegramOutboxStatusFilter: TelegramOutboxStatusFilter;
	telegramOutboxTemplateFilter: TelegramOutboxTemplateFilter;
	telegramLinkCodes: DenteTelegramLinkCodePublic[];
	telegramChatLinks: DenteTelegramChatLinkPublic[];
	telegramLinkCodeLedger: DenteTelegramLinkCodeListResponse | null;
	telegramChatLinkLedger: DenteTelegramChatLinkListResponse | null;
	telegramLinkSubjectType: TelegramLinkSubjectType;
	telegramLinkStaffId: any;
	telegramLinkCode: DenteTelegramLinkCodeCreated | null;
	telegramLinkActionState: string | null;
	telegramPreview: DenteTelegramMessagePreview | null;
	telegramModeDraft: DenteTelegramBotMode;
	telegramBotUsernameDraft: string;
	telegramOwnBotUsernameDraft: string;
	telegramBotConfigId: any;
	telegramWebhookBaseUrlDraft: string;
	telegramPatientPortalBaseUrlDraft: string;
	telegramWelcomeImageUrlDraft: string;
	telegramVisualCardUrlDrafts: DenteTelegramVisualCardUrls;
	telegramReviewUrlDraft: string;
	telegramMapsUrlDraft: string;
	telegramEnabledFeaturesDraft: DenteTelegramFeature[];
	telegramTokenTtlDraft: string;
	telegramReminderLeadTimesDraft: string;
	telegramReviewRequestDelayDraft: string;
	telegramPostVisitCheckupDelayDrafts: TelegramPostVisitCheckupDelayDrafts;
	telegramAllowVoiceIntakeDraft: boolean;
	telegramStaffEscalationChannelDraft: string;
	telegramPrivacyModeDraft: DenteTelegramPrivacyMode;
	telegramSettingsDirty: boolean;
	telegramSettingsSaveState: "idle" | "saving" | "saved" | "error";
	telegramSettingsSaveError: string | null;
	clinicalAdminSecretDraft: string;
	settingsAdminSecretDraft: string;
	scheduleAdminSecretDraft: string;
	telegramAdminSecretDraft: string;
	clinicalAdminSecretSession: string;
	settingsAdminSecretSession: string;
	scheduleAdminSecretSession: string;
	telegramAdminSecretSession: string;
	/**
	 * Сервер отказал в изменении расписания и потребовал секрет администратора.
	 * Пустая строка — не требовал. Поле нужно, чтобы поле секрета появлялось в
	 * ответ на настоящий отказ, а не висело на экране постоянно.
	 */
	scheduleAdminSecretDemand: string;
	telegramSendingItemId: string | null;
	telegramRevokingLinkId: string | null;
}

export interface SettingsActions {
	setClinicMode: (
		val: ClinicMode | null | ((prev: ClinicMode | null) => ClinicMode | null),
	) => void;
	setOnboardingDismissed: (val: any | ((prev: any) => any)) => void;
	setOnboardingDismissedAt: (
		val: string | null | ((prev: string | null) => string | null),
	) => void;
	setOnboardingStep: (
		val: OnboardingStep | ((prev: OnboardingStep) => OnboardingStep),
	) => void;
	setOnboardingDraftMode: (val: any | ((prev: any) => any)) => void;
	setOnboardingGuideExpanded: (val: any | ((prev: any) => any)) => void;
	setTelegramHandoffNotice: (
		val:
			| DenteTelegramHandoffTarget
			| null
			| ((
					prev: DenteTelegramHandoffTarget | null,
			  ) => DenteTelegramHandoffTarget | null),
	) => void;
	setTelegramStatus: (
		val:
			| DenteTelegramBotStatus
			| null
			| ((
					prev: DenteTelegramBotStatus | null,
			  ) => DenteTelegramBotStatus | null),
	) => void;
	setTelegramFeaturePlan: (
		val:
			| TelegramFeaturePlan
			| null
			| ((prev: TelegramFeaturePlan | null) => TelegramFeaturePlan | null),
	) => void;
	setTelegramOutbox: (
		val:
			| DenteTelegramOutboxResponse
			| null
			| ((
					prev: DenteTelegramOutboxResponse | null,
			  ) => DenteTelegramOutboxResponse | null),
	) => void;
	setTelegramOutboxStatusFilter: (
		val:
			| TelegramOutboxStatusFilter
			| ((prev: TelegramOutboxStatusFilter) => TelegramOutboxStatusFilter),
	) => void;
	setTelegramOutboxTemplateFilter: (
		val:
			| TelegramOutboxTemplateFilter
			| ((prev: TelegramOutboxTemplateFilter) => TelegramOutboxTemplateFilter),
	) => void;
	setTelegramLinkCodes: (
		val:
			| DenteTelegramLinkCodePublic[]
			| ((
					prev: DenteTelegramLinkCodePublic[],
			  ) => DenteTelegramLinkCodePublic[]),
	) => void;
	setTelegramChatLinks: (
		val:
			| DenteTelegramChatLinkPublic[]
			| ((
					prev: DenteTelegramChatLinkPublic[],
			  ) => DenteTelegramChatLinkPublic[]),
	) => void;
	setTelegramLinkCodeLedger: (
		val:
			| DenteTelegramLinkCodeListResponse
			| null
			| ((
					prev: DenteTelegramLinkCodeListResponse | null,
			  ) => DenteTelegramLinkCodeListResponse | null),
	) => void;
	setTelegramChatLinkLedger: (
		val:
			| DenteTelegramChatLinkListResponse
			| null
			| ((
					prev: DenteTelegramChatLinkListResponse | null,
			  ) => DenteTelegramChatLinkListResponse | null),
	) => void;
	setTelegramLinkSubjectType: (
		val:
			| TelegramLinkSubjectType
			| ((prev: TelegramLinkSubjectType) => TelegramLinkSubjectType),
	) => void;
	setTelegramLinkStaffId: (val: any | ((prev: any) => any)) => void;
	setTelegramLinkCode: (
		val:
			| DenteTelegramLinkCodeCreated
			| null
			| ((
					prev: DenteTelegramLinkCodeCreated | null,
			  ) => DenteTelegramLinkCodeCreated | null),
	) => void;
	setTelegramLinkActionState: (
		val: string | null | ((prev: string | null) => string | null),
	) => void;
	setTelegramPreview: (
		val:
			| DenteTelegramMessagePreview
			| null
			| ((
					prev: DenteTelegramMessagePreview | null,
			  ) => DenteTelegramMessagePreview | null),
	) => void;
	setTelegramModeDraft: (
		val:
			| DenteTelegramBotMode
			| ((prev: DenteTelegramBotMode) => DenteTelegramBotMode),
	) => void;
	setTelegramBotUsernameDraft: (
		val: string | ((prev: string) => string),
	) => void;
	setTelegramOwnBotUsernameDraft: (
		val: string | ((prev: string) => string),
	) => void;
	setTelegramBotConfigId: (val: any | ((prev: any) => any)) => void;
	setTelegramWebhookBaseUrlDraft: (
		val: string | ((prev: string) => string),
	) => void;
	setTelegramPatientPortalBaseUrlDraft: (
		val: string | ((prev: string) => string),
	) => void;
	setTelegramWelcomeImageUrlDraft: (
		val: string | ((prev: string) => string),
	) => void;
	setTelegramVisualCardUrlDrafts: (
		val:
			| DenteTelegramVisualCardUrls
			| ((prev: DenteTelegramVisualCardUrls) => DenteTelegramVisualCardUrls),
	) => void;
	setTelegramReviewUrlDraft: (val: string | ((prev: string) => string)) => void;
	setTelegramMapsUrlDraft: (val: string | ((prev: string) => string)) => void;
	setTelegramEnabledFeaturesDraft: (
		val:
			| DenteTelegramFeature[]
			| ((prev: DenteTelegramFeature[]) => DenteTelegramFeature[]),
	) => void;
	setTelegramTokenTtlDraft: (val: string | ((prev: string) => string)) => void;
	setTelegramReminderLeadTimesDraft: (
		val: string | ((prev: string) => string),
	) => void;
	setTelegramReviewRequestDelayDraft: (
		val: string | ((prev: string) => string),
	) => void;
	setTelegramPostVisitCheckupDelayDrafts: (
		val:
			| TelegramPostVisitCheckupDelayDrafts
			| ((
					prev: TelegramPostVisitCheckupDelayDrafts,
			  ) => TelegramPostVisitCheckupDelayDrafts),
	) => void;
	setTelegramAllowVoiceIntakeDraft: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	setTelegramStaffEscalationChannelDraft: (
		val: string | ((prev: string) => string),
	) => void;
	setTelegramPrivacyModeDraft: (
		val:
			| DenteTelegramPrivacyMode
			| ((prev: DenteTelegramPrivacyMode) => DenteTelegramPrivacyMode),
	) => void;
	setTelegramSettingsDirty: (
		val: boolean | ((prev: boolean) => boolean),
	) => void;
	setTelegramSettingsSaveState: (
		val:
			| "idle"
			| "saving"
			| "saved"
			| "error"
			| ((
					prev: "idle" | "saving" | "saved" | "error",
			  ) => "idle" | "saving" | "saved" | "error"),
	) => void;
	setTelegramSettingsSaveError: (
		val: string | null | ((prev: string | null) => string | null),
	) => void;
	setClinicalAdminSecretDraft: (
		val: string | ((prev: string) => string),
	) => void;
	setSettingsAdminSecretDraft: (
		val: string | ((prev: string) => string),
	) => void;
	setScheduleAdminSecretDraft: (
		val: string | ((prev: string) => string),
	) => void;
	setTelegramAdminSecretDraft: (
		val: string | ((prev: string) => string),
	) => void;
	setClinicalAdminSecretSession: (
		val: string | ((prev: string) => string),
	) => void;
	setSettingsAdminSecretSession: (
		val: string | ((prev: string) => string),
	) => void;
	setScheduleAdminSecretSession: (
		val: string | ((prev: string) => string),
	) => void;
	setTelegramAdminSecretSession: (
		val: string | ((prev: string) => string),
	) => void;
	setScheduleAdminSecretDemand: (
		val: string | ((prev: string) => string),
	) => void;
	setTelegramSendingItemId: (
		val: string | null | ((prev: string | null) => string | null),
	) => void;
	setTelegramRevokingLinkId: (
		val: string | null | ((prev: string | null) => string | null),
	) => void;
}

const initialSettingsState: SettingsState = {
	clinicMode: null,
	onboardingDismissed: (loadUiPreferences() ?? defaultUiPreferences)
		.onboardingDismissed,
	onboardingDismissedAt: (loadUiPreferences() ?? defaultUiPreferences)
		.onboardingDismissedAt,
	onboardingStep: (loadUiPreferences() ?? defaultUiPreferences).onboardingStep,
	onboardingDraftMode: (loadUiPreferences() ?? defaultUiPreferences)
		.onboardingDraftMode,
	onboardingGuideExpanded: false,
	telegramHandoffNotice: null,
	telegramStatus: null,
	telegramFeaturePlan: null,
	telegramOutbox: null,
	telegramOutboxStatusFilter: (loadUiPreferences() ?? defaultUiPreferences)
		.telegramOutboxStatusFilter,
	telegramOutboxTemplateFilter: (loadUiPreferences() ?? defaultUiPreferences)
		.telegramOutboxTemplateFilter,
	telegramLinkCodes: [],
	telegramChatLinks: [],
	telegramLinkCodeLedger: null,
	telegramChatLinkLedger: null,
	telegramLinkSubjectType: (loadUiPreferences() ?? defaultUiPreferences)
		.telegramLinkSubjectType,
	telegramLinkStaffId:
		(loadUiPreferences() ?? defaultUiPreferences).telegramLinkStaffId ?? "",
	telegramLinkCode: null,
	telegramLinkActionState: null,
	telegramPreview: null,
	telegramModeDraft: "shared_dente_bot",
	telegramBotUsernameDraft: "",
	telegramOwnBotUsernameDraft: "",
	telegramBotConfigId: (loadUiPreferences() ?? defaultUiPreferences)
		.telegramBotConfigId,
	telegramWebhookBaseUrlDraft: "",
	telegramPatientPortalBaseUrlDraft: "",
	telegramWelcomeImageUrlDraft: "",
	telegramVisualCardUrlDrafts: emptyTelegramVisualCardUrlDrafts(),
	telegramReviewUrlDraft: "",
	telegramMapsUrlDraft: "",
	telegramEnabledFeaturesDraft: [],
	telegramTokenTtlDraft: "15",
	telegramReminderLeadTimesDraft: "24",
	telegramReviewRequestDelayDraft: "2",
	telegramPostVisitCheckupDelayDrafts:
		defaultTelegramPostVisitCheckupDelayDrafts,
	telegramAllowVoiceIntakeDraft: false,
	telegramStaffEscalationChannelDraft: "",
	telegramPrivacyModeDraft: "no_phi_by_default",
	telegramSettingsDirty: false,
	telegramSettingsSaveState: "idle",
	telegramSettingsSaveError: null,
	clinicalAdminSecretDraft: "",
	settingsAdminSecretDraft: "",
	scheduleAdminSecretDraft: "",
	telegramAdminSecretDraft: "",
	clinicalAdminSecretSession: "",
	settingsAdminSecretSession: "",
	scheduleAdminSecretSession: "",
	telegramAdminSecretSession: "",
	scheduleAdminSecretDemand: "",
	telegramSendingItemId: null,
	telegramRevokingLinkId: null,
};

export const useSettingsStore = create<SettingsState & SettingsActions>()(
	(set) => ({
		...initialSettingsState,
		setClinicMode: (val) =>
			set((state) => ({ clinicMode: resolveUpdater(val, state.clinicMode) })),
		setOnboardingDismissed: (val) =>
			set((state) => ({
				onboardingDismissed: resolveUpdater(val, state.onboardingDismissed),
			})),
		setOnboardingDismissedAt: (val) =>
			set((state) => ({
				onboardingDismissedAt: resolveUpdater(val, state.onboardingDismissedAt),
			})),
		setOnboardingStep: (val) =>
			set((state) => ({
				onboardingStep: resolveUpdater(val, state.onboardingStep),
			})),
		setOnboardingDraftMode: (val) =>
			set((state) => ({
				onboardingDraftMode: resolveUpdater(val, state.onboardingDraftMode),
			})),
		setOnboardingGuideExpanded: (val) =>
			set((state) => ({
				onboardingGuideExpanded: resolveUpdater(
					val,
					state.onboardingGuideExpanded,
				),
			})),
		setTelegramHandoffNotice: (val) =>
			set((state) => ({
				telegramHandoffNotice: resolveUpdater(val, state.telegramHandoffNotice),
			})),
		setTelegramStatus: (val) =>
			set((state) => ({
				telegramStatus: resolveUpdater(val, state.telegramStatus),
			})),
		setTelegramFeaturePlan: (val) =>
			set((state) => ({
				telegramFeaturePlan: resolveUpdater(val, state.telegramFeaturePlan),
			})),
		setTelegramOutbox: (val) =>
			set((state) => ({
				telegramOutbox: resolveUpdater(val, state.telegramOutbox),
			})),
		setTelegramOutboxStatusFilter: (val) =>
			set((state) => ({
				telegramOutboxStatusFilter: resolveUpdater(
					val,
					state.telegramOutboxStatusFilter,
				),
			})),
		setTelegramOutboxTemplateFilter: (val) =>
			set((state) => ({
				telegramOutboxTemplateFilter: resolveUpdater(
					val,
					state.telegramOutboxTemplateFilter,
				),
			})),
		setTelegramLinkCodes: (val) =>
			set((state) => ({
				telegramLinkCodes: resolveUpdater(val, state.telegramLinkCodes),
			})),
		setTelegramChatLinks: (val) =>
			set((state) => ({
				telegramChatLinks: resolveUpdater(val, state.telegramChatLinks),
			})),
		setTelegramLinkCodeLedger: (val) =>
			set((state) => ({
				telegramLinkCodeLedger: resolveUpdater(
					val,
					state.telegramLinkCodeLedger,
				),
			})),
		setTelegramChatLinkLedger: (val) =>
			set((state) => ({
				telegramChatLinkLedger: resolveUpdater(
					val,
					state.telegramChatLinkLedger,
				),
			})),
		setTelegramLinkSubjectType: (val) =>
			set((state) => ({
				telegramLinkSubjectType: resolveUpdater(
					val,
					state.telegramLinkSubjectType,
				),
			})),
		setTelegramLinkStaffId: (val) =>
			set((state) => ({
				telegramLinkStaffId: resolveUpdater(val, state.telegramLinkStaffId),
			})),
		setTelegramLinkCode: (val) =>
			set((state) => ({
				telegramLinkCode: resolveUpdater(val, state.telegramLinkCode),
			})),
		setTelegramLinkActionState: (val) =>
			set((state) => ({
				telegramLinkActionState: resolveUpdater(
					val,
					state.telegramLinkActionState,
				),
			})),
		setTelegramPreview: (val) =>
			set((state) => ({
				telegramPreview: resolveUpdater(val, state.telegramPreview),
			})),
		setTelegramModeDraft: (val) =>
			set((state) => ({
				telegramModeDraft: resolveUpdater(val, state.telegramModeDraft),
			})),
		setTelegramBotUsernameDraft: (val) =>
			set((state) => ({
				telegramBotUsernameDraft: resolveUpdater(
					val,
					state.telegramBotUsernameDraft,
				),
			})),
		setTelegramOwnBotUsernameDraft: (val) =>
			set((state) => ({
				telegramOwnBotUsernameDraft: resolveUpdater(
					val,
					state.telegramOwnBotUsernameDraft,
				),
			})),
		setTelegramBotConfigId: (val) =>
			set((state) => ({
				telegramBotConfigId: resolveUpdater(val, state.telegramBotConfigId),
			})),
		setTelegramWebhookBaseUrlDraft: (val) =>
			set((state) => ({
				telegramWebhookBaseUrlDraft: resolveUpdater(
					val,
					state.telegramWebhookBaseUrlDraft,
				),
			})),
		setTelegramPatientPortalBaseUrlDraft: (val) =>
			set((state) => ({
				telegramPatientPortalBaseUrlDraft: resolveUpdater(
					val,
					state.telegramPatientPortalBaseUrlDraft,
				),
			})),
		setTelegramWelcomeImageUrlDraft: (val) =>
			set((state) => ({
				telegramWelcomeImageUrlDraft: resolveUpdater(
					val,
					state.telegramWelcomeImageUrlDraft,
				),
			})),
		setTelegramVisualCardUrlDrafts: (val) =>
			set((state) => ({
				telegramVisualCardUrlDrafts: resolveUpdater(
					val,
					state.telegramVisualCardUrlDrafts,
				),
			})),
		setTelegramReviewUrlDraft: (val) =>
			set((state) => ({
				telegramReviewUrlDraft: resolveUpdater(
					val,
					state.telegramReviewUrlDraft,
				),
			})),
		setTelegramMapsUrlDraft: (val) =>
			set((state) => ({
				telegramMapsUrlDraft: resolveUpdater(val, state.telegramMapsUrlDraft),
			})),
		setTelegramEnabledFeaturesDraft: (val) =>
			set((state) => ({
				telegramEnabledFeaturesDraft: resolveUpdater(
					val,
					state.telegramEnabledFeaturesDraft,
				),
			})),
		setTelegramTokenTtlDraft: (val) =>
			set((state) => ({
				telegramTokenTtlDraft: resolveUpdater(val, state.telegramTokenTtlDraft),
			})),
		setTelegramReminderLeadTimesDraft: (val) =>
			set((state) => ({
				telegramReminderLeadTimesDraft: resolveUpdater(
					val,
					state.telegramReminderLeadTimesDraft,
				),
			})),
		setTelegramReviewRequestDelayDraft: (val) =>
			set((state) => ({
				telegramReviewRequestDelayDraft: resolveUpdater(
					val,
					state.telegramReviewRequestDelayDraft,
				),
			})),
		setTelegramPostVisitCheckupDelayDrafts: (val) =>
			set((state) => ({
				telegramPostVisitCheckupDelayDrafts: resolveUpdater(
					val,
					state.telegramPostVisitCheckupDelayDrafts,
				),
			})),
		setTelegramAllowVoiceIntakeDraft: (val) =>
			set((state) => ({
				telegramAllowVoiceIntakeDraft: resolveUpdater(
					val,
					state.telegramAllowVoiceIntakeDraft,
				),
			})),
		setTelegramStaffEscalationChannelDraft: (val) =>
			set((state) => ({
				telegramStaffEscalationChannelDraft: resolveUpdater(
					val,
					state.telegramStaffEscalationChannelDraft,
				),
			})),
		setTelegramPrivacyModeDraft: (val) =>
			set((state) => ({
				telegramPrivacyModeDraft: resolveUpdater(
					val,
					state.telegramPrivacyModeDraft,
				),
			})),
		setTelegramSettingsDirty: (val) =>
			set((state) => ({
				telegramSettingsDirty: resolveUpdater(val, state.telegramSettingsDirty),
			})),
		setTelegramSettingsSaveState: (val) =>
			set((state) => ({
				telegramSettingsSaveState: resolveUpdater(
					val,
					state.telegramSettingsSaveState,
				),
			})),
		setTelegramSettingsSaveError: (val) =>
			set((state) => ({
				telegramSettingsSaveError: resolveUpdater(
					val,
					state.telegramSettingsSaveError,
				),
			})),
		setClinicalAdminSecretDraft: (val) =>
			set((state) => ({
				clinicalAdminSecretDraft: resolveUpdater(
					val,
					state.clinicalAdminSecretDraft,
				),
			})),
		setSettingsAdminSecretDraft: (val) =>
			set((state) => ({
				settingsAdminSecretDraft: resolveUpdater(
					val,
					state.settingsAdminSecretDraft,
				),
			})),
		setScheduleAdminSecretDraft: (val) =>
			set((state) => ({
				scheduleAdminSecretDraft: resolveUpdater(
					val,
					state.scheduleAdminSecretDraft,
				),
			})),
		setTelegramAdminSecretDraft: (val) =>
			set((state) => ({
				telegramAdminSecretDraft: resolveUpdater(
					val,
					state.telegramAdminSecretDraft,
				),
			})),
		setClinicalAdminSecretSession: (val) =>
			set((state) => ({
				clinicalAdminSecretSession: resolveUpdater(
					val,
					state.clinicalAdminSecretSession,
				),
			})),
		setSettingsAdminSecretSession: (val) =>
			set((state) => ({
				settingsAdminSecretSession: resolveUpdater(
					val,
					state.settingsAdminSecretSession,
				),
			})),
		setScheduleAdminSecretSession: (val) =>
			set((state) => ({
				scheduleAdminSecretSession: resolveUpdater(
					val,
					state.scheduleAdminSecretSession,
				),
			})),
		setTelegramAdminSecretSession: (val) =>
			set((state) => ({
				telegramAdminSecretSession: resolveUpdater(
					val,
					state.telegramAdminSecretSession,
				),
			})),
		setScheduleAdminSecretDemand: (val) =>
			set((state) => ({
				scheduleAdminSecretDemand: resolveUpdater(
					val,
					state.scheduleAdminSecretDemand,
				),
			})),
		setTelegramSendingItemId: (val) =>
			set((state) => ({
				telegramSendingItemId: resolveUpdater(val, state.telegramSendingItemId),
			})),
		setTelegramRevokingLinkId: (val) =>
			set((state) => ({
				telegramRevokingLinkId: resolveUpdater(
					val,
					state.telegramRevokingLinkId,
				),
			})),
	}),
);
