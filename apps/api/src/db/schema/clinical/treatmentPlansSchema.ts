/**
 * treatmentPlansSchema.ts — Канонический фасад схемы планов лечения, смет и услуг.
 *
 * Декомпозирован по Мандатам 8b и 8zi на чистые когезивные модули:
 * - treatmentPlans/treatmentPlansTable.ts — таблицы планов treatmentPlans, этапов, сценариев
 * - treatmentPlans/treatmentPlanItemsTable.ts — позиции treatmentPlanItemsNew, каталог услуг
 * - treatmentPlans/treatmentPlanZodSchemas.ts — канонические Zod-схемы валидации API
 *
 * Обеспечивает 100% обратную совместимость существующих импортов.
 */

export * from "./treatmentPlans/index.js";
