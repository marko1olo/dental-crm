/**
 * orthopedicsPresets.ts — Канонические стандарты ЗТЛ, границы препарирования и шкалы VITA.
 *
 * Mandate 8b: Модульная декомпозиция (строго <= 120 строк на файл).
 * Mandate 8e & 8n: Практичный выбор врача без блокирующих диалогов, расчет ЗТЛ в копейках.
 */

export * from "./presets/ztlPresetTypes.js";
export * from "./presets/ztlOrderPresets.js";
export * from "./presets/fixationPresets.js";
export * from "./presets/stumpShadePresets.js";
export * from "./presets/preparationMarginPresets.js";
export * from "./presets/vita3dMasterPresets.js";
