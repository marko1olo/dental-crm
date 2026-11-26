import type { FastifyInstance } from "fastify";
import { registerVkAccountRoutes } from "./vk/accountRoutes.js";
import { registerVkBotRoutes } from "./vk/botRoutes.js";
import { registerVkWebhookRoute } from "./vk/webhookRoute.js";

export async function registerVkRoutes(server: FastifyInstance) {
	registerVkBotRoutes(server);
	registerVkAccountRoutes(server);
	registerVkWebhookRoute(server);
}
