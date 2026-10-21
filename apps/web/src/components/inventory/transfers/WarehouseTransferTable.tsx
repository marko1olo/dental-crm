import { Boxes } from "lucide-react";
import type React from "react";
import type { WarehouseTransferLineItem } from "./warehouseTransferEngine.js";
import { WarehouseTransferTableRow } from "./WarehouseTransferTableRow.js";

export interface WarehouseTransferTableProps {
	readonly items: readonly WarehouseTransferLineItem[];
	readonly getAvailableStock: (itemId: string) => number;
	readonly onUpdateItem: (index: number, patch: Partial<WarehouseTransferLineItem>) => void;
	readonly onRemoveItem: (index: number) => void;
}

export const WarehouseTransferTable: React.FC<WarehouseTransferTableProps> = ({
	items,
	getAvailableStock,
	onUpdateItem,
	onRemoveItem,
}) => {
	return (
		<div className="flex flex-col gap-2">
			<div className="flex items-center justify-between">
				<div className="font-bold text-sm flex items-center gap-1.5">
					<Boxes size={18} className="text-teal-600" />
					<span>Товарно-материальные ценности к перемещению</span>
				</div>
				<div className="text-xs text-muted">
					Позиций: <span className="font-bold text-ink">{items.length}</span>
				</div>
			</div>

			<div className="wh-table-container">
				<table className="wh-table">
					<thead>
						<tr>
							<th>Товар / Артикул</th>
							<th>Серия (LOT)</th>
							<th>Срок годности</th>
							<th className="text-center">Запрошено</th>
							<th className="text-center">Отпущено</th>
							<th className="text-center">Принято</th>
							<th className="text-right">Цена, ₽</th>
							<th className="text-right">Сумма, ₽</th>
							<th className="text-center">Расхождение</th>
							<th></th>
						</tr>
					</thead>
					<tbody>
						{items.map((item, index) => (
							<WarehouseTransferTableRow
								key={item.itemId}
								item={item}
								index={index}
								currentStock={getAvailableStock(item.itemId)}
								onUpdateItem={onUpdateItem}
								onRemoveItem={onRemoveItem}
							/>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
};
