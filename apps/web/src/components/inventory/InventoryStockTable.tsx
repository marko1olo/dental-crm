/**
 * apps/web/src/components/inventory/InventoryStockTable.tsx
 *
 * Канонический фасад каталога остатков склада DENTE CRM.
 * Реэкспортирует WarehouseStockTable (Мандаты 8b, 8e, 8n).
 */

import React from "react";
import {
	WarehouseStockTable,
	type WarehouseStockItem,
	type WarehouseStockTableProps,
} from "./WarehouseStockTable.js";

export * from "./WarehouseStockTable.js";
export {
	getExpiryTrafficLight,
	getWarehouseFefoTrafficLight,
	getCategoryBadge,
	formatExpDate,
	type ExpiryTrafficLightInfo,
	type ExpiryTrafficStatus,
	type FefoTrafficLightInfo,
} from "./inventoryExpiryUtils.js";

export interface InventoryStockTableProps extends WarehouseStockTableProps {
	readonly hasMore?: boolean | undefined;
	readonly remainingCount?: number | undefined;
	readonly onShowMore?: (() => void) | undefined;
	readonly onOpenWarehouseManager?: (() => void) | undefined;
	readonly onOpenInventoryAudit?: (() => void) | undefined;
	readonly onCreateDisposalAct?: ((item: WarehouseStockItem | any) => void) | undefined;
}

export const InventoryStockTable: React.FC<InventoryStockTableProps> = (props) => {
	return <WarehouseStockTable {...props} />;
};

export const WarehouseItemsTable = InventoryStockTable;
export const StockBalanceTable = InventoryStockTable;
export default InventoryStockTable;
