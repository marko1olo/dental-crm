/**
 * apps/web/src/components/settings/settingsPropsBuilder.ts
 *
 * Universal props builder for decomposed settings tabs.
 * Combines AppLogicContext, SettingsStore, and SettingsDerivations with required
 * type casts and fallback values.
 *
 * Mandate 8b: Kept strictly < 200 lines.
 */

import type {
	DenteTelegramChatLinkPublic,
	DenteTelegramFeature,
	DenteTelegramLinkCodePublic,
	DenteTelegramOutboxItem,
	DenteTelegramOutboxResponse,
} from "@dental/shared";

export function buildSettingsProps(
	// biome-ignore lint/suspicious/noExplicitAny: universal bag of props
	appLogic: Record<string, any> = {},
	// biome-ignore lint/suspicious/noExplicitAny: universal bag of props
	settingsStore: Record<string, any> = {},
	// biome-ignore lint/suspicious/noExplicitAny: universal bag of props
	derivations: Record<string, any> = {},
	// biome-ignore lint/suspicious/noExplicitAny: active staff user
	activeStaffUser?: any,
	// biome-ignore lint/suspicious/noExplicitAny: additional contextual overrides
	extra: Record<string, any> = {},
): Record<string, any> {
	const typedTelegramChatLinks =
		(settingsStore?.telegramChatLinks as DenteTelegramChatLinkPublic[]) ??
		(appLogic?.telegramChatLinks as DenteTelegramChatLinkPublic[]) ??
		[];
	const typedTelegramLinkCodes =
		(settingsStore?.telegramLinkCodes as DenteTelegramLinkCodePublic[]) ??
		(appLogic?.telegramLinkCodes as DenteTelegramLinkCodePublic[]) ??
		[];
	const typedTelegramOutbox =
		(settingsStore?.telegramOutbox as DenteTelegramOutboxResponse | null) ??
		(appLogic?.telegramOutbox as DenteTelegramOutboxResponse | null) ??
		null;
	const typedVisibleTelegramOutboxItems =
		(appLogic?.visibleTelegramOutboxItems as DenteTelegramOutboxItem[]) ?? [];
	const typedTelegramInlineButtonKindLabels =
		(appLogic?.telegramInlineButtonKindLabels as Record<string, string>) ?? {};
	const typedTelegramEnabledFeaturesDraft =
		(settingsStore?.telegramEnabledFeaturesDraft as DenteTelegramFeature[]) ??
		[];
	const typedTelegramFeatureOptions =
		(appLogic?.telegramFeatureOptions as DenteTelegramFeature[]) ?? [];
	const typedTelegramPostVisitCheckupDelayDrafts =
		(settingsStore?.telegramPostVisitCheckupDelayDrafts as Record<
			string,
			string
		>) ?? {};

	const adminSecretDraft =
		settingsStore?.telegramAdminSecretDraft ??
		appLogic?.telegramAdminSecretDraft ??
		extra?.telegramAdminSecretDraft ??
		"";
	const adminSecretReady = (adminSecretDraft || "").trim().length > 0;

	return {
		...appLogic,
		...settingsStore,
		...derivations,
		activeStaffUser,
		adminSecretReady,
		adminSecretScopeWarning:
			appLogic?.adminSecretScopeWarning ??
			"Административный секрет защищает системные настройки клиники.",
		legalMissingFields: appLogic?.legalMissingFields ?? [],
		legalReadinessPercent: appLogic?.legalReadinessPercent ?? 100,
		newChairReadyToCreate: appLogic?.newChairReadyToCreate ?? false,
		newStaffReadyToCreate: appLogic?.newStaffReadyToCreate ?? false,
		telegramPreviewLoadingGuidanceId: "telegram-preview-loading-guidance",
		telegramPreviewPatientGuidanceId: "telegram-preview-patient-guidance",
		telegramPreviewStaffGuidanceId: "telegram-preview-staff-guidance",
		typedTelegramChatLinks,
		typedTelegramEnabledFeaturesDraft,
		typedTelegramFeatureOptions,
		typedTelegramInlineButtonKindLabels,
		typedTelegramLinkCodes,
		typedTelegramLinkStaffOptions:
			appLogic?.typedTelegramLinkStaffOptions ?? [],
		typedTelegramOutbox,
		typedVisibleTelegramOutboxItems,
		typedTelegramPostVisitCheckupDelayDrafts,
		...extra,
	};
}
