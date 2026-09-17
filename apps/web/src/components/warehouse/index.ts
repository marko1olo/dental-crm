/**
 * apps/web/src/components/warehouse/index.ts
 *
 * Implements Mandate 8s (Law of Single Indivisible Authority):
 * Canonical transparent facade re-exporting from components/inventory.
 */

export * from "../inventory/index.js";
export { InventoryView, InventoryView as WarehouseView } from "../InventoryView.js";
