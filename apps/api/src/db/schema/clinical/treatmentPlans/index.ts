/**
 * index.ts — Единый фасад схемы планов лечения, смет и клинических этапов.
 * Ре-экспортирует таблицы базы данных, токены заморозки цен, позиции смет и Zod-схемы.
 */

export * from "./treatmentPlansTable.js";
export * from "./treatmentPlanItemsTable.js";
export * from "./treatmentPlanZodSchemas.js";
