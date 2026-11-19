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
	appLogic: Record<string, unknown> = {},
	settingsStore: Record<string, unknown> = {},
	derivations: Record<string, unknown> = {},
	activeStaffUser?: unknown,
	extra: Record<string, unknown> = {},
): Record<string, unknown> {
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

	const rawStaff = (appLogic?.staff as Array<{ id: string; fullName: string; role?: string; isActive?: boolean }>) ?? [];
	const staffOptions = rawStaff
		.filter((s) => s && s.isActive !== false)
		.map((s) => ({
			id: s.id,
			fullName: s.fullName,
			role: s.role,
		}));

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
		staffOptions,
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
