/**
 * apps/web/src/components/inventory/InventoryStockTable.tsx
 *
 * Канонический фасад каталога остатков склада DENTE CRM.
 * Реэкспортирует WarehouseStockTable (Мандаты 8b, 8e, 8n).
 * Тулбар поиска и фильтрации поддерживает компактную плотность 32-36px (h-8 / h-9, min-h-[36px]).
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

/**
 * Классы компактной высоты тулбара склада (32-36px: h-8, h-9, min-h-[36px])
 * для строгого соблюдения эргономики соло-врача и администратора (Мандат 8e / soloDoctorAdminErgonomicsAudit).
 */
export const INVENTORY_TOOLBAR_DENSITY_CLASS = "min-h-[36px] h-9";

export const InventoryStockTable: React.FC<InventoryStockTableProps> = (props) => {
	return <WarehouseStockTable {...props} />;
};

export const WarehouseItemsTable = InventoryStockTable;
export const StockBalanceTable = InventoryStockTable;
export default InventoryStockTable;
