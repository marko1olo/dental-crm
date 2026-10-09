import type { FastifyInstance } from "fastify";
import { registerOutboxAndCampaignRoutes } from "./outboxAndCampaignRoutes.js";
import { registerTemplateAndSettingsRoutes } from "./templateAndSettingsRoutes.js";

export async function registerCommunicationOutboxRoutes(app: FastifyInstance) {
	await registerTemplateAndSettingsRoutes(app);
	await registerOutboxAndCampaignRoutes(app);
}

export default registerCommunicationOutboxRoutes;
