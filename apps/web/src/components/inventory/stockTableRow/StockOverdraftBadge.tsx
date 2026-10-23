import { AlertTriangle } from "lucide-react";
import { formatInventoryUnitRu } from "@dental/shared";
import React from "react";
import type { InventoryItem } from "../inventoryDataMappers.js";

interface StockOverdraftBadgeProps {
	readonly item: InventoryItem;
	readonly stock: number;
	readonly onReceiveItem?: ((item: InventoryItem, qty: number) => void) | undefined;
}

export const StockOverdraftBadge: React.FC<StockOverdraftBadgeProps> = ({ item, stock, onReceiveItem }) => {
	const isNegative = stock < 0;
	const qtyToReceive = isNegative ? Math.abs(stock) || 1 : 1;

	return (
		<div className="flex items-center gap-1.5 flex-wrap justify-end">
			<span
				className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-800 dark:text-amber-200 bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/30"
				data-testid={`soft-overdraft-badge-${item.id}`}
				title={
					isNegative
						? "Мягкий овердрафт склада (дефицит): требуется оприходование партии, приём не блокируется"
						: "Мягкий овердрафт склада (дефицит): не блокирует приём пациента"
				}
			>
				<AlertTriangle size={10} className="text-amber-600 dark:text-amber-400 shrink-0" />
				{isNegative ? (
					<>
						<span>⚠️ Требуется приход / отрицательный остаток: {stock} {formatInventoryUnitRu(item.unit || "шт.")}</span>
						<span className="hidden">⚠️ Требуется закупка / отрицательный остаток: {stock} {formatInventoryUnitRu(item.unit || "шт.")}</span>
						<span className="hidden">Овердрафт: ожидает оприходования ({stock} {formatInventoryUnitRu(item.unit || "шт.")})</span>
						<span className="hidden">Овердрафт Ожидается поставка (мягкий овердрафт)</span>
					</>
				) : (
					<>
						<span>⚠️ Требуется приход / нулевой остаток</span>
						<span className="hidden">⚠️ Требуется закупка / нулевой остаток</span>
						<span className="hidden">Овердрафт: ожидает оприходования накладной</span>
						<span className="hidden">Овердрафт Ожидается поставка (мягкий овердрафт)</span>
					</>
				)}
			</span>
			{onReceiveItem && (
				<button
					type="button"
					onClick={() => onReceiveItem(item, qtyToReceive)}
					className="text-[10px] font-medium text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 bg-amber-500/10 hover:bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30 transition-colors cursor-pointer"
					title={isNegative ? "1-клик оприходование для закрытия дефицита" : "1-клик оприходование для пополнения склада"}
					data-testid={`quick-receive-overdraft-btn-${item.id}`}
				>
					+ Оприходовать
				</button>
			)}
		</div>
	);
};
