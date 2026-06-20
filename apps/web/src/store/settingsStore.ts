import { type TelegramPostVisitCheckupDelayDrafts, defaultTelegramPostVisitCheckupDelayDrafts } from "../workspaceStaticOptions";

import {
  type TelegramFeaturePlan,
  type TelegramOutboxStatusFilter,
  type TelegramOutboxTemplateFilter,
  type TelegramLinkSubjectType,
    type DenteTelegramHandoffTarget,
  type OnboardingStep,
  loadUiPreferences, defaultUiPreferences, emptyTelegramVisualCardUrlDrafts, } from "../AppHelpers";

import { 
   
  DenteTelegramBotStatus, 
  
  DenteTelegramOutboxResponse,
  
  
  DenteTelegramLinkCodePublic,
  DenteTelegramChatLinkPublic,
  DenteTelegramLinkCodeListResponse,
  DenteTelegramChatLinkListResponse,
  
  DenteTelegramLinkCodeCreated,
  DenteTelegramMessagePreview,
  DenteTelegramBotMode,
  DenteTelegramVisualCardUrls,
  DenteTelegramFeature,
  DenteTelegramPrivacyMode,
  
} from "@dental/shared";


// Hardcoded fallback for missing variables that were removed from AppHelpers

import { create } from "zustand";
 // assume this might be needed

export interface SettingsState {
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
  telegramSendingItemId: string | null;
  telegramRevokingLinkId: string | null;

}

export interface SettingsActions {
  setOnboardingDismissed: (val: any | ((prev: any) => any)) => void;
  setOnboardingDismissedAt: (val: string | null | ((prev: string | null) => string | null)) => void;
  setOnboardingStep: (val: OnboardingStep | ((prev: OnboardingStep) => OnboardingStep)) => void;
  setOnboardingDraftMode: (val: any | ((prev: any) => any)) => void;
  setOnboardingGuideExpanded: (val: any | ((prev: any) => any)) => void;
  setTelegramHandoffNotice: (val: DenteTelegramHandoffTarget | null | ((prev: DenteTelegramHandoffTarget | null) => DenteTelegramHandoffTarget | null)) => void;
  setTelegramStatus: (val: DenteTelegramBotStatus | null | ((prev: DenteTelegramBotStatus | null) => DenteTelegramBotStatus | null)) => void;
  setTelegramFeaturePlan: (val: TelegramFeaturePlan | null | ((prev: TelegramFeaturePlan | null) => TelegramFeaturePlan | null)) => void;
  setTelegramOutbox: (val: DenteTelegramOutboxResponse | null | ((prev: DenteTelegramOutboxResponse | null) => DenteTelegramOutboxResponse | null)) => void;
  setTelegramOutboxStatusFilter: (val: TelegramOutboxStatusFilter | ((prev: TelegramOutboxStatusFilter) => TelegramOutboxStatusFilter)) => void;
  setTelegramOutboxTemplateFilter: (val: TelegramOutboxTemplateFilter | ((prev: TelegramOutboxTemplateFilter) => TelegramOutboxTemplateFilter)) => void;
  setTelegramLinkCodes: (val: DenteTelegramLinkCodePublic[] | ((prev: DenteTelegramLinkCodePublic[]) => DenteTelegramLinkCodePublic[])) => void;
  setTelegramChatLinks: (val: DenteTelegramChatLinkPublic[] | ((prev: DenteTelegramChatLinkPublic[]) => DenteTelegramChatLinkPublic[])) => void;
  setTelegramLinkCodeLedger: (val: DenteTelegramLinkCodeListResponse | null | ((prev: DenteTelegramLinkCodeListResponse | null) => DenteTelegramLinkCodeListResponse | null)) => void;
  setTelegramChatLinkLedger: (val: DenteTelegramChatLinkListResponse | null | ((prev: DenteTelegramChatLinkListResponse | null) => DenteTelegramChatLinkListResponse | null)) => void;
  setTelegramLinkSubjectType: (val: TelegramLinkSubjectType | ((prev: TelegramLinkSubjectType) => TelegramLinkSubjectType)) => void;
  setTelegramLinkStaffId: (val: any | ((prev: any) => any)) => void;
  setTelegramLinkCode: (val: DenteTelegramLinkCodeCreated | null | ((prev: DenteTelegramLinkCodeCreated | null) => DenteTelegramLinkCodeCreated | null)) => void;
  setTelegramLinkActionState: (val: string | null | ((prev: string | null) => string | null)) => void;
  setTelegramPreview: (val: DenteTelegramMessagePreview | null | ((prev: DenteTelegramMessagePreview | null) => DenteTelegramMessagePreview | null)) => void;
  setTelegramModeDraft: (val: DenteTelegramBotMode | ((prev: DenteTelegramBotMode) => DenteTelegramBotMode)) => void;
  setTelegramBotUsernameDraft: (val: string | ((prev: string) => string)) => void;
  setTelegramOwnBotUsernameDraft: (val: string | ((prev: string) => string)) => void;
  setTelegramBotConfigId: (val: any | ((prev: any) => any)) => void;
  setTelegramWebhookBaseUrlDraft: (val: string | ((prev: string) => string)) => void;
  setTelegramPatientPortalBaseUrlDraft: (val: string | ((prev: string) => string)) => void;
  setTelegramWelcomeImageUrlDraft: (val: string | ((prev: string) => string)) => void;
  setTelegramVisualCardUrlDrafts: (val: DenteTelegramVisualCardUrls | ((prev: DenteTelegramVisualCardUrls) => DenteTelegramVisualCardUrls)) => void;
  setTelegramReviewUrlDraft: (val: string | ((prev: string) => string)) => void;
  setTelegramMapsUrlDraft: (val: string | ((prev: string) => string)) => void;
  setTelegramEnabledFeaturesDraft: (val: DenteTelegramFeature[] | ((prev: DenteTelegramFeature[]) => DenteTelegramFeature[])) => void;
  setTelegramTokenTtlDraft: (val: string | ((prev: string) => string)) => void;
  setTelegramReminderLeadTimesDraft: (val: string | ((prev: string) => string)) => void;
  setTelegramReviewRequestDelayDraft: (val: string | ((prev: string) => string)) => void;
  setTelegramPostVisitCheckupDelayDrafts: (val: TelegramPostVisitCheckupDelayDrafts | ((prev: TelegramPostVisitCheckupDelayDrafts) => TelegramPostVisitCheckupDelayDrafts)) => void;
  setTelegramAllowVoiceIntakeDraft: (val: boolean | ((prev: boolean) => boolean)) => void;
  setTelegramStaffEscalationChannelDraft: (val: string | ((prev: string) => string)) => void;
  setTelegramPrivacyModeDraft: (val: DenteTelegramPrivacyMode | ((prev: DenteTelegramPrivacyMode) => DenteTelegramPrivacyMode)) => void;
  setTelegramSettingsDirty: (val: boolean | ((prev: boolean) => boolean)) => void;
  setTelegramSettingsSaveState: (val: "idle" | "saving" | "saved" | "error" | ((prev: "idle" | "saving" | "saved" | "error") => "idle" | "saving" | "saved" | "error")) => void;
  setTelegramSettingsSaveError: (val: string | null | ((prev: string | null) => string | null)) => void;
  setClinicalAdminSecretDraft: (val: string | ((prev: string) => string)) => void;
  setSettingsAdminSecretDraft: (val: string | ((prev: string) => string)) => void;
  setScheduleAdminSecretDraft: (val: string | ((prev: string) => string)) => void;
  setTelegramAdminSecretDraft: (val: string | ((prev: string) => string)) => void;
  setClinicalAdminSecretSession: (val: string | ((prev: string) => string)) => void;
  setSettingsAdminSecretSession: (val: string | ((prev: string) => string)) => void;
  setScheduleAdminSecretSession: (val: string | ((prev: string) => string)) => void;
  setTelegramAdminSecretSession: (val: string | ((prev: string) => string)) => void;
  setTelegramSendingItemId: (val: string | null | ((prev: string | null) => string | null)) => void;
  setTelegramRevokingLinkId: (val: string | null | ((prev: string | null) => string | null)) => void;

}

const initialSettingsState: SettingsState = {
  onboardingDismissed: (loadUiPreferences() ?? defaultUiPreferences).onboardingDismissed,
  onboardingDismissedAt: (loadUiPreferences() ?? defaultUiPreferences).onboardingDismissedAt,
  onboardingStep: (loadUiPreferences() ?? defaultUiPreferences).onboardingStep,
  onboardingDraftMode: (loadUiPreferences() ?? defaultUiPreferences).onboardingDraftMode,
  onboardingGuideExpanded: false,
  telegramHandoffNotice: null,
  telegramStatus: null,
  telegramFeaturePlan: null,
  telegramOutbox: null,
  telegramOutboxStatusFilter: (loadUiPreferences() ?? defaultUiPreferences).telegramOutboxStatusFilter,
  telegramOutboxTemplateFilter: (loadUiPreferences() ?? defaultUiPreferences).telegramOutboxTemplateFilter,
  telegramLinkCodes: [],
  telegramChatLinks: [],
  telegramLinkCodeLedger: null,
  telegramChatLinkLedger: null,
  telegramLinkSubjectType: (loadUiPreferences() ?? defaultUiPreferences).telegramLinkSubjectType,
  telegramLinkStaffId: (loadUiPreferences() ?? defaultUiPreferences).telegramLinkStaffId ?? "",
  telegramLinkCode: null,
  telegramLinkActionState: null,
  telegramPreview: null,
  telegramModeDraft: "shared_dente_bot",
  telegramBotUsernameDraft: "",
  telegramOwnBotUsernameDraft: "",
  telegramBotConfigId: (loadUiPreferences() ?? defaultUiPreferences).telegramBotConfigId,
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
  telegramPostVisitCheckupDelayDrafts: defaultTelegramPostVisitCheckupDelayDrafts,
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
  telegramSendingItemId: null,
  telegramRevokingLinkId: null,

};

export const useSettingsStore = create<SettingsState & SettingsActions>()((set) => ({
  ...initialSettingsState,
  setOnboardingDismissed: (val) => set((state) => ({ onboardingDismissed: typeof val === 'function' ? (val as any)(state.onboardingDismissed) : val })),
  setOnboardingDismissedAt: (val) => set((state) => ({ onboardingDismissedAt: typeof val === 'function' ? (val as any)(state.onboardingDismissedAt) : val })),
  setOnboardingStep: (val) => set((state) => ({ onboardingStep: typeof val === 'function' ? (val as any)(state.onboardingStep) : val })),
  setOnboardingDraftMode: (val) => set((state) => ({ onboardingDraftMode: typeof val === 'function' ? (val as any)(state.onboardingDraftMode) : val })),
  setOnboardingGuideExpanded: (val) => set((state) => ({ onboardingGuideExpanded: typeof val === 'function' ? (val as any)(state.onboardingGuideExpanded) : val })),
  setTelegramHandoffNotice: (val) => set((state) => ({ telegramHandoffNotice: typeof val === 'function' ? (val as any)(state.telegramHandoffNotice) : val })),
  setTelegramStatus: (val) => set((state) => ({ telegramStatus: typeof val === 'function' ? (val as any)(state.telegramStatus) : val })),
  setTelegramFeaturePlan: (val) => set((state) => ({ telegramFeaturePlan: typeof val === 'function' ? (val as any)(state.telegramFeaturePlan) : val })),
  setTelegramOutbox: (val) => set((state) => ({ telegramOutbox: typeof val === 'function' ? (val as any)(state.telegramOutbox) : val })),
  setTelegramOutboxStatusFilter: (val) => set((state) => ({ telegramOutboxStatusFilter: typeof val === 'function' ? (val as any)(state.telegramOutboxStatusFilter) : val })),
  setTelegramOutboxTemplateFilter: (val) => set((state) => ({ telegramOutboxTemplateFilter: typeof val === 'function' ? (val as any)(state.telegramOutboxTemplateFilter) : val })),
  setTelegramLinkCodes: (val) => set((state) => ({ telegramLinkCodes: typeof val === 'function' ? (val as any)(state.telegramLinkCodes) : val })),
  setTelegramChatLinks: (val) => set((state) => ({ telegramChatLinks: typeof val === 'function' ? (val as any)(state.telegramChatLinks) : val })),
  setTelegramLinkCodeLedger: (val) => set((state) => ({ telegramLinkCodeLedger: typeof val === 'function' ? (val as any)(state.telegramLinkCodeLedger) : val })),
  setTelegramChatLinkLedger: (val) => set((state) => ({ telegramChatLinkLedger: typeof val === 'function' ? (val as any)(state.telegramChatLinkLedger) : val })),
  setTelegramLinkSubjectType: (val) => set((state) => ({ telegramLinkSubjectType: typeof val === 'function' ? (val as any)(state.telegramLinkSubjectType) : val })),
  setTelegramLinkStaffId: (val) => set((state) => ({ telegramLinkStaffId: typeof val === 'function' ? (val as any)(state.telegramLinkStaffId) : val })),
  setTelegramLinkCode: (val) => set((state) => ({ telegramLinkCode: typeof val === 'function' ? (val as any)(state.telegramLinkCode) : val })),
  setTelegramLinkActionState: (val) => set((state) => ({ telegramLinkActionState: typeof val === 'function' ? (val as any)(state.telegramLinkActionState) : val })),
  setTelegramPreview: (val) => set((state) => ({ telegramPreview: typeof val === 'function' ? (val as any)(state.telegramPreview) : val })),
  setTelegramModeDraft: (val) => set((state) => ({ telegramModeDraft: typeof val === 'function' ? (val as any)(state.telegramModeDraft) : val })),
  setTelegramBotUsernameDraft: (val) => set((state) => ({ telegramBotUsernameDraft: typeof val === 'function' ? (val as any)(state.telegramBotUsernameDraft) : val })),
  setTelegramOwnBotUsernameDraft: (val) => set((state) => ({ telegramOwnBotUsernameDraft: typeof val === 'function' ? (val as any)(state.telegramOwnBotUsernameDraft) : val })),
  setTelegramBotConfigId: (val) => set((state) => ({ telegramBotConfigId: typeof val === 'function' ? (val as any)(state.telegramBotConfigId) : val })),
  setTelegramWebhookBaseUrlDraft: (val) => set((state) => ({ telegramWebhookBaseUrlDraft: typeof val === 'function' ? (val as any)(state.telegramWebhookBaseUrlDraft) : val })),
  setTelegramPatientPortalBaseUrlDraft: (val) => set((state) => ({ telegramPatientPortalBaseUrlDraft: typeof val === 'function' ? (val as any)(state.telegramPatientPortalBaseUrlDraft) : val })),
  setTelegramWelcomeImageUrlDraft: (val) => set((state) => ({ telegramWelcomeImageUrlDraft: typeof val === 'function' ? (val as any)(state.telegramWelcomeImageUrlDraft) : val })),
  setTelegramVisualCardUrlDrafts: (val) => set((state) => ({ telegramVisualCardUrlDrafts: typeof val === 'function' ? (val as any)(state.telegramVisualCardUrlDrafts) : val })),
  setTelegramReviewUrlDraft: (val) => set((state) => ({ telegramReviewUrlDraft: typeof val === 'function' ? (val as any)(state.telegramReviewUrlDraft) : val })),
  setTelegramMapsUrlDraft: (val) => set((state) => ({ telegramMapsUrlDraft: typeof val === 'function' ? (val as any)(state.telegramMapsUrlDraft) : val })),
  setTelegramEnabledFeaturesDraft: (val) => set((state) => ({ telegramEnabledFeaturesDraft: typeof val === 'function' ? (val as any)(state.telegramEnabledFeaturesDraft) : val })),
  setTelegramTokenTtlDraft: (val) => set((state) => ({ telegramTokenTtlDraft: typeof val === 'function' ? (val as any)(state.telegramTokenTtlDraft) : val })),
  setTelegramReminderLeadTimesDraft: (val) => set((state) => ({ telegramReminderLeadTimesDraft: typeof val === 'function' ? (val as any)(state.telegramReminderLeadTimesDraft) : val })),
  setTelegramReviewRequestDelayDraft: (val) => set((state) => ({ telegramReviewRequestDelayDraft: typeof val === 'function' ? (val as any)(state.telegramReviewRequestDelayDraft) : val })),
  setTelegramPostVisitCheckupDelayDrafts: (val) => set((state) => ({ telegramPostVisitCheckupDelayDrafts: typeof val === 'function' ? (val as any)(state.telegramPostVisitCheckupDelayDrafts) : val })),
  setTelegramAllowVoiceIntakeDraft: (val) => set((state) => ({ telegramAllowVoiceIntakeDraft: typeof val === 'function' ? (val as any)(state.telegramAllowVoiceIntakeDraft) : val })),
  setTelegramStaffEscalationChannelDraft: (val) => set((state) => ({ telegramStaffEscalationChannelDraft: typeof val === 'function' ? (val as any)(state.telegramStaffEscalationChannelDraft) : val })),
  setTelegramPrivacyModeDraft: (val) => set((state) => ({ telegramPrivacyModeDraft: typeof val === 'function' ? (val as any)(state.telegramPrivacyModeDraft) : val })),
  setTelegramSettingsDirty: (val) => set((state) => ({ telegramSettingsDirty: typeof val === 'function' ? (val as any)(state.telegramSettingsDirty) : val })),
  setTelegramSettingsSaveState: (val) => set((state) => ({ telegramSettingsSaveState: typeof val === 'function' ? (val as any)(state.telegramSettingsSaveState) : val })),
  setTelegramSettingsSaveError: (val) => set((state) => ({ telegramSettingsSaveError: typeof val === 'function' ? (val as any)(state.telegramSettingsSaveError) : val })),
  setClinicalAdminSecretDraft: (val) => set((state) => ({ clinicalAdminSecretDraft: typeof val === 'function' ? (val as any)(state.clinicalAdminSecretDraft) : val })),
  setSettingsAdminSecretDraft: (val) => set((state) => ({ settingsAdminSecretDraft: typeof val === 'function' ? (val as any)(state.settingsAdminSecretDraft) : val })),
  setScheduleAdminSecretDraft: (val) => set((state) => ({ scheduleAdminSecretDraft: typeof val === 'function' ? (val as any)(state.scheduleAdminSecretDraft) : val })),
  setTelegramAdminSecretDraft: (val) => set((state) => ({ telegramAdminSecretDraft: typeof val === 'function' ? (val as any)(state.telegramAdminSecretDraft) : val })),
  setClinicalAdminSecretSession: (val) => set((state) => ({ clinicalAdminSecretSession: typeof val === 'function' ? (val as any)(state.clinicalAdminSecretSession) : val })),
  setSettingsAdminSecretSession: (val) => set((state) => ({ settingsAdminSecretSession: typeof val === 'function' ? (val as any)(state.settingsAdminSecretSession) : val })),
  setScheduleAdminSecretSession: (val) => set((state) => ({ scheduleAdminSecretSession: typeof val === 'function' ? (val as any)(state.scheduleAdminSecretSession) : val })),
  setTelegramAdminSecretSession: (val) => set((state) => ({ telegramAdminSecretSession: typeof val === 'function' ? (val as any)(state.telegramAdminSecretSession) : val })),
  setTelegramSendingItemId: (val) => set((state) => ({ telegramSendingItemId: typeof val === 'function' ? (val as any)(state.telegramSendingItemId) : val })),
  setTelegramRevokingLinkId: (val) => set((state) => ({ telegramRevokingLinkId: typeof val === 'function' ? (val as any)(state.telegramRevokingLinkId) : val })),

}));
