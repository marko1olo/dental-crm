/**
 * TelegramBotPresets.ts
 *
 * Canonical facade re-exporting all presets, scenario engines, clinical FAQs,
 * menu builders, and TelegramBotPresetsEngine from ./presets/
 * Preserved for 100% backwards compatibility across routes, services, and tests.
 */

export type * from "./presets/types.js";
export * from "./presets/types.js";
export * from "./presets/index.js";
export {
	TELEGRAM_BOT_PRESETS,
	TelegramBotPresetsEngine,
} from "./presets/index.js";
