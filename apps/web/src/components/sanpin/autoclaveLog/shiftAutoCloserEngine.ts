/**
 * =======================================================================

 * SANPIN AUTOMATED SHIFT CLOSER & BATCH DOCUMENTATION ENGINE (FACADE)
 * (СанПиН 3.3686-21, СанПиН 2.1.3684-21, Р 3.5.1904-04, Приказ 706н)
 * =======================================================================

 *
 * Архитектурный фасад автоматизированного фонового закрытия смены и месяца
 * без рутинных кликов врача или медсестры (Мандаты 8e, 8k, 8n, 8v):
 *
 * Тонкий фасад (Мандат 8b, <= 50 строк, реэкспорт всех символов).
 * Вся доменная логика декомпозирована в ./shiftCloser/:
 * - <shiftCloser/types.ts>
 * - <shiftCloser/form257Compiler.ts>
 * - <shiftCloser/psoCompiler.ts>
 * - <shiftCloser/microclimateWasteCompiler.ts>
 * - <shiftCloser/batchOrchestrator.ts>
 */

export type * from "./shiftCloser/index.js";
export * from "./shiftCloser/index.js";
