/**
 * TelegramBotHostingService.ts
 *
 * Canonical facade re-exporting all types, crypto handlers, instance pools,
 * rate limiters, and TelegramBotHostingService class from ./hosting/
 * Preserved for 100% backwards compatibility across routes, services, and tests.
 */

export type * from "./hosting/types.js";
export * from "./hosting/types.js";
export * from "./hosting/index.js";
export { TelegramHostingCoreService as TelegramBotHostingService } from "./hosting/hostingCoreService.js";
