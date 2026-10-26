/**
 * SHIFT BATCH DEDUCTION MODAL (ПАКЕТНОЕ СПИСАНИЕ МАТЕРИАЛОВ ЗА СМЕНУ)
 * Реэкспорт канонического SSOT-модуля BatchWriteoffModal.tsx.
 * Декомпозирован строго <= 120 строк в соответствии с Мандатом 8b.
 */

import { BatchWriteoffModal } from "./BatchWriteoffModal.js";
import type { ShiftBatchDeductionModalProps, ShiftBatchMode } from "./batchWriteoff/batchWriteoffTypes.js";

export * from "./batchWriteoff/batchWriteoffTypes.js";
export type { ShiftBatchDeductionModalProps, ShiftBatchMode };
export { BatchWriteoffModal as ShiftBatchDeductionModal };
export default BatchWriteoffModal;
