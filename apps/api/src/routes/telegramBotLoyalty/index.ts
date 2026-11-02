import type { FastifyInstance } from "fastify";
import { registerTelegramReferralActionRoutes } from "./telegramReferralActionHandlers.js";
import { registerTelegramWebAppSessionRoutes } from "./telegramWebAppSessionHandlers.js";

export * from "./telegramLoyaltySchemas.js";
export * from "./telegramWebAppSessionHandlers.js";
export * from "./telegramReferralActionHandlers.js";

/**
 * Единая регистрация всех маршрутов Telegram WebApp и программы лояльности
 */
export async function registerTelegramReferralLoyaltyRoutes(app: FastifyInstance): Promise<void> {
	await registerTelegramWebAppSessionRoutes(app);
	await registerTelegramReferralActionRoutes(app);
}
