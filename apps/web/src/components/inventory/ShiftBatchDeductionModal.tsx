/**
 * SHIFT BATCH DEDUCTION MODAL (ПАКЕТНОЕ СПИСАНИЕ МАТЕРИАЛОВ ЗА СМЕНУ)
 * Канонический реэкспорт SSOT ShiftBatchWriteoffModal (Мандаты 8b, 8e, 8n).
 */

import { ShiftBatchWriteoffModal, type ShiftBatchWriteoffModalProps } from "./ShiftBatchWriteoffModal.js";

export type ShiftBatchDeductionModalProps = ShiftBatchWriteoffModalProps;
export { ShiftBatchWriteoffModal as ShiftBatchDeductionModal };
export default ShiftBatchWriteoffModal;
