import type { DenteTelegramBotSettings } from "@dental/shared";
import { safeDenteTelegramPublicHttpsUrl } from "../../services/telegram/telegramLegacyMemoryStore.js";
import {
	postVisitCheckupDelayHoursFromEnvConfig,
	reviewRequestDelayHoursFromEnvConfig,
	visualCardUrlsFromEnvConfig,
} from "./telegramEnvDelayParsers.js";
import {
	normalizedTelegramBotUsername,
	stringFromEnvConfig,
	trimmedEnv,
	uuidFromEnvConfig,
} from "./telegramEnvUtils.js";
import { isRecord } from "./telegramUtils.js";
import type { TelegramClinicBotEnvConfig } from "./types.js";

export {
	postVisitCheckupDelayHoursFromEnvConfig,
	reviewRequestDelayHoursFromEnvConfig,
	visualCardUrlsFromEnvConfig,
} from "./telegramEnvDelayParsers.js";

export function clinicBotEnvConfigs(): TelegramClinicBotEnvConfig[] {
	const raw = trimmedEnv("DENTE_TELEGRAM_CLINIC_BOTS_JSON");
	if (!raw) return [];
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch (err) {
		console.error("[Dente] clinicBotEnvConfigs JSON parse failed:", err);
		return [];
	}

	const records: unknown[] = Array.isArray(parsed)
		? parsed
		: isRecord(parsed)
			? Object.entries(parsed).map(([key, value]) => (isRecord(value) ? { organizationId: key, ...value } : null))
			: [];

	return records.filter(isRecord).map((record) => ({
		organizationId: uuidFromEnvConfig(record.organizationId) ?? uuidFromEnvConfig(record.orgId),
		clinicId: uuidFromEnvConfig(record.clinicId),
		botConfigId: stringFromEnvConfig(record.botConfigId) ?? stringFromEnvConfig(record.configId),
		botUsername: normalizedTelegramBotUsername(stringFromEnvConfig(record.botUsername) ?? stringFromEnvConfig(record.username)),
		botToken: stringFromEnvConfig(record.botToken) ?? stringFromEnvConfig(record.token),
		webhookSecret: stringFromEnvConfig(record.webhookSecret) ?? stringFromEnvConfig(record.secret),
		webhookBaseUrl: safeDenteTelegramPublicHttpsUrl("webhookBaseUrl", stringFromEnvConfig(record.webhookBaseUrl)),
		patientPortalBaseUrl: safeDenteTelegramPublicHttpsUrl("patientPortalBaseUrl", stringFromEnvConfig(record.patientPortalBaseUrl)),
		welcomeImageUrl: safeDenteTelegramPublicHttpsUrl("welcomeImageUrl", stringFromEnvConfig(record.welcomeImageUrl)),
		visualCardUrls: visualCardUrlsFromEnvConfig(record),
		postVisitCheckupDelayHoursByTopic: postVisitCheckupDelayHoursFromEnvConfig(record),
		reviewRequestDelayHours: reviewRequestDelayHoursFromEnvConfig(record),
		clinicReviewUrl: safeDenteTelegramPublicHttpsUrl("clinicReviewUrl", stringFromEnvConfig(record.clinicReviewUrl)),
		clinicMapsUrl: safeDenteTelegramPublicHttpsUrl("clinicMapsUrl", stringFromEnvConfig(record.clinicMapsUrl)),
	}));
}

export function clinicBotEnvConfigForOrganization(
	organizationId: string,
	clinicId: string | null = null,
	botConfigId: string | null = null,
): TelegramClinicBotEnvConfig | null {
	const matchingConfigs = clinicBotEnvConfigs().filter((config) => {
		return (
			config.organizationId === organizationId ||
			config.clinicId === organizationId ||
			(clinicId !== null && config.clinicId === clinicId)
		);
	});
	if (botConfigId) {
		return matchingConfigs.find((config) => config.botConfigId === botConfigId) ?? null;
	}
	return matchingConfigs.length === 1 ? (matchingConfigs[0] ?? null) : null;
}

export function clinicBotEnvConfigFor(settings: DenteTelegramBotSettings): TelegramClinicBotEnvConfig | null {
	return clinicBotEnvConfigForOrganization(settings.organizationId);
}
