/**
 * marketingAnalyticsEngine.ts — Фасад чистого аналитического движка маркетинга (Мандат 8b / Sweet Spot).
 * Полная реализация вынесена в сфокусированные модули:
 * - marketingAnalyticsUtils.ts: детекторы каналов, утилиты номеров и справочники
 * - marketingAttributionCalculator.ts: расчет сквозной атрибуции, ROMI и CAC
 * - marketingFunnelCalculator.ts: расчет воронки самозаписи и сводки отчетов
 */

export * from "./marketingAnalyticsUtils.js";
export * from "./marketingAttributionCalculator.js";
export * from "./marketingFunnelCalculator.js";
