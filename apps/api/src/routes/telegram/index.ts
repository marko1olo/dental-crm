import type { FastifyInstance } from "fastify";
import { requireTelegramControlPlaneAccess } from "./telegramRuntimeContext.js";
import { registerTelegramWebhookRoutes } from "./webhookIngress.js";
import { registerTelegramStatusRoutes } from "./telegramStatusRoutes.js";
import {
	registerTelegramSettingsRoutes,
	registerTelegramOutboxRoutes,
	registerTelegramLinkRoutes,
	registerTelegramPreviewRoutes,
	registerTelegramBillingRoutes,
} from "./telegramManagementRoutes.js";
import { registerTelegramConnectionHubRoutes } from "./telegramConnectionHub.js";

export { registerTelegramWebhookRoutes } from "./webhookIngress.js";
export { registerTelegramConnectionHubRoutes } from "./telegramConnectionHub.js";
export { registerTelegramTreatmentPlanCloserRoutes } from "../telegramTreatmentPlanCloser.js";

export {
	telegramPhotoSentTextFailedBlockedReason,
	type DenteTelegramOutboxDueWorkerHandle,
	type TelegramOutboxScheduleState,
	type TelegramOutboxDeliveredParts,
} from "./types.js";

export {
	telegramOutboxScheduleState,
	telegramOutboxDeliveredParts,
	telegramOutboxDeliveredPartsForItem,
	deliverTelegramOutboxParts,
} from "./telegramOutboxDelivery.js";

export {
	startDenteTelegramOutboxDueWorker,
} from "./telegramOutboxWorker.js";

export async function registerTelegramRoutes(app: FastifyInstance) {
	const telegramControlPlaneRouteOptions = {
		preHandler: requireTelegramControlPlaneAccess,
	};

	await registerTelegramWebhookRoutes(app);
	registerTelegramStatusRoutes(app, telegramControlPlaneRouteOptions);
	registerTelegramSettingsRoutes(app, telegramControlPlaneRouteOptions);
	registerTelegramOutboxRoutes(app, telegramControlPlaneRouteOptions);
	registerTelegramLinkRoutes(app, telegramControlPlaneRouteOptions);
	registerTelegramPreviewRoutes(app, telegramControlPlaneRouteOptions);
	registerTelegramBillingRoutes(app, telegramControlPlaneRouteOptions);
	registerTelegramConnectionHubRoutes(app);
}
