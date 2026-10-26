/**
 * WAREHOUSE BATCH WRITEOFF MODAL (SSOT ПАКЕТНОЕ СПИСАНИЕ РАСХОДНИКОВ)
 * Реэкспорт канонического SSOT-модуля BatchWriteoffModal.tsx.
 * Декомпозирован строго <= 120 строк в соответствии с Мандатом 8b.
 */

import { BatchWriteoffModal } from "./BatchWriteoffModal.js";
import type { WarehouseBatchWriteoffModalProps, WriteoffActiveTab } from "./batchWriteoff/batchWriteoffTypes.js";

export type { WarehouseBatchWriteoffModalProps, WriteoffActiveTab };
export { BatchWriteoffModal as WarehouseBatchWriteoffModal };
export default BatchWriteoffModal;
