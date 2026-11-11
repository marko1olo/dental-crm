import type { FastifyInstance } from "fastify";
import { registerCampaignBroadcastHandlers } from "./campaignBroadcastHandlers.js";
import { registerCampaignConsentHandlers } from "./campaignConsentHandlers.js";
import { registerTemplateRenderHandlers } from "./templateRenderHandlers.js";

export async function registerCampaignAndBroadcastHandlers(
	app: FastifyInstance,
): Promise<void> {
	registerTemplateRenderHandlers(app);
	registerCampaignBroadcastHandlers(app);
	registerCampaignConsentHandlers(app);
}
