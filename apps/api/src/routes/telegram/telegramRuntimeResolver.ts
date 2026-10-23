import { getDenteTelegramBotSettings } from "../../services/telegram/telegramLegacyMemoryStore.js";
import {
	configuredBotToken,
	configuredBotUsername,
	configuredWebhookSecret,
	telegramBotConfigId,
} from "./telegramBotConfigResolver.js";
import {
	clinicBotEnvConfigFor,
	clinicBotEnvConfigForOrganization,
} from "./telegramEnvConfigParsers.js";
import type {
	TelegramRuntimeContext,
	TelegramRuntimeSettingsResolution,
} from "./types.js";

export {
	clinicBotEnvConfigFor,
	clinicBotEnvConfigForOrganization,
};

export {
	configuredSharedBotUsername,
	configuredClinicOwnedBotUsername,
	configuredBotUsername,
	configuredSharedBotToken,
	configuredClinicOwnedBotToken,
	configuredBotToken,
	configuredWebhookSecret,
	telegramBotConfigId,
} from "./telegramBotConfigResolver.js";

export function runtimeSettingsForRequestedOrganization(
	requestedOrganizationId: string | null | undefined,
	requestedBotConfigId: string | null | undefined = null,
): TelegramRuntimeSettingsResolution | null {
	const currentSettings = getDenteTelegramBotSettings();
	const envConfig = requestedOrganizationId
		? clinicBotEnvConfigForOrganization(requestedOrganizationId, null, requestedBotConfigId ?? null)
		: null;
	if (envConfig?.organizationId) {
		return {
			settings: {
				...currentSettings,
				organizationId: envConfig.organizationId,
				mode: "clinic_owned_bot",
				ownBotUsername: envConfig.botUsername,
				webhookBaseUrl: envConfig.webhookBaseUrl ?? currentSettings.webhookBaseUrl,
				patientPortalBaseUrl: envConfig.patientPortalBaseUrl ?? currentSettings.patientPortalBaseUrl,
				welcomeImageUrl: envConfig.welcomeImageUrl ?? currentSettings.welcomeImageUrl,
				visualCardUrls: { ...currentSettings.visualCardUrls, ...(envConfig.visualCardUrls ?? {}) },
				postVisitCheckupDelayHoursByTopic: { ...currentSettings.postVisitCheckupDelayHoursByTopic, ...(envConfig.postVisitCheckupDelayHoursByTopic ?? {}) },
				reviewRequestDelayHours: envConfig.reviewRequestDelayHours ?? currentSettings.reviewRequestDelayHours,
				clinicReviewUrl: envConfig.clinicReviewUrl ?? currentSettings.clinicReviewUrl,
				clinicMapsUrl: envConfig.clinicMapsUrl ?? currentSettings.clinicMapsUrl,
			},
			clinicId: envConfig.clinicId ?? envConfig.organizationId,
			envConfig,
		};
	}

	if (!requestedBotConfigId && (!requestedOrganizationId || requestedOrganizationId === currentSettings.organizationId)) {
		return {
			settings: currentSettings,
			clinicId: currentSettings.organizationId,
			envConfig: clinicBotEnvConfigFor(currentSettings),
		};
	}

	return null;
}

export function resolveTelegramRuntimeContext(
	requestedOrganizationId: string | null | undefined = null,
	requestedBotConfigId: string | null | undefined = null,
): { ok: true; context: TelegramRuntimeContext } | { ok: false; statusCode: number; error: string; message: string } {
	const runtimeSettings = runtimeSettingsForRequestedOrganization(requestedOrganizationId, requestedBotConfigId);
	if (!runtimeSettings) {
		return { ok: false, statusCode: 404, error: "TelegramTenantNotFound", message: "Telegram webhook относится к другой организации DENTE." };
	}

	const { settings } = runtimeSettings;
	const botUsername = settings.mode === "clinic_owned_bot" && runtimeSettings.envConfig?.botUsername ? runtimeSettings.envConfig.botUsername : configuredBotUsername(settings);
	const botToken = settings.mode === "clinic_owned_bot" && runtimeSettings.envConfig?.botToken ? runtimeSettings.envConfig.botToken : configuredBotToken(settings);
	const webhookSecret = settings.mode === "clinic_owned_bot" && runtimeSettings.envConfig?.webhookSecret ? runtimeSettings.envConfig.webhookSecret : configuredWebhookSecret(settings);
	const tokenConfigured = Boolean(botToken);
	const webhookSecretConfigured = Boolean(webhookSecret);
	const clinicOwnedBotReady = settings.mode === "clinic_owned_bot" && Boolean(botUsername && botToken);

	return {
		ok: true,
		context: {
			settings,
			organizationId: settings.organizationId,
			clinicId: runtimeSettings.clinicId ?? settings.organizationId,
			botConfigId: runtimeSettings.envConfig?.botConfigId ?? telegramBotConfigId(settings, botUsername),
			botUsername,
			botToken,
			webhookSecret,
			tokenConfigured,
			webhookSecretConfigured,
			webhookReady: settings.mode !== "disabled" && tokenConfigured && webhookSecretConfigured,
			clinicOwnedBotReady,
		},
	};
}
