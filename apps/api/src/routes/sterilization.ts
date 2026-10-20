/**
 * apps/api/src/routes/sterilization.ts
 *
 * Единый канонический фасад домена стерилизации и автоклавирования.
 * Делегирует единому SSOT в routes/sanpin/sterilizationRoutes.js.
 * Мандат 8b: строго <= 120 строк.
 */

export * from "./sanpin/sterilizationRoutes.js";
