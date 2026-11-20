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
	appLogic: unknown = {},
	settingsStore: unknown = {},
	derivations: unknown = {},
	activeStaffUser?: unknown,
	extra: unknown = {},
): Record<string, unknown> {
	const store = (settingsStore ?? {}) as Record<string, unknown>;
	const logic = (appLogic ?? {}) as Record<string, unknown>;
	const d = (derivations ?? {}) as Record<string, unknown>;
	const extraBag = (extra ?? {}) as Record<string, unknown>;
	const typedTelegramChatLinks =
		(store?.telegramChatLinks as DenteTelegramChatLinkPublic[]) ??
		(logic?.telegramChatLinks as DenteTelegramChatLinkPublic[]) ??
		[];
	const typedTelegramLinkCodes =
		(store?.telegramLinkCodes as DenteTelegramLinkCodePublic[]) ??
		(logic?.telegramLinkCodes as DenteTelegramLinkCodePublic[]) ??
		[];
	const typedTelegramOutbox =
		(store?.telegramOutbox as DenteTelegramOutboxResponse | null) ??
		(logic?.telegramOutbox as DenteTelegramOutboxResponse | null) ??
		null;
	const typedVisibleTelegramOutboxItems =
		(logic?.visibleTelegramOutboxItems as DenteTelegramOutboxItem[]) ?? [];
	const typedTelegramInlineButtonKindLabels =
		(logic?.telegramInlineButtonKindLabels as Record<string, string>) ?? {};
	const typedTelegramEnabledFeaturesDraft =
		(store?.telegramEnabledFeaturesDraft as DenteTelegramFeature[]) ??
		[];
	const typedTelegramFeatureOptions =
		(logic?.telegramFeatureOptions as DenteTelegramFeature[]) ?? [];
	const typedTelegramPostVisitCheckupDelayDrafts =
		(store?.telegramPostVisitCheckupDelayDrafts as Record<
			string,
			string
		>) ?? {};

	const adminSecretDraft =
		store?.telegramAdminSecretDraft ??
		logic?.telegramAdminSecretDraft ??
		extraBag?.telegramAdminSecretDraft ??
		"";
	const adminSecretReady =
		typeof adminSecretDraft === "string" && adminSecretDraft.trim().length > 0;

	const rawStaff = (logic?.staff as Array<{ id: string; fullName: string; role?: string; isActive?: boolean }>) ?? [];
	const staffOptions = rawStaff
		.filter((s) => s && s.isActive !== false)
		.map((s) => ({
			id: s.id,
			fullName: s.fullName,
			role: s.role,
		}));

	return {
		...logic,
		...store,
		...d,
		activeStaffUser,
		adminSecretReady,
		adminSecretScopeWarning:
			logic?.adminSecretScopeWarning ??
			"Административный секрет защищает системные настройки клиники.",
		legalMissingFields: logic?.legalMissingFields ?? [],
		legalReadinessPercent: logic?.legalReadinessPercent ?? 100,
		newChairReadyToCreate: logic?.newChairReadyToCreate ?? false,
		newStaffReadyToCreate: logic?.newStaffReadyToCreate ?? false,
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
			logic?.typedTelegramLinkStaffOptions ?? [],
		typedTelegramOutbox,
		typedVisibleTelegramOutboxItems,
		typedTelegramPostVisitCheckupDelayDrafts,
		...extraBag,
	};
}
