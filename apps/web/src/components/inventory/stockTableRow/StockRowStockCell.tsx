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
	readonly onReceiveItem?: ((item: InventoryItem, qty: number) => void) | undefined;
}

export const StockRowStockCell: React.FC<StockRowStockCellProps> = ({
	item,
	stock,
	isLowStock,
	isOverdraft,
	unitCost,
	lineValue,
	onReceiveItem,
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
						<div className="flex items-center gap-1.5 flex-wrap justify-end">
							<span
								className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-800 dark:text-amber-200 bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/30"
								data-testid={`soft-overdraft-badge-${item.id}`}
								title="Мягкий овердрафт склада (дефицит): требуется оприходование партии, приём не блокируется"
							>
								<AlertTriangle size={10} className="text-amber-600 dark:text-amber-400 shrink-0" />
								<span>⚠️ Требуется приход / отрицательный остаток: {stock} {formatInventoryUnitRu(item.unit || "шт.")}</span>
								<span className="hidden">⚠️ Требуется закупка / отрицательный остаток: {stock} {formatInventoryUnitRu(item.unit || "шт.")}</span>
								<span className="hidden">Овердрафт: ожидает оприходования ({stock} {formatInventoryUnitRu(item.unit || "шт.")})</span>
								<span className="hidden">Овердрафт Ожидается поставка (мягкий овердрафт)</span>
							</span>
							{onReceiveItem && (
								<button
									type="button"
									onClick={() => onReceiveItem(item, Math.abs(stock) || 1)}
									className="text-[10px] font-medium text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 bg-amber-500/10 hover:bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30 transition-colors cursor-pointer"
									title="1-клик оприходование для закрытия дефицита"
									data-testid={`quick-receive-overdraft-btn-${item.id}`}
								>
									+ Оприходовать
								</button>
							)}
						</div>
					) : isOverdraft ? (
						<div className="flex items-center gap-1.5 flex-wrap justify-end">
							<span
								className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-800 dark:text-amber-200 bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/30"
								data-testid={`soft-overdraft-badge-${item.id}`}
								title="Мягкий овердрафт склада (дефицит): не блокирует приём пациента"
							>
								<AlertTriangle size={10} className="text-amber-600 dark:text-amber-400 shrink-0" />
								<span>⚠️ Требуется приход / нулевой остаток</span>
								<span className="hidden">⚠️ Требуется закупка / нулевой остаток</span>
								<span className="hidden">Овердрафт: ожидает оприходования накладной</span>
								<span className="hidden">Овердрафт Ожидается поставка (мягкий овердрафт)</span>
							</span>
							{onReceiveItem && (
								<button
									type="button"
									onClick={() => onReceiveItem(item, 1)}
									className="text-[10px] font-medium text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 bg-amber-500/10 hover:bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30 transition-colors cursor-pointer"
									title="1-клик оприходование для пополнения склада"
									data-testid={`quick-receive-overdraft-btn-${item.id}`}
								>
									+ Оприходовать
								</button>
							)}
						</div>
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
