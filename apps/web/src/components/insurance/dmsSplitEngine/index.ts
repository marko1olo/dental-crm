/**
 * index.ts — Точка входа модуля dmsSplitEngine
 */

export { kopecksToRubles, rublesToKopecks } from "@dental/shared";
export * from "./types.js";
export * from "./matchers.js";
export * from "./calculateSingleItemSplit.js";
export * from "./splitCalculator.js";
export * from "./paymentSplitCalculator.js";
export * from "./fullSplitCalculator.js";
export * from "./registryBuilder.js";
export * from "./registryCsvExporter.js";
