/**
 * CRM END-TO-END FUNNEL & MARKETING INTELLIGENCE ENGINE (WAVE 28)
 *
 * Сводный фасад модулей сквозной аналитики воронки лидов клиники.
 * Полные реэкспорты всех типов, конверсионных калькуляторов, SLA-трекеров,
 * детекторов утечек воронки и утилит экспорта.
 */

// Layer 0: Types & Schemas
export * from "./types.js";

// Layer 1 & 2: Pure Calculators & Engines
export * from "./funnelConversionCalculator.js";
export * from "./speedToLeadSlaTracker.js";
export * from "./crmLeakDetectorEngine.js";
