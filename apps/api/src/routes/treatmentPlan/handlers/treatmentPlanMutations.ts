/**
 * treatmentPlanMutations.ts — Фасад обработчиков мутаций планов лечения.
 *
 * Архитектурно декомпозирован на модули в папку ./mutations/:
 * - schemas.ts (Zod-схемы валидации)
 * - createTreatmentPlanHandler.ts (создание и базовые инварианты)
 * - stageOperationsHandler.ts (управление этапами плана)
 * - updateTreatmentPlanHandler.ts (редактирование, смена параметров)
 * - statusTreatmentPlanHandler.ts (утверждение, смены статусов)
 * - listTreatmentPlansHandler.ts (списки с пагинацией)
 * - upsertPatientTreatmentPlanHandler.ts (создание и ревизии плана у кресла)
 * - planLedgerSync.ts (синхронизация книги лечения treatment_items)
 *
 * Соответствует Мандатам 8b/8zi (Размер файлов 200–300 строк, сложный до 400-500)
 * и Мандату 8be (Анти-Any и строгость типов).
 * Сохраняет 100% обратную совместимость для всех роутов Fastify.
 */

export * from "./mutations/index.js";

