/**
 * apps/api/src/routes/sanpin/bactericidalModules/bactericidalShiftHandlers.ts
 *
 * Канонический фасад управления сменами бактерицидных облучателей (Мандат 8b: строго <= 120 строк).
 */

export * from "./shiftModules/bactericidalShiftAutopilotHandler.js";
export * from "./shiftModules/openMorningShiftHandler.js";
export * from "./shiftModules/closeEveningShiftHandler.js";
