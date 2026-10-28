/**
 * apps/web/src/components/inventory/WarehouseBatchWriteoffModal.tsx
 *
 * Канонический реэкспорт SSOT ConsumablesBatchWriteoffModal (Мандаты 8b, 8e, 8n).
 */

import {
	ConsumablesBatchWriteoffModal,
	type ConsumablesBatchWriteoffModalProps,
	type ShiftBatchWriteoffData,
	type ShiftConsumableItem,
} from "./ConsumablesBatchWriteoffModal.js";

export type WarehouseBatchWriteoffModalProps = ConsumablesBatchWriteoffModalProps;
export type ShiftBatchSummaryData = ShiftBatchWriteoffData;
export type ShiftBatchSummaryItem = ShiftConsumableItem;

export { ConsumablesBatchWriteoffModal as WarehouseBatchWriteoffModal };
export default ConsumablesBatchWriteoffModal;
