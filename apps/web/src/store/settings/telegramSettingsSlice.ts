/**
 * DENTE CRM — Telegram Bot & Outbox Settings Slice
 */

import { emptyTelegramVisualCardUrlDrafts } from "../../utils/draftDefaults.js";
import { defaultUiPreferences, loadUiPreferences } from "../../utils/preferencesUtils.js";
import { defaultTelegramPostVisitCheckupDelayDrafts } from "../../workspaceStaticOptions.js";
import { resolveUpdater, type Updater } from "../updater.js";
import type { TelegramSettingsActions, TelegramSettingsState } from "./telegramSettingsTypes.js";

const prefs = loadUiPreferences() ?? defaultUiPreferences;

export const initialTelegramSettingsSlice: TelegramSettingsState = {
	telegramHandoffNotice: null,
	telegramStatus: null,
	telegramFeaturePlan: null,
	telegramOutbox: null,
	telegramOutboxStatusFilter: prefs.telegramOutboxStatusFilter,
	telegramOutboxTemplateFilter: prefs.telegramOutboxTemplateFilter,
	telegramLinkCodes: [],
	telegramChatLinks: [],
	telegramLinkCodeLedger: null,
	telegramChatLinkLedger: null,
	telegramLinkSubjectType: prefs.telegramLinkSubjectType,
	telegramLinkStaffId: prefs.telegramLinkStaffId ?? "",
	telegramLinkCode: null,
	telegramLinkActionState: null,
	telegramPreview: null,
	telegramModeDraft: "shared_dente_bot",
	telegramBotUsernameDraft: "",
	telegramOwnBotUsernameDraft: "",
	telegramBotConfigId: prefs.telegramBotConfigId,
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
};

function createFieldSetter<K extends keyof TelegramSettingsState>(
	set: (fn: (s: TelegramSettingsState) => Partial<TelegramSettingsState>) => void,
	key: K,
): (val: Updater<TelegramSettingsState[K]>) => void {
	return (val: Updater<TelegramSettingsState[K]>) => {
		set((s) => {
			const patch: Partial<TelegramSettingsState> = {};
			patch[key] = resolveUpdater(val, s[key]);
			return patch;
		});
	};
}

export function createTelegramSettingsSlice(
	set: (fn: (s: TelegramSettingsState) => Partial<TelegramSettingsState>) => void,
): TelegramSettingsActions {
	return {
		setTelegramHandoffNotice: createFieldSetter(set, "telegramHandoffNotice"),
		setTelegramStatus: createFieldSetter(set, "telegramStatus"),
		setTelegramFeaturePlan: createFieldSetter(set, "telegramFeaturePlan"),
		setTelegramOutbox: createFieldSetter(set, "telegramOutbox"),
		setTelegramOutboxStatusFilter: createFieldSetter(set, "telegramOutboxStatusFilter"),
		setTelegramOutboxTemplateFilter: createFieldSetter(set, "telegramOutboxTemplateFilter"),
		setTelegramLinkCodes: createFieldSetter(set, "telegramLinkCodes"),
		setTelegramChatLinks: createFieldSetter(set, "telegramChatLinks"),
		setTelegramLinkCodeLedger: createFieldSetter(set, "telegramLinkCodeLedger"),
		setTelegramChatLinkLedger: createFieldSetter(set, "telegramChatLinkLedger"),
		setTelegramLinkSubjectType: createFieldSetter(set, "telegramLinkSubjectType"),
		setTelegramLinkStaffId: createFieldSetter(set, "telegramLinkStaffId"),
		setTelegramLinkCode: createFieldSetter(set, "telegramLinkCode"),
		setTelegramLinkActionState: createFieldSetter(set, "telegramLinkActionState"),
		setTelegramPreview: createFieldSetter(set, "telegramPreview"),
		setTelegramModeDraft: createFieldSetter(set, "telegramModeDraft"),
		setTelegramBotUsernameDraft: createFieldSetter(set, "telegramBotUsernameDraft"),
		setTelegramOwnBotUsernameDraft: createFieldSetter(set, "telegramOwnBotUsernameDraft"),
		setTelegramBotConfigId: createFieldSetter(set, "telegramBotConfigId"),
		setTelegramWebhookBaseUrlDraft: createFieldSetter(set, "telegramWebhookBaseUrlDraft"),
		setTelegramPatientPortalBaseUrlDraft: createFieldSetter(set, "telegramPatientPortalBaseUrlDraft"),
		setTelegramWelcomeImageUrlDraft: createFieldSetter(set, "telegramWelcomeImageUrlDraft"),
		setTelegramVisualCardUrlDrafts: createFieldSetter(set, "telegramVisualCardUrlDrafts"),
		setTelegramReviewUrlDraft: createFieldSetter(set, "telegramReviewUrlDraft"),
		setTelegramMapsUrlDraft: createFieldSetter(set, "telegramMapsUrlDraft"),
		setTelegramEnabledFeaturesDraft: createFieldSetter(set, "telegramEnabledFeaturesDraft"),
		setTelegramTokenTtlDraft: createFieldSetter(set, "telegramTokenTtlDraft"),
		setTelegramReminderLeadTimesDraft: createFieldSetter(set, "telegramReminderLeadTimesDraft"),
		setTelegramReviewRequestDelayDraft: createFieldSetter(set, "telegramReviewRequestDelayDraft"),
		setTelegramPostVisitCheckupDelayDrafts: createFieldSetter(set, "telegramPostVisitCheckupDelayDrafts"),
		setTelegramAllowVoiceIntakeDraft: createFieldSetter(set, "telegramAllowVoiceIntakeDraft"),
		setTelegramStaffEscalationChannelDraft: createFieldSetter(set, "telegramStaffEscalationChannelDraft"),
		setTelegramPrivacyModeDraft: createFieldSetter(set, "telegramPrivacyModeDraft"),
		setTelegramSettingsDirty: createFieldSetter(set, "telegramSettingsDirty"),
		setTelegramSettingsSaveState: createFieldSetter(set, "telegramSettingsSaveState"),
		setTelegramSettingsSaveError: createFieldSetter(set, "telegramSettingsSaveError"),
	};
}
