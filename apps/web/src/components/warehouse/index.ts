/**
 * apps/web/src/components/warehouse/index.ts
 *
 * Единый канонический SSOT домена «Склад, СанПиН и Стерилизация» (Warehouse & Inventory Authority).
 * Ликвидирует исторический раскол между inventory/ и warehouse/.
 * Мандаты 8e, 8n (Soft Negative Stock), 8s (Anti-Bloat). Строго <= 120 строк.
 */

// 1. Модули автоклавирования и списания расходников
export * from "./sterilizationCycle/index.js";

// 2. Накладные приемки и перемещения
export * from "./WarehouseWaybillsTab.js";
export * from "./waybillsTab/index.js";

// 3. Партионный учет и FEFO
export * from "./WarehouseBatchTrackingModal.js";
export * from "./batchTrackingModules/index.js";

// 4. Таблицы, остатки и каталог склада
export * from "./WarehouseInventoryTab.js";
export * from "./WarehouseItemsTable.js";
export * from "./WarehouseOverviewTab.js";
export * from "./WarehouseCatalogView.js";

// 5. Овердрафт, алерты и авто-списание (BOM)
export * from "./WarehouseStockAlertsBar.js";
export * from "./WarehouseStockAlertsActions.js";
export * from "./warehouseStockAlertsEngine.js";
export * from "./AutoBomDeductionBanner.js";
export * from "./AutoBomDeductionBannerActions.js";
export * from "./ConsumablesDeductionModal.js";

// 6. Канонические мосты обратной совместимости с inventory
export {
	ShiftBatchDeductionModal,
	type ShiftBatchDeductionModalProps,
} from "../inventory/ShiftBatchDeductionModal.js";
export {
	AcceptanceWaybillsModal,
	type AcceptanceWaybillsModalProps,
} from "../inventory/AcceptanceWaybillsModal.js";
export {
	ProcedureMaterialDeductionModal,
	type ProcedureMaterialDeductionModalProps,
} from "../inventory/ProcedureMaterialDeductionModal.js";
export {
	WarehouseTransferModal,
	type WarehouseTransferModalProps,
} from "../inventory/transfers/WarehouseTransferModal.js";
export {
	WarehouseManagerModal,
	type WarehouseManagerModalProps,
} from "../inventory/WarehouseManagerModal.js";
export {
	WarehouseInventoryAuditModal,
	type WarehouseInventoryAuditModalProps,
} from "../inventory/WarehouseInventoryAuditModal.js";
export * from "../inventory/autoBomDeductionEngine.js";
export * from "../inventory/fefoTrafficLight.js";
