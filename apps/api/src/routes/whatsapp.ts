/**
 * WhatsApp Business Cloud API routes — Canonical Facade.
 * Decomposed into ./whatsappModules/ under Mandate 8b.
 */
export {
	isWebhookPath,
	registerWhatsappWebhookRoutes,
	registerWhatsappRoutes,
} from "./whatsappModules/index.js";
export * from "./whatsappModules/types.js";
