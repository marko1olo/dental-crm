/**
 * communications.ts — Canonical Thin Facade for Omnichannel Clinical Communications Routes.
 *
 * Wave 28 Decomposed Architecture.
 * Re-exports the complete route plugin, handlers, and Zod schemas from:
 * - `./communicationRoutes/types.js`: Zod schemas and TypeScript contracts
 * - `./communicationRoutes/messagingServiceHandlers.js`: 1-on-1 messaging & inbox handlers
 * - `./communicationRoutes/campaignAndBroadcastHandlers.js`: Templates & service broadcast campaigns
 * - `./communicationRoutes/telephonyAndCallWebhookHandlers.js`: PBX webhooks & call recording handlers
 * - `./communicationRoutes/index.js`: Fastify route plugin coordinator (`registerCommunicationRoutes`)
 */

export * from "./communicationRoutes/index.js";
