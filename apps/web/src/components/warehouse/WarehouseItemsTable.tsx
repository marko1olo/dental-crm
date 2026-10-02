/**
 * WarehouseItemsTable.tsx — Canonical facade re-exporting InventoryStockTable (SSOT).
 *
 * All inventory table logic is unified in `apps/web/src/components/inventory/InventoryStockTable.tsx`
 * in accordance with Mandate 8s (Universal Anti-Bloat & Single Source of Truth).
 */

export * from "../inventory/InventoryStockTable.js";
export {
	InventoryStockTable as default,
	InventoryStockTable as WarehouseItemsTable,
} from "../inventory/InventoryStockTable.js";
