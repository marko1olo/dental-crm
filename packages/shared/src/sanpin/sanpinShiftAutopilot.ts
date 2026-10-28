/**
 * packages/shared/src/sanpin/sanpinShiftAutopilot.ts
 * Пакетный автопилот смены стерилизации и дезинфекции в 1 клик.
 * Фасад: строго <= 15 строк (Мандат 8b).
 */
export * from "./shiftAutopilot/types.js";
export * from "./shiftAutopilot/psoShiftGenerator.js";
export * from "./shiftAutopilot/autoclaveShiftGenerator.js";
export * from "./shiftAutopilot/secondaryLogsShiftGenerator.js";
export * from "./shiftAutopilot/bundleAssembler.js";
