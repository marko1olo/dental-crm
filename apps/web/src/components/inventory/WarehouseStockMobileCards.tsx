/**
 * apps/web/src/components/inventory/WarehouseStockMobileCards.tsx
 *
 * Мобильные сгруппированные карточки остатков склада (iOS HIG style, Мандат 8ze).
 * Реализует Natural Thumb Zone, высоту строк >= 52px и тач-таргеты >= 44x44px.
 */

import React from "react";
import { Edit2, MinusCircle, PlusCircle } from "lucide-react";
import type { WarehouseStockItem } from "./WarehouseStockTable.js";

export interface WarehouseStockMobileCardsProps {
	readonly items: WarehouseStockItem[];
	readonly onSelectItem?: ((item: WarehouseStockItem) => void) | undefined;
	readonly onReceiveItem?: ((item: WarehouseStockItem) => void) | undefined;
	readonly onDeductItem?: ((item: WarehouseStockItem) => void) | undefined;
	readonly onEditItem?: ((item: WarehouseStockItem) => void) | undefined;
}

export const WarehouseStockMobileCards: React.FC<WarehouseStockMobileCardsProps> = ({
	items,
	onSelectItem,
	onReceiveItem,
	onDeductItem,
	onEditItem,
}) => {
	return (
		<div className="flex flex-col gap-2.5 overflow-x-clip max-w-[100vw]" data-testid="warehouse-mobile-cards">
			{items.map((item) => {
				const qty = Number(item.stockQuantity ?? item.currentQty ?? 0);
				const isOverdraft = qty < 0;
				const unit = item.unit || "шт.";
				return (
					<div
						key={item.id}
						className="p-3.5 bg-[var(--paper)] rounded-2xl border border-[var(--line)] shadow-xs flex flex-col gap-2"
						onClick={() => onSelectItem?.(item)}
					>
						<div className="flex items-start justify-between gap-2">
							<div className="flex-1 min-w-0">
								<h4 className="text-sm font-semibold text-[var(--ink)] leading-snug line-clamp-2">
									{item.name}
								</h4>
								<span className="text-[11px] text-[var(--muted)]">
									{item.category || "Материал"}
									{item.lotNumber ? ` • Серия ${item.lotNumber}` : ""}
								</span>
							</div>
							<div className="text-right shrink-0">
								{isOverdraft ? (
									<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
										⚠️ {qty} {unit}
									</span>
								) : qty === 0 ? (
									<span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--paper-soft)] text-[var(--muted)] border border-[var(--line-subtle)]">
										0 {unit}
									</span>
								) : (
									<span className="inline-flex px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
										{qty} {unit}
									</span>
								)}
							</div>
						</div>

						<div className="flex items-center justify-between pt-2 border-t border-[var(--line-subtle)] gap-2">
							<span className="text-xs text-[var(--muted)]">
								{item.unitCostRub ? `${Number(item.unitCostRub).toLocaleString("ru-RU")} ₽/${unit}` : "—"}
							</span>
							<div className="flex items-center gap-1.5">
								{onDeductItem && (
									<button
										type="button"
										onClick={(e) => {
											e.stopPropagation();
											onDeductItem(item);
										}}
										className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-[var(--paper-soft)] text-[var(--ink)] hover:text-red-500 border border-[var(--line-subtle)]"
										aria-label={`Списать ${item.name}`}
									>
										<MinusCircle size={18} />
									</button>
								)}
								{onReceiveItem && (
									<button
										type="button"
										onClick={(e) => {
											e.stopPropagation();
											onReceiveItem(item);
										}}
										className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-[var(--paper-soft)] text-[var(--ink)] hover:text-emerald-500 border border-[var(--line-subtle)]"
										aria-label={`Приход ${item.name}`}
									>
										<PlusCircle size={18} />
									</button>
								)}
								{onEditItem && (
									<button
										type="button"
										onClick={(e) => {
											e.stopPropagation();
											onEditItem(item);
										}}
										className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] border border-[var(--line-subtle)]"
										aria-label={`Редактировать ${item.name}`}
									>
										<Edit2 size={16} />
									</button>
								)}
							</div>
						</div>
					</div>
				);
			})}
		</div>
	);
};

export default WarehouseStockMobileCards;
