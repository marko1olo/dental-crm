import type {
	DenteTelegramBotStatus,
	DenteTelegramChatLinkPublic,
	DenteTelegramFeature,
	DenteTelegramLinkCodePublic,
	DenteTelegramMessagePreview,
	DenteTelegramOutboxItem,
	DenteTelegramOutboxResponse,
} from "@dental/shared";
import type {
	TelegramFeaturePlan,
	TelegramInlineButtonRow,
	TelegramPostVisitCheckupDelayField,
	TelegramPostVisitCheckupDelayKey,
	TelegramVisualCardField,
} from "./types";

export interface TelegramDerivationsParams {
	isTelegramLoading?: boolean;
	isTelegramSendingDue?: boolean;
	telegramSendingItemId?: string | null;
	telegramChatLinks?: unknown;
	telegramLinkCodes?: unknown;
	telegramPreview?: unknown;
	telegramOutbox?: unknown;
	visibleTelegramOutboxItems?: unknown;
	hiddenTelegramOutboxItemCount: number;
	telegramStatus?: unknown;
	telegramOutboxStatusFilterOptions?: string[];
	telegramOutboxTemplateFilterOptions?: string[];
	telegramInlineButtonKindLabels?: unknown;
	telegramFeaturePlan?: unknown;
	telegramEnabledFeaturesDraft?: unknown;
	telegramFeatureOptions?: unknown;
	telegramFeatureHelp?: unknown;
	telegramPostVisitCheckupDelayFields?: unknown;
	telegramPostVisitCheckupDelayDrafts?: unknown;
	telegramVisualCardFields?: unknown;
	telegramInlineButtonRowsFromReplyMarkup: (
		replyMarkup: Record<string, unknown> | null,
	) => unknown;
}

export function deriveTelegramSettings(params: TelegramDerivationsParams) {
	const {
		isTelegramLoading,
		isTelegramSendingDue,
		telegramSendingItemId,
		telegramChatLinks,
		telegramLinkCodes,
		telegramPreview,
		telegramOutbox,
		visibleTelegramOutboxItems,
		hiddenTelegramOutboxItemCount,
		telegramStatus,
		telegramOutboxStatusFilterOptions,
		telegramOutboxTemplateFilterOptions,
		telegramInlineButtonKindLabels,
		telegramFeaturePlan,
		telegramEnabledFeaturesDraft,
		telegramFeatureOptions,
		telegramFeatureHelp,
		telegramPostVisitCheckupDelayFields,
		telegramPostVisitCheckupDelayDrafts,
		telegramVisualCardFields,
		telegramInlineButtonRowsFromReplyMarkup,
	} = params;

	const _typedTelegramChatLinks =
		(telegramChatLinks as DenteTelegramChatLinkPublic[]) ?? [];
	const _typedTelegramLinkCodes =
		(telegramLinkCodes as DenteTelegramLinkCodePublic[]) ?? [];
	const _typedTelegramPreview =
		telegramPreview as DenteTelegramMessagePreview | null;
	const typedTelegramOutbox =
		telegramOutbox as DenteTelegramOutboxResponse | null;
	const typedVisibleTelegramOutboxItems = (visibleTelegramOutboxItems ??
		[]) as DenteTelegramOutboxItem[];
	const _telegramOutboxRemainingCount = typedTelegramOutbox
		? Math.max(
				0,
				typedTelegramOutbox.filteredCount -
					typedVisibleTelegramOutboxItems.length,
			)
		: hiddenTelegramOutboxItemCount;
	const _typedTelegramStatus = telegramStatus as DenteTelegramBotStatus | null;
	const _typedTelegramOutboxStatusFilterOptions =
		(telegramOutboxStatusFilterOptions ?? []) as string[];
	const _typedTelegramOutboxTemplateFilterOptions =
		(telegramOutboxTemplateFilterOptions ?? []) as string[];
	const _typedTelegramInlineButtonKindLabels =
		telegramInlineButtonKindLabels as Record<string, string>;
	const _typedTelegramFeaturePlan =
		telegramFeaturePlan as TelegramFeaturePlan | null;
	const _typedTelegramEnabledFeaturesDraft =
		telegramEnabledFeaturesDraft as DenteTelegramFeature[];
	const _typedTelegramFeatureOptions =
		telegramFeatureOptions as DenteTelegramFeature[];
	const _typedTelegramFeatureHelp = telegramFeatureHelp as Record<
		DenteTelegramFeature,
		string
	>;
	const _typedTelegramPostVisitCheckupDelayFields =
		telegramPostVisitCheckupDelayFields as TelegramPostVisitCheckupDelayField[];
	const _typedTelegramPostVisitCheckupDelayDrafts =
		telegramPostVisitCheckupDelayDrafts as Record<
			TelegramPostVisitCheckupDelayKey,
			string
		>;
	const _typedTelegramVisualCardFields =
		telegramVisualCardFields as TelegramVisualCardField[];
	const _getTypedTelegramInlineButtonRows = (
		replyMarkup: Record<string, unknown> | null,
	) =>
		telegramInlineButtonRowsFromReplyMarkup(
			replyMarkup,
		) as TelegramInlineButtonRow[];

	const _telegramPreviewPatientGuidanceId = "telegram-preview-patient-guidance";
	const _telegramPreviewStaffGuidanceId = "telegram-preview-staff-guidance";
	const _telegramPreviewLoadingGuidanceId = "telegram-preview-loading-guidance";
	const _telegramOutboxSendGuidanceId = "telegram-outbox-send-guidance";

	const telegramOutboxBulkSendGuidance = isTelegramLoading
		? "Дождитесь загрузки очереди Telegram."
		: isTelegramSendingDue || telegramSendingItemId
			? "Дождитесь завершения текущей отправки Telegram."
			: !telegramOutbox?.dueCount
				? "Сейчас нет сообщений, готовых к отправке."
				: "";

	return {
		_typedTelegramChatLinks,
		_typedTelegramLinkCodes,
		_typedTelegramPreview,
		typedTelegramOutbox,
		typedVisibleTelegramOutboxItems,
		_telegramOutboxRemainingCount,
		_typedTelegramStatus,
		_typedTelegramOutboxStatusFilterOptions,
		_typedTelegramOutboxTemplateFilterOptions,
		_typedTelegramInlineButtonKindLabels,
		_typedTelegramFeaturePlan,
		_typedTelegramEnabledFeaturesDraft,
		_typedTelegramFeatureOptions,
		_typedTelegramFeatureHelp,
		_typedTelegramPostVisitCheckupDelayFields,
		_typedTelegramPostVisitCheckupDelayDrafts,
		_typedTelegramVisualCardFields,
		_getTypedTelegramInlineButtonRows,
		_telegramPreviewPatientGuidanceId,
		_telegramPreviewStaffGuidanceId,
		_telegramPreviewLoadingGuidanceId,
		_telegramOutboxSendGuidanceId,
		telegramOutboxBulkSendGuidance,
	};
}
