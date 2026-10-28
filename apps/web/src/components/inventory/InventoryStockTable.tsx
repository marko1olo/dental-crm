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

export interface InventoryStockTableProps extends WarehouseStockTableProps {
	readonly hasMore?: boolean;
	readonly remainingCount?: number;
	readonly onShowMore?: () => void;
	readonly onOpenWarehouseManager?: () => void;
	readonly onOpenInventoryAudit?: () => void;
	readonly onCreateDisposalAct?: (item: any) => void;
}

export const InventoryStockTable: React.FC<InventoryStockTableProps> = (props) => {
	return <WarehouseStockTable {...props} />;
};

export const WarehouseItemsTable = InventoryStockTable;
export const StockBalanceTable = InventoryStockTable;
export default InventoryStockTable;
