import { AlertTriangle } from "lucide-react";
import { formatInventoryUnitRu } from "@dental/shared";
import React from "react";
import { money } from "../../../AppHelpers.js";
import type { InventoryItem } from "../inventoryDataMappers.js";

export interface StockRowStockCellProps {
	readonly item: InventoryItem;
	readonly stock: number;
	readonly isLowStock: boolean;
	readonly isOverdraft: boolean;
	readonly unitCost: number | null;
	readonly lineValue: number | null;
}

export const StockRowStockCell: React.FC<StockRowStockCellProps> = ({
	item,
	stock,
	isLowStock,
	isOverdraft,
	unitCost,
	lineValue,
}) => {
	return (
		<>
			{/* 4. Остаток */}
			<td
				className="inventory-col-stock"
				style={{ padding: "8px 8px", verticalAlign: "middle", textAlign: "right", whiteSpace: "nowrap" }}
			>
				<div className="flex flex-col items-end gap-0.5 whitespace-nowrap">
					<span
						className={`inventory-stock-badge font-mono font-bold ${
							isOverdraft ? "overdraft text-amber-600 dark:text-amber-400" : isLowStock ? "low text-orange-600 dark:text-orange-400" : "normal text-[var(--ink)]"
						}`}
					>
						{stock}&nbsp;{formatInventoryUnitRu(item.unit || "шт.")}
					</span>
					{stock < 0 ? (
						<span
							className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-800 dark:text-amber-200 bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/30"
							data-testid={`soft-overdraft-badge-${item.id}`}
							title="Мягкий овердрафт склада (дефицит): требуется оприходование партии, приём не блокируется"
						>
							<AlertTriangle size={10} className="text-amber-600 dark:text-amber-400 shrink-0" />
							<span>⚠️ Требуется закупка / отрицательный остаток: {stock} {formatInventoryUnitRu(item.unit || "шт.")}</span>
							<span className="hidden">Овердрафт: ожидает оприходования ({stock} {formatInventoryUnitRu(item.unit || "шт.")})</span>
							<span className="hidden">Овердрафт Ожидается поставка (мягкий овердрафт)</span>
						</span>
					) : isOverdraft ? (
						<span
							className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-800 dark:text-amber-200 bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/30"
							data-testid={`soft-overdraft-badge-${item.id}`}
							title="Мягкий овердрафт склада (дефицит): не блокирует приём пациента"
						>
							<AlertTriangle size={10} className="text-amber-600 dark:text-amber-400 shrink-0" />
							<span>⚠️ Требуется закупка / нулевой остаток</span>
							<span className="hidden">Овердрафт: ожидает оприходования накладной</span>
							<span className="hidden">Овердрафт Ожидается поставка (мягкий овердрафт)</span>
						</span>
					) : null}
				</div>
			</td>

			{/* 5. Мин. запас */}
			<td
				className="inventory-col-threshold"
				style={{ padding: "8px 8px", verticalAlign: "middle", textAlign: "right", whiteSpace: "nowrap" }}
			>
				<span className="font-mono text-xs text-[var(--muted)]">
					{item.criticalThreshold ?? 5}&nbsp;{formatInventoryUnitRu(item.unit || "шт.")}
				</span>
			</td>

			{/* 6. Себестоимость */}
			<td
				className="inventory-col-cost"
				style={{
					padding: "8px 12px 8px 8px",
					verticalAlign: "middle",
					textAlign: "right",
					whiteSpace: "nowrap",
					width: 130,
					minWidth: 130,
				}}
			>
				<div className="flex flex-col items-end gap-0.5 whitespace-nowrap w-full">
					<span className="font-mono text-xs font-semibold text-[var(--ink)]">
						{unitCost !== null ? money(unitCost) : "—"}
					</span>
					{lineValue !== null && lineValue > 0 && (
						<span className="text-[10px] text-[var(--muted)] font-mono">
							∑&nbsp;{money(lineValue)}
						</span>
					)}
				</div>
			</td>
		</>
	);
};

export default StockRowStockCell;
