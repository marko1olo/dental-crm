import React from "react";
import {
	InventoryStockTable as InternalInventoryStockTable,
	type InventoryStockTableProps,
} from "./inventory/InventoryStockTable.js";

export * from "./inventory/InventoryStockTable.js";

/**
 * Презентационная таблица складских остатков и критических запасов (Мандаты 8b, 8e, 8n).
 * Канонический фасад компонента склада в пространстве components/.
 */
export const InventoryStockTable: React.FC<InventoryStockTableProps> = (props) => {
	return <InternalInventoryStockTable {...props} />;
};

export default InventoryStockTable;
