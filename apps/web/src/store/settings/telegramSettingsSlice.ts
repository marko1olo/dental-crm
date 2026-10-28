/**
 * DENTE CRM — Telegram Bot & Outbox Settings Slice
 */

import { emptyTelegramVisualCardUrlDrafts } from "../../utils/draftDefaults.js";
import { defaultUiPreferences, loadUiPreferences } from "../../utils/preferencesUtils.js";
import { defaultTelegramPostVisitCheckupDelayDrafts } from "../../workspaceStaticOptions.js";
import { resolveUpdater } from "../updater.js";
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

export function createTelegramSettingsSlice(set: any): TelegramSettingsActions {
	const actions: Record<string, any> = {};
	for (const key of Object.keys(initialTelegramSettingsSlice)) {
		const actionName = `set${key.charAt(0).toUpperCase()}${key.slice(1)}`;
		actions[actionName] = (val: any) => set((s: any) => ({ [key]: resolveUpdater(val, s[key]) }));
	}
	return actions as TelegramSettingsActions;
}
