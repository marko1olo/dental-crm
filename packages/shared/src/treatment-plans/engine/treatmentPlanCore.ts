/**
 * treatmentPlanCore.ts — Ядро планов лечения и смет DENTE CRM.
 * Декомпозирован строго по Мандату 8b (лимит строк <= 120 на файл).
 */

export * from "./treatmentPlanItemNormalizer.js";
export * from "./treatmentPlanTierCalculator.js";
export * from "./treatmentPlanMultiOptionBuilder.js";
export * from "./treatmentPlanAppendix1DataBuilder.js";
export * from "./treatmentPlanAppendix1StagesHtml.js";
export * from "./treatmentPlanAppendix1HtmlRenderer.js";
export * from "./treatmentPlanFormatters.js";
