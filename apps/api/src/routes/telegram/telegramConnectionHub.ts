import type { FastifyInstance } from "fastify";
import { registerTelegramBotConnectionRoutes } from "./telegramBotConnectionRoutes.js";
import { registerTelegramBotTokenRoutes } from "./telegramBotTokenRoutes.js";
import { registerTelegramAccountPhoneRoutes } from "./telegramAccountPhoneRoutes.js";
import { registerTelegramAccountQrRoutes } from "./telegramAccountQrRoutes.js";
import { registerTelegramAccountSessionRoutes } from "./telegramAccountSessionRoutes.js";

/**
 * Hub for Telegram Bot connection and personal account MTProto authentication.
 * Aggregates bot provisioning, token validation, phone/QR auth, and session lifecycle.
 * Fully modularized according to Mandate 8b/8zi (Sweet Spot <300 lines).
 */
export function registerTelegramConnectionHubRoutes(app: FastifyInstance) {
	registerTelegramBotConnectionRoutes(app);
	registerTelegramBotTokenRoutes(app);
	registerTelegramAccountPhoneRoutes(app);
	registerTelegramAccountQrRoutes(app);
	registerTelegramAccountSessionRoutes(app);
}
