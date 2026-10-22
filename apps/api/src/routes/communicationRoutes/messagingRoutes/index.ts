import type { FastifyInstance } from "fastify";
import { registerChatLockHandlers } from "./chatLockHandlers.js";
import { registerChatUnlockHandlers } from "./chatUnlockHandlers.js";
import { registerCommunicationTasksHandlers } from "./communicationTasksHandlers.js";
import { registerInboxOverviewHandlers } from "./inboxOverviewHandlers.js";
import { registerInboxSendHandlers } from "./inboxSendHandlers.js";
import { registerInboxThreadHandlers } from "./inboxThreadHandlers.js";

export async function registerMessagingServiceHandlers(
	app: FastifyInstance,
): Promise<void> {
	registerCommunicationTasksHandlers(app);
	registerInboxOverviewHandlers(app);
	registerInboxThreadHandlers(app);
	registerInboxSendHandlers(app);
	registerChatLockHandlers(app);
	registerChatUnlockHandlers(app);
}
