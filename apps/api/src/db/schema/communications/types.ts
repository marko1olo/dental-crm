import type {
	DenteTelegramVisualCardUrls,
} from "@dental/shared";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import type {
	communicationChannel,
	communicationConsentScope,
	communicationConsentState,
	communicationDirection,
	communicationIntent,
	communicationOutboxStatus,
	communicationPriority,
	communicationStatus,
	denteTelegramBotMode,
	denteTelegramChatLinkStatus,
	denteTelegramLinkCodeStatus,
	denteTelegramOutboxSendStatus,
	denteTelegramPrivacyMode,
	denteTelegramSubjectType,
	denteTelegramUpdateKind,
	denteTelegramWebhookStatus,
} from "../_common.js";

export type { DenteTelegramVisualCardUrls };

export type CommunicationChannel = (typeof communicationChannel.enumValues)[number];
export type CommunicationIntent = (typeof communicationIntent.enumValues)[number];
export type CommunicationStatus = (typeof communicationStatus.enumValues)[number];
export type CommunicationPriority = (typeof communicationPriority.enumValues)[number];
export type CommunicationDirection = (typeof communicationDirection.enumValues)[number];
export type CommunicationOutboxStatus = (typeof communicationOutboxStatus.enumValues)[number];
export type CommunicationConsentScope = (typeof communicationConsentScope.enumValues)[number];
export type CommunicationConsentState = (typeof communicationConsentState.enumValues)[number];

export type DenteTelegramBotMode = (typeof denteTelegramBotMode.enumValues)[number];
export type DenteTelegramChatLinkStatus = (typeof denteTelegramChatLinkStatus.enumValues)[number];
export type DenteTelegramLinkCodeStatus = (typeof denteTelegramLinkCodeStatus.enumValues)[number];
export type DenteTelegramOutboxSendStatus = (typeof denteTelegramOutboxSendStatus.enumValues)[number];
export type DenteTelegramPrivacyMode = (typeof denteTelegramPrivacyMode.enumValues)[number];
export type DenteTelegramSubjectType = (typeof denteTelegramSubjectType.enumValues)[number];
export type DenteTelegramUpdateKind = (typeof denteTelegramUpdateKind.enumValues)[number];
export type DenteTelegramWebhookStatus = (typeof denteTelegramWebhookStatus.enumValues)[number];
