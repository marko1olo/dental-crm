/**
 * Barrel index for Telegram Bot Hosting subsystem (Layer 5).
 * Re-exports all domain types, crypto vaults, lifecycle handlers,
 * instance pools, rate limiters, formatters, and the core hosting service.
 */

export type * from "./types.js";
export * from "./types.js";
export * from "./tokenCrypto.js";
export * from "./webhookLifecycle.js";
export * from "./clinicalCareInstructions.js";
export * from "./staffScheduleFormatter.js";
export * from "./intercomStaffNotifier.js";
export * from "./botInstancePool.js";
export * from "./telegramRateLimiter.js";
export * from "./hostingCoreService.js";

// Alias TelegramHostingCoreService as TelegramBotHostingService for seamless drop-in parity
export { TelegramHostingCoreService as TelegramBotHostingService } from "./hostingCoreService.js";
