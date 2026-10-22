import type { FastifyInstance } from "fastify";
import { registerCampaignBroadcastHandlers } from "./campaignBroadcastHandlers.js";
import { registerCampaignConsentHandlers } from "./campaignConsentHandlers.js";
import { registerTemplateCatalogHandlers } from "./templateCatalogHandlers.js";
import { registerTemplateRenderHandlers } from "./templateRenderHandlers.js";

export async function registerCampaignAndBroadcastHandlers(
	app: FastifyInstance,
): Promise<void> {
	registerTemplateCatalogHandlers(app);
	registerTemplateRenderHandlers(app);
	registerCampaignBroadcastHandlers(app);
	registerCampaignConsentHandlers(app);
}
