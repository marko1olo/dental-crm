import { AlertTriangle } from "lucide-react";
import React from "react";
import type { InventoryItem } from "../inventoryDataMappers.js";

export interface StockRowNameCellProps {
	readonly item: InventoryItem;
	readonly isLowStock: boolean;
	readonly isOverdraft: boolean;
	readonly catInfo: { label: string; className: string };
	readonly onSelectItem?: ((item: InventoryItem) => void) | undefined;
}

export const StockRowNameCell: React.FC<StockRowNameCellProps> = ({
	item,
	isLowStock,
	isOverdraft,
	catInfo,
	onSelectItem,
}) => {
	return (
		<>
			<td
				className="inventory-col-name"
				style={{ padding: "8px 10px", verticalAlign: "middle" }}
			>
				<div className="flex items-center gap-2 min-w-0">
					{isLowStock && (
						<span
							title={
								isOverdraft
									? "Мягкий учет расхода при нехватке (списание с дефицитом): остаток 0 или ниже"
									: "Критический остаток"
							}
							className="inline-flex shrink-0"
						>
							<AlertTriangle
								size={14}
								className={
									isOverdraft
										? "text-amber-600 dark:text-amber-400 shrink-0"
										: "text-rose-600 dark:text-rose-400 shrink-0"
								}
							/>
						</span>
					)}
					<div className="min-w-0 flex-1" style={{ flex: "1 1 auto", minWidth: 0 }}>
						<div
							className="font-bold text-[13px] text-[var(--ink)] cursor-pointer hover:text-[var(--teal)] transition-colors leading-snug"
							title={item.name}
							onClick={() => onSelectItem?.(item)}
						>
							{item.name}
						</div>
						<div className="text-[10px] text-[var(--muted)] font-mono flex items-center gap-2 mt-0.5">
							{item.sku && <span>SKU: {item.sku}</span>}
							{item.barcode && <span>ШК: {item.barcode}</span>}
							{item.lotNumber && (
								<span className="font-semibold text-[var(--ink)]">
									Партия: {item.lotNumber}
								</span>
							)}
						</div>
					</div>
				</div>
			</td>

			<td
				className="inventory-col-category"
				style={{ padding: "8px 8px", verticalAlign: "middle", whiteSpace: "nowrap" }}
			>
				<span
					className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${catInfo.className}`}
				>
					{catInfo.label}
				</span>
			</td>
		</>
	);
};

export default StockRowNameCell;
