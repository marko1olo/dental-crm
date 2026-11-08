/**
 * treatmentPlanCrudHandlers.ts — Канонические CRUD обработчики планов лечения (SSOT).
 * Консолидированы в едином сервисе мутаций handlers/treatmentPlanMutations.ts
 * с обязательной сквозной синхронизацией книги лечения (treatment_items).
 */

export * from "./handlers/treatmentPlanMutations.js";
