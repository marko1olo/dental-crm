/**
 * index.ts — Layer 3: Master Route Coordinator and Barrel Export for Clinical Communications Routes.
 *
 * Coordinates:
 * - Layer 0: types.ts (Zod schemas, error messages, and TypeScript contracts)
 * - Layer 2: messagingServiceHandlers.ts (1-on-1 messages, inbox, and collaborative chat locks)
 * - Layer 2: campaignAndBroadcastHandlers.ts (message templates and broadcast campaigns with 152-FZ consent filter)
 * - Layer 2: telephonyAndCallWebhookHandlers.ts (PBX webhooks, call logs, and recording streams)
 */

import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { registerCampaignAndBroadcastHandlers } from "./campaignAndBroadcastHandlers.js";
import { registerMessagingServiceHandlers } from "./messagingServiceHandlers.js";
import { registerTelephonyAndCallWebhookHandlers } from "./telephonyAndCallWebhookHandlers.js";

export * from "./types.js";
export * from "./messagingServiceHandlers.js";
export * from "./campaignAndBroadcastHandlers.js";
export * from "./telephonyAndCallWebhookHandlers.js";

/**
 * Registers all omnichannel clinical communication routes on the Fastify instance.
 */
export async function registerCommunicationRoutes(
	app: FastifyInstance,
): Promise<void> {
	await registerMessagingServiceHandlers(app);
	await registerCampaignAndBroadcastHandlers(app);
	await registerTelephonyAndCallWebhookHandlers(app);
}

/**
 * Fastify plugin export alias following the canonical convention.
 */
export const communicationRoutes: FastifyPluginAsync = async (
	app: FastifyInstance,
) => {
	await registerCommunicationRoutes(app);
};
