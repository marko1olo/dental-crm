/**
 * @file telegramCanonicalStore.ts
 * @description Канонический фасад (barrel SSOT) настроек, связок, outbox-квитанций и callback-подписей Telegram.
 */

export {
	safeTelegramBotUsername,
	normalizeDenteTelegramVisualCardUrls,
} from "./telegramUrlHelpers.js";

export {
	defaultClinicTimezone,
	defaultClinicProfile,
	denteTelegramBotSettings,
	denteTelegramLinkCodes,
	denteTelegramChatLinks,
	denteTelegramOutboxDeliveryReceipts,
	denteTelegramWebhookEvents,
	denteTelegramOutboxDeliveryReceiptsMap,
	inMemoryActiveVisit,
	inMemoryDomainState,
	getDenteTelegramBotSettings,
	normalizeAppointmentReminderLeadTimes,
	normalizeReviewRequestDelayHours,
	normalizePostVisitCheckupDelayHoursByTopic,
	denteTelegramBotConfigIdForSettings,
	configuredTelegramBotUsername,
	configuredTelegramBotConfigId,
	normalizeDenteTelegramBotScopedLedgers,
	resolveDenteTelegramOutboxRuntimeScope,
	applyLoadedTelegramBotSettings,
	updateDenteTelegramBotSettings,
	type DomainState,
	type DenteTelegramOutboxRuntimeScope,
	type ResolvedDenteTelegramOutboxRuntimeScope,
} from "./canonicalStore/telegramRuntimeDefaults.js";

export {
	telegramChatEncryptionReady,
	fingerprintDenteTelegramLinkCode,
	extractDenteTelegramLinkCode,
	expireStaleDenteTelegramLinkCodes,
	publicDenteTelegramLinkCode,
	createDenteTelegramLinkCode,
	consumeDenteTelegramLinkCode,
	listDenteTelegramLinkCodes,
	buildDenteTelegramLinkCodeList,
	revokeDenteTelegramChatLink,
	type DenteTelegramLinkCodeListStatusFilter,
	type BuildDenteTelegramLinkCodeListOptions,
	type DenteTelegramChatLinkListStatusFilter,
	type BuildDenteTelegramChatLinkListOptions,
} from "./canonicalStore/telegramLinkCodesStore.js";

export {
	syncDenteTelegramOutboxDeliveryReceiptsMap,
	findDenteTelegramOutboxDeliveryReceipt,
	findDenteTelegramOutboxDeliveryReceiptDb,
	claimDenteTelegramOutboxDeliveryReceipt,
	claimDenteTelegramOutboxDeliveryReceiptDb,
	recordDenteTelegramOutboxDelivery,
	recordDenteTelegramOutboxDeliveryDb,
} from "./canonicalStore/telegramOutboxReceiptsRepo.js";

export {
	telegramTemplateKindForTask,
	buildDenteTelegramMessagePreviewData,
	renderDenteTelegramMessagePreview,
	buildAllDenteTelegramOutboxItems,
	buildDenteTelegramOutbox,
	prepareDenteTelegramOutboxDelivery,
	type DenteTelegramOutboxStatusFilter,
	type BuildDenteTelegramOutboxOptions,
	type NormalizedDenteTelegramOutboxOptions,
	type TelegramMessageContext,
} from "./canonicalStore/telegramOutboxMessages.js";

export {
	createDenteTelegramContactRequest,
	createDenteTelegramDocumentRequest,
	createDenteTelegramCareRequest,
	buildDenteTelegramLinkedScheduleReply,
	appointmentStatusLabelForTelegram,
	denteTelegramAppointmentCallbacksReady,
	buildDenteTelegramAppointmentCallbackData,
} from "./canonicalStore/telegramCareRequestsAndCallbacks.js";
