import { Trash2 } from "lucide-react";
import type React from "react";
import { kopecksToRubles, type WarehouseTransferLineItem } from "./warehouseTransferEngine.js";

export interface WarehouseTransferTableRowProps {
	readonly item: WarehouseTransferLineItem;
	readonly index: number;
	readonly currentStock: number;
	readonly onUpdateItem: (index: number, patch: Partial<WarehouseTransferLineItem>) => void;
	readonly onRemoveItem: (index: number) => void;
}

export const WarehouseTransferTableRow: React.FC<WarehouseTransferTableRowProps> = ({
	item,
	index,
	currentStock,
	onUpdateItem,
	onRemoveItem,
}) => {
	const unitRub = kopecksToRubles(item.unitCostKopecks);
	const totalRub = (item.dispatchedQuantity * item.unitCostKopecks) / 100;
	const diff = item.dispatchedQuantity - item.receivedQuantity;
	const requiredQty = item.dispatchedQuantity > 0 ? item.dispatchedQuantity : item.requestedQuantity;
	const isOverdraftItem = requiredQty > currentStock;
	const deficit = Math.max(0, requiredQty - currentStock);

	return (
		<tr>
			<td className="min-w-0 max-w-xs">
				<div className="font-semibold text-ink leading-tight truncate" title={item.nameRu}>
					{item.nameRu}
				</div>
				<div className="flex items-center gap-2 mt-0.5 flex-wrap">
					<span className="text-xs text-muted font-mono">{item.sku}</span>
					<span className="text-[11px] text-muted">
						(Остаток:{" "}
						<span className={currentStock <= 0 ? "text-amber-600 font-bold" : "font-semibold text-ink"}>
							{currentStock} {item.unitRu}
						</span>)
					</span>
					{isOverdraftItem && (
						<span
							className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded"
							title="Списание с дефицитом (мягкий учет)"
						>
							Дефицит -{deficit} {item.unitRu}
						</span>
					)}
				</div>
			</td>
			<td>
				<input
					type="text"
					value={item.batchNumber}
					onChange={(e) => onUpdateItem(index, { batchNumber: e.target.value })}
					className="w-24 h-8 px-2 rounded border border-line bg-paper text-xs font-mono"
				/>
			</td>
			<td>
				<input
					type="date"
					value={item.expiryDate}
					onChange={(e) => onUpdateItem(index, { expiryDate: e.target.value })}
					className="w-32 h-8 px-2 rounded border border-line bg-paper text-xs"
				/>
			</td>
			<td className="text-center font-semibold">
				{item.requestedQuantity} {item.unitRu}
			</td>
			<td className="text-center">
				<input
					type="number"
					min={0}
					value={item.dispatchedQuantity}
					onChange={(e) => onUpdateItem(index, { dispatchedQuantity: Number(e.target.value) })}
					className="w-16 h-8 text-center font-bold rounded border border-line bg-paper text-xs"
				/>
			</td>
			<td className="text-center">
				<input
					type="number"
					min={0}
					value={item.receivedQuantity}
					onChange={(e) => onUpdateItem(index, { receivedQuantity: Number(e.target.value) })}
					className="w-16 h-8 text-center font-bold rounded border border-line bg-paper text-xs"
				/>
			</td>
			<td className="text-right font-medium text-muted">{unitRub.toFixed(2)}</td>
			<td className="text-right font-black text-ink">{totalRub.toFixed(2)}</td>
			<td className="text-center">
				{diff !== 0 ? (
					<span className="text-xs font-bold text-bad-fg bg-bad-bg px-2 py-0.5 rounded-full">
						{diff > 0 ? `Недостача -${diff}` : `Излишек +${Math.abs(diff)}`}
					</span>
				) : (
					<span className="text-xs font-semibold text-ok-fg">ОК</span>
				)}
			</td>
			<td className="text-center">
				<button
					type="button"
					onClick={() => onRemoveItem(index)}
					className="text-muted hover:text-bad-fg p-1.5 rounded transition-colors"
					title="Удалить позицию"
				>
					<Trash2 size={16} />
				</button>
			</td>
		</tr>
	);
};
