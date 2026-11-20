import type { FastifyInstance } from "fastify";
import { registerCampaignConsentHandlers } from "./campaignConsentHandlers.js";
import { registerTemplateRenderHandlers } from "./templateRenderHandlers.js";

export async function registerCampaignAndBroadcastHandlers(
	app: FastifyInstance,
): Promise<void> {
	registerTemplateRenderHandlers(app);
	registerCampaignConsentHandlers(app);
}
