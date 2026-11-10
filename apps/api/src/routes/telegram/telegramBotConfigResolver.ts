import type { DenteTelegramBotSettings } from "@dental/shared";
import { clinicBotEnvConfigFor } from "./telegramEnvConfigParsers.js";
import {
	normalizedTelegramBotUsername,
	trimmedEnv,
} from "./telegramEnvUtils.js";

export function configuredSharedBotUsername(settings: DenteTelegramBotSettings): string | null {
	return normalizedTelegramBotUsername(trimmedEnv("DENTE_TELEGRAM_BOT_USERNAME") || settings.botUsername || null);
}

export function configuredClinicOwnedBotUsername(settings: DenteTelegramBotSettings): string | null {
	return normalizedTelegramBotUsername(
		clinicBotEnvConfigFor(settings)?.botUsername ||
		trimmedEnv("DENTE_TELEGRAM_OWN_BOT_USERNAME") ||
		trimmedEnv("DENTE_TELEGRAM_CLINIC_BOT_USERNAME") ||
		settings.ownBotUsername ||
		null,
	);
}

export function configuredBotUsername(settings: DenteTelegramBotSettings): string | null {
	return settings.mode === "clinic_owned_bot"
		? configuredClinicOwnedBotUsername(settings)
		: configuredSharedBotUsername(settings);
}

export function configuredSharedBotToken(): string | null {
	return trimmedEnv("DENTE_TELEGRAM_BOT_TOKEN") || trimmedEnv("TELEGRAM_BOT_TOKEN");
}

export function configuredClinicOwnedBotToken(settings: DenteTelegramBotSettings): string | null {
	return (
		clinicBotEnvConfigFor(settings)?.botToken ||
		trimmedEnv("DENTE_TELEGRAM_OWN_BOT_TOKEN") ||
		trimmedEnv("DENTE_TELEGRAM_CLINIC_BOT_TOKEN")
	);
}

export function configuredBotToken(settings: DenteTelegramBotSettings): string | null {
	return settings.mode === "clinic_owned_bot"
		? configuredClinicOwnedBotToken(settings)
		: configuredSharedBotToken();
}

export function configuredWebhookSecret(settings: DenteTelegramBotSettings): string | null {
	if (settings.mode === "clinic_owned_bot") {
		return (
			clinicBotEnvConfigFor(settings)?.webhookSecret ||
			trimmedEnv("DENTE_TELEGRAM_OWN_WEBHOOK_SECRET") ||
			trimmedEnv("DENTE_TELEGRAM_CLINIC_WEBHOOK_SECRET") ||
			trimmedEnv("DENTE_TELEGRAM_WEBHOOK_SECRET")
		);
	}
	return trimmedEnv("DENTE_TELEGRAM_WEBHOOK_SECRET");
}

export function telegramBotConfigId(settings: DenteTelegramBotSettings, botUsername: string | null): string {
	if (settings.mode === "clinic_owned_bot") {
		return `clinic_owned_bot:${settings.organizationId}:${(botUsername ?? "unconfigured").toLowerCase()}`;
	}
	if (settings.mode === "disabled") return `disabled:${settings.organizationId}`;
	return `shared_dente_bot:${settings.organizationId}`;
}
