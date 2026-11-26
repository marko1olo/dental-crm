import { and, desc, eq } from "drizzle-orm";
import { withTenantCtx } from "../../db/rls.js";
import { denteTelegramBotConfigs } from "../../db/schema.js";
import { isDbConnectionError } from "../../services/telegram/referralLoyalty/webAppValidator.js";
import { TelegramTokenVault } from "../../services/telegram/TelegramTokenVault.js";
import { getDenteTelegramBotSettings } from "./telegramCanonicalStore.js";
import {
	configuredBotToken,
	configuredBotUsername,
	configuredWebhookSecret,
	telegramBotConfigId,
} from "./telegramBotConfigResolver.js";
import { loadTelegramBotSettingsFromDatabase } from "./telegramDbSync.js";
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
	const currentSettings = getDenteTelegramBotSettings(requestedOrganizationId);
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
			clinicId: envConfig.clinicId ?? null,
			envConfig,
		};
	}

	if (!requestedBotConfigId && (!requestedOrganizationId || requestedOrganizationId === currentSettings.organizationId)) {
		return {
			settings: currentSettings,
			clinicId: null,
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
			clinicId: runtimeSettings.clinicId ?? null,
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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Асинхронное разрешение рантайма бота с обязательной гидратацией из PostgreSQL (`dente_telegram_bot_configs`)
 * и расшифровкой `tokenSecretRef` через `TelegramTokenVault` (если env-конфиг не задан).
 */
export async function resolveTelegramRuntimeContextWithDb(
	requestedOrganizationId: string | null | undefined = null,
	requestedBotConfigId: string | null | undefined = null,
): Promise<{ ok: true; context: TelegramRuntimeContext } | { ok: false; statusCode: number; error: string; message: string }> {
	const syncResolution = resolveTelegramRuntimeContext(
		requestedOrganizationId,
		requestedBotConfigId,
	);

	const targetOrgId = requestedOrganizationId?.trim();
	if (!targetOrgId || !UUID_REGEX.test(targetOrgId)) {
		return syncResolution;
	}

	if (
		syncResolution.ok &&
		syncResolution.context.botToken &&
		syncResolution.context.organizationId === targetOrgId &&
		(!requestedBotConfigId || syncResolution.context.botConfigId === requestedBotConfigId)
	) {
		return syncResolution;
	}

	let dbRow: typeof denteTelegramBotConfigs.$inferSelect | null = null;
	try {
		dbRow = await withTenantCtx(targetOrgId, async (tx) => {
			const [row] = await tx
				.select()
				.from(denteTelegramBotConfigs)
				.where(
					and(
						eq(denteTelegramBotConfigs.organizationId, targetOrgId),
						eq(denteTelegramBotConfigs.isActive, true),
						...(requestedBotConfigId
							? [eq(denteTelegramBotConfigs.botConfigId, requestedBotConfigId)]
							: []),
					),
				)
				.orderBy(desc(denteTelegramBotConfigs.updatedAt))
				.limit(1);
			return row ?? null;
		});
	} catch (err) {
		if (
			isDbConnectionError(err) &&
			(process.env.NODE_ENV === "test" || !process.env.DATABASE_URL)
		) {
			return syncResolution;
		}
		throw err;
	}

	if (!dbRow) {
		return syncResolution;
	}

	const dbSettings = await loadTelegramBotSettingsFromDatabase(targetOrgId);
	if (!dbSettings) {
		return syncResolution;
	}

	const envFallbackContext = syncResolution.ok ? syncResolution.context : null;
	const dbBotToken = TelegramTokenVault.resolveOperationalToken(
		dbRow.tokenSecretRef,
		targetOrgId,
	);
	const dbWebhookSecret = TelegramTokenVault.resolveOperationalToken(
		dbRow.webhookSecretRef,
		targetOrgId,
	);
	const botToken = dbBotToken ?? envFallbackContext?.botToken ?? configuredBotToken(dbSettings);
	const webhookSecret =
		dbWebhookSecret ?? envFallbackContext?.webhookSecret ?? configuredWebhookSecret(dbSettings);
	const botUsername =
		dbRow.mode === "clinic_owned_bot"
			? (dbRow.ownBotUsername ?? configuredBotUsername(dbSettings))
			: configuredBotUsername(dbSettings);
	const tokenConfigured = Boolean(botToken);
	const webhookSecretConfigured = Boolean(webhookSecret);

	return {
		ok: true,
		context: {
			settings: dbSettings,
			organizationId: targetOrgId,
			clinicId: dbRow.clinicId ?? envFallbackContext?.clinicId ?? null,
			botConfigId: dbRow.botConfigId || telegramBotConfigId(dbSettings, botUsername),
			botUsername,
			botToken,
			webhookSecret,
			tokenConfigured,
			webhookSecretConfigured,
			webhookReady: dbSettings.mode !== "disabled" && tokenConfigured && webhookSecretConfigured,
			clinicOwnedBotReady: dbRow.mode === "clinic_owned_bot" && Boolean(botUsername && botToken),
		},
	};
}
