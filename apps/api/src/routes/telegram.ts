/**
 * telegram.ts
 *
 * Facade re-exporting all telegram routes, handlers, and outbox utilities from ./telegram/
 * Preserved for backwards compatibility across Fastify route registrations and tests.
 */

export type {
	DenteTelegramOutboxDueWorkerHandle,
	TelegramOutboxScheduleState,
	TelegramOutboxDeliveredParts,
} from "./telegram/index.js";

export * from "./telegram/index.js";
