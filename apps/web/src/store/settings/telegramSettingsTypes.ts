/**
 * DENTE CRM — Telegram Settings Store Types
 */

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
import type {
	DenteTelegramHandoffTarget,
	TelegramFeaturePlan,
	TelegramLinkSubjectType,
	TelegramOutboxStatusFilter,
	TelegramOutboxTemplateFilter,
} from "../../AppConstants.js";
import type { TelegramPostVisitCheckupDelayDrafts } from "../../workspaceStaticOptions.js";

export interface TelegramSettingsState {
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
}

export type TelegramSettingsActions = {
	[K in keyof TelegramSettingsState as `set${Capitalize<K>}`]: (
		val: TelegramSettingsState[K] | ((prev: TelegramSettingsState[K]) => TelegramSettingsState[K]),
	) => void;
};
