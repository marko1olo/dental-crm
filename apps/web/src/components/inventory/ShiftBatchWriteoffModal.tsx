/**
 * apps/web/src/components/inventory/ShiftBatchWriteoffModal.tsx
 *
 * Канонический реэкспорт SSOT WarehouseBatchWriteoffModal (Мандаты 8b, 8e, 8n).
 */

import {
	WarehouseBatchWriteoffModal,
	type WarehouseBatchWriteoffModalProps,
	type ShiftBatchSummaryData,
	type ShiftBatchSummaryItem,
} from "./WarehouseBatchWriteoffModal.js";

export type ShiftBatchWriteoffModalProps = WarehouseBatchWriteoffModalProps;
export type { ShiftBatchSummaryData, ShiftBatchSummaryItem };
export { WarehouseBatchWriteoffModal as ShiftBatchWriteoffModal };
export default WarehouseBatchWriteoffModal;
