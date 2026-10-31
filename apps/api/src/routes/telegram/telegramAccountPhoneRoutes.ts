import type { FastifyInstance } from "fastify";
import { registerTelegramAccountRequestCodeRoute } from "./telegramAccountRequestCodeRoute.js";
import { registerTelegramAccountVerifyCodeRoute } from "./telegramAccountVerifyCodeRoute.js";
import { registerTelegramAccountVerify2faRoute } from "./telegramAccountVerify2faRoute.js";

export function registerTelegramAccountPhoneRoutes(app: FastifyInstance) {
	registerTelegramAccountRequestCodeRoute(app);
	registerTelegramAccountVerifyCodeRoute(app);
	registerTelegramAccountVerify2faRoute(app);
}
