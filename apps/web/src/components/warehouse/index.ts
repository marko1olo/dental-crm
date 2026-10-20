/**
 * apps/web/src/components/warehouse/index.ts
 *
 * Канонический мост обратной совместимости над единым SSOT в components/inventory/.
 * Все складские компоненты, списание (BOM) и FEFO консолидированы в components/inventory/
 * в полном соответствии с Мандатами 8e, 8n и 8s (Anti-Bloat / SSOT).
 * Строго <= 120 строк.
 */

export {
	InventoryStockTable as default,
	InventoryStockTable as WarehouseItemsTable,
} from "../inventory/InventoryStockTable.js";
export * from "../inventory/index.js";
