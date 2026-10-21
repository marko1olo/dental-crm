import { Plus } from "lucide-react";
import type React from "react";
import {
	WAREHOUSE_CATALOG_PRESETS,
	type WarehouseBranchId,
} from "./warehouseTransferPresets.js";

export interface WarehouseTransferAddBarProps {
	readonly sourceBranchId: WarehouseBranchId;
	readonly selectedCatalogItemId: string;
	readonly onSelectCatalogItem: (itemId: string) => void;
	readonly addQuantity: number;
	readonly onAddQuantityChange: (qty: number) => void;
	readonly onAddItem: () => void;
}

export const WarehouseTransferAddBar: React.FC<WarehouseTransferAddBarProps> = ({
	sourceBranchId,
	selectedCatalogItemId,
	onSelectCatalogItem,
	addQuantity,
	onAddQuantityChange,
	onAddItem,
}) => {
	return (
		<div className="p-3 rounded-xl border border-line bg-paper-soft flex flex-wrap gap-2 items-center">
			<select
				value={selectedCatalogItemId}
				onChange={(e) => onSelectCatalogItem(e.target.value)}
				className="flex-1 min-w-[280px] h-9 sm:h-9 px-3 rounded-lg border border-line bg-paper text-ink text-sm"
			>
				{WAREHOUSE_CATALOG_PRESETS.map((p) => {
					const sourceStock = p.initialStockByBranch[sourceBranchId] ?? 0;
					return (
						<option key={p.id} value={p.id}>
							{p.nameRu} (Остаток на складе: {sourceStock} {p.unitRu})
						</option>
					);
				})}
			</select>

			<input
				type="number"
				min={1}
				value={addQuantity}
				onChange={(e) => onAddQuantityChange(Number(e.target.value))}
				className="w-20 h-9 sm:h-9 px-2 rounded-lg border border-line bg-paper text-ink text-sm text-center font-bold"
			/>

			<button
				type="button"
				onClick={onAddItem}
				className="wh-btn wh-btn-secondary !min-h-[36px] sm:min-h-[36px] h-9 sm:h-9 py-1 px-3 text-xs"
			>
				<Plus size={16} /> Добавить в накладную
			</button>
		</div>
	);
};
