import type { FastifyInstance } from "fastify";
import { registerTelegramReferralActionRoutes } from "./telegramReferralActionHandlers.js";
import { registerTelegramWebAppSessionRoutes } from "./telegramWebAppSessionHandlers.js";

export * from "./telegramLoyaltySchemas.js";
export * from "./telegramWebAppSessionHandlers.js";
export * from "./telegramReferralActionHandlers.js";

export interface TelegramLoyaltyRouteDeps {
	/**
	 * Явный DI-флаг для тестов: разрешает считать пациента принадлежащим клинике,
	 * если база данных недоступна. По умолчанию строго false (fail-closed).
	 */
	allowTestDbBypass?: boolean | undefined;
	/**
	 * Явный DI-флаг для тестов: разрешает dev-bypass валидации WebApp при включённом
	 * DENTE_TELEGRAM_ALLOW_UNGUARDED_CONTROL_PLANE. По умолчанию строго false.
	 */
	allowTestDevBypass?: boolean | undefined;
	/**
	 * Явный DI-резолвер резервного botToken (например, для unit/integration тестов
	 * без поднятой таблицы dente_telegram_bot_configs).
	 */
	resolveFallbackBotToken?: (() => string | null) | undefined;
}

/**
 * Единая регистрация всех маршрутов Telegram WebApp и программы лояльности
 */
export async function registerTelegramReferralLoyaltyRoutes(
	app: FastifyInstance,
	deps?: TelegramLoyaltyRouteDeps,
): Promise<void> {
	await registerTelegramWebAppSessionRoutes(app, deps);
	await registerTelegramReferralActionRoutes(app, deps);
}
