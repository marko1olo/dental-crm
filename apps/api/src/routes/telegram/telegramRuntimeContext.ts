/**
 * Layer 5 Facade: telegramRuntimeContext.ts
 * Decomposed under Mandate 8b into:
 * - telegramEnvUtils.ts
 * - telegramEnvConfigParsers.ts
 * - telegramRuntimeResolver.ts
 * - telegramOutboxScope.ts
 * - telegramDbSync.ts
 * - telegramControlPlaneGuard.ts
 */

export {
	safeDenteTelegramPublicHttpsUrl,
} from "../../services/telegram/telegramLegacyMemoryStore.js";

export {
	trimmedEnv,
	normalizedTelegramBotUsername,
	stringFromEnvConfig,
} from "./telegramEnvUtils.js";

export {
	visualCardUrlsFromEnvConfig,
	postVisitCheckupDelayHoursFromEnvConfig,
	reviewRequestDelayHoursFromEnvConfig,
} from "./telegramEnvDelayParsers.js";

export {
	type TelegramClinicBotEnvConfig,
	clinicBotEnvConfigs,
} from "./telegramEnvConfigParsers.js";

export {
	parseTelegramOutboxRuntimeScopeQuery,
} from "./telegramUtils.js";

export {
	type TelegramRuntimeContext,
	type TelegramRuntimeSettingsResolution,
	clinicBotEnvConfigForOrganization,
	clinicBotEnvConfigFor,
	runtimeSettingsForRequestedOrganization,
	configuredSharedBotUsername,
	configuredClinicOwnedBotUsername,
	configuredBotUsername,
	configuredSharedBotToken,
	configuredClinicOwnedBotToken,
	configuredBotToken,
	configuredWebhookSecret,
	telegramBotConfigId,
	resolveTelegramRuntimeContext,
} from "./telegramRuntimeResolver.js";

export {
	denteTelegramOutboxRuntimeScope,
	type TelegramResolvedOutboxRuntime,
	denteTelegramResolvedOutboxRuntime,
	resolveTelegramOutboxRuntimeScopeFromQuery,
} from "./telegramOutboxScope.js";

export {
	hydrateTelegramDomainState,
	persistTelegramChatLinkToDatabase,
} from "./telegramDbSync.js";

export {
	telegramSecretHeader,
	denteAdminSecretHeader,
	telegramLinkCodeRateLimitWindowMs,
	telegramLinkCodeRejectedAttemptLimit,
	configuredTelegramAdminSecret,
	isExplicitlyUnguardedControlPlaneAllowed,
	requireTelegramControlPlaneAccess,
	configuredSendTimeoutMs,
} from "./telegramControlPlaneGuard.js";
