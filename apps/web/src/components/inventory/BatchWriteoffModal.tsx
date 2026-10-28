/**
 * BATCH WRITEOFF MODAL (SSOT ПАКЕТНОЕ СПИСАНИЕ РАСХОДНИКОВ)
 * Канонический реэкспорт SSOT ShiftBatchWriteoffModal (Мандаты 8b, 8e, 8n).
 */

import { ShiftBatchWriteoffModal, type ShiftBatchWriteoffModalProps } from "./ShiftBatchWriteoffModal.js";

export type BatchWriteoffModalProps = ShiftBatchWriteoffModalProps & {
	activeTab?: string;
	onTabChange?: (tab: string) => void;
	procedureTitle?: string;
	serviceCode?: string;
	patientName?: string;
	toothNumber?: number;
	visitId?: string;
};

export { ShiftBatchWriteoffModal as BatchWriteoffModal };
export default ShiftBatchWriteoffModal;
