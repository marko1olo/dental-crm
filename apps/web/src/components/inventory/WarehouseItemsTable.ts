/**
 * WarehouseItemsTable.ts — Canonical re-export of InventoryStockTable (SSOT).
 * Mandates 8e, 8n, 8s (Anti-Bloat & Single Domain Authority).
 */

export * from "./InventoryStockTable.js";
export {
	InventoryStockTable as default,
	InventoryStockTable as WarehouseItemsTable,
} from "./InventoryStockTable.js";
