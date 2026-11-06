import { Minus, Package, Plus } from "lucide-react";
import React from "react";
import type { InventoryItem } from "../inventoryDataMappers.js";

export interface WarehouseManagerTableProps {
	readonly rawItems: readonly InventoryItem[];
	readonly filteredItems: readonly InventoryItem[];
	readonly visibleItems: readonly InventoryItem[];
	readonly hasMore: boolean;
	readonly remainingCount: number;
	readonly onShowMore: () => void;
	readonly searchQuery: string;
	readonly isLoadingStock: boolean;
	readonly onRefreshStock: () => void;
	readonly writeoffQuantities: Record<string, number>;
	readonly onStepQuantity: (itemId: string, delta: number) => void;
}

export const WarehouseManagerTable: React.FC<WarehouseManagerTableProps> = ({
	rawItems,
	filteredItems,
	visibleItems,
	hasMore,
	remainingCount,
	onShowMore,
	searchQuery,
	isLoadingStock,
	onRefreshStock,
	writeoffQuantities,
	onStepQuantity,
}) => {
	if (rawItems.length === 0) {
		return (
			<div className="py-10 text-center text-[var(--muted,#64748b)] border border-[var(--border,#e2e8f0)] rounded-xl bg-[var(--paper,#ffffff)]">
				<div className="flex flex-col items-center justify-center gap-2">
					<Package size={32} className="text-slate-400 opacity-60" />
					<p className="text-sm font-semibold text-[var(--ink,#0f172a)]">
						{isLoadingStock ? "Загрузка остатков склада..." : "На складе нет зарегистрированных материалов"}
					</p>
					<p className="text-xs text-[var(--muted,#64748b)] max-w-sm">
						Оформите поступление по накладной или обратитесь к материально ответственному лицу.
					</p>
					{!isLoadingStock && (
						<button
							type="button"
							onClick={onRefreshStock}
							className="mt-3 h-9 min-h-[36px] px-4 text-xs font-semibold rounded-xl border border-[var(--border,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-strong,#f1f5f9)] transition-colors cursor-pointer"
						>
							Обновить остатки
						</button>
					)}
				</div>
			</div>
		);
	}

	if (filteredItems.length === 0) {
		return (
			<div className="py-10 text-center text-xs text-[var(--muted,#64748b)] border border-[var(--border,#e2e8f0)] rounded-xl bg-[var(--paper,#ffffff)]">
				По запросу «{searchQuery}» ничего не найдено
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{/* ДЕСКТОПНЫЙ РЕЖИМ (>= 768px): Калиброванная сетка без сжатия колонок */}
			<div className="hidden md:block border border-[var(--border,#e2e8f0)] rounded-xl overflow-hidden bg-[var(--paper,#ffffff)] shadow-2xs">
				<table className="w-full text-left text-xs border-collapse">
					<thead className="bg-[var(--paper-strong,#f8fafc)] text-[var(--muted,#64748b)] border-b border-[var(--border,#e2e8f0)] font-semibold">
						<tr>
							<th className="py-3 px-3.5 w-[34%]">Материал / Артикул</th>
							<th className="py-3 px-2.5 w-[14%]">Категория</th>
							<th className="py-3 px-2.5 text-right w-[14%]">Остаток</th>
							<th className="py-3 px-2 text-center w-[22%]">Списание</th>
							<th className="py-3 px-2.5 text-right w-[8%]">Цена</th>
							<th className="py-3 px-3 text-right w-[8%]">Сумма</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-[var(--border,#f1f5f9)]">
						{visibleItems.map((item) => {
							const writeQty = writeoffQuantities[item.id] || 0;
							const isZeroStock = item.stockQuantity <= 0;
							const isLowStock = !isZeroStock && item.stockQuantity <= (item.criticalThreshold || 0);
							const isOverdrafted = isZeroStock || writeQty > item.stockQuantity;
							return (
								<tr
									key={item.id}
									className="hover:bg-[var(--paper-strong,#f8fafc)] transition-colors"
									style={{ contain: "content", contentVisibility: "auto", containIntrinsicSize: "1px 52px" }}
								>
									<td className="py-2.5 px-3.5 min-w-0">
										<div className="font-semibold text-sm text-[var(--ink,#0f172a)] truncate" title={item.name}>
											{item.name}
										</div>
										<div className="text-[11px] text-[var(--muted,#94a3b8)] font-mono truncate">
											{item.sku ? `SKU: ${item.sku}` : ""}
											{item.lotNumber ? ` • Партия: ${item.lotNumber}` : ""}
											{item.expirationDate ? ` • До: ${item.expirationDate}` : ""}
										</div>
									</td>
									<td className="py-2.5 px-2.5">
										<span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
											{item.category}
										</span>
									</td>
									<td className="py-2.5 px-2.5 text-right whitespace-nowrap">
										<span
											className={`font-semibold text-xs ${
												isZeroStock
													? "text-amber-600 dark:text-amber-400"
													: isLowStock
														? "text-orange-600 dark:text-orange-400"
														: "text-emerald-700 dark:text-emerald-400"
											}`}
										>
											{item.stockQuantity} {item.unit}
										</span>
										{isOverdrafted && (
											<span
												className="block text-[10px] text-amber-600 dark:text-amber-400 font-medium truncate max-w-[160px]"
												title="Внимание: остаток отрицательный, требуется оприходование накладной"
											>
												{isZeroStock ? "Остаток 0 (дефицит)" : "Внимание: дефицит"}
											</span>
										)}
									</td>
									<td className="py-2.5 px-2 text-center whitespace-nowrap">
										<div className="inline-flex items-center gap-1.5">
											<button
												type="button"
												className="w-8 h-8 rounded-lg border border-[var(--border,#cbd5e1)] flex items-center justify-center hover:bg-[var(--paper-strong,#f1f5f9)] active:scale-95 transition-transform cursor-pointer"
												onClick={() => onStepQuantity(item.id, -1)}
												aria-label={`Уменьшить количество ${item.name}`}
											>
												<Minus size={14} />
											</button>
											<span className="w-10 text-center font-mono font-bold text-sm text-[var(--ink,#0f172a)]">
												{writeQty}
											</span>
											<button
												type="button"
												className="w-8 h-8 rounded-lg border border-[var(--border,#cbd5e1)] flex items-center justify-center hover:bg-[var(--paper-strong,#f1f5f9)] active:scale-95 transition-transform cursor-pointer"
												onClick={() => onStepQuantity(item.id, 1)}
												aria-label={`Увеличить количество ${item.name}`}
											>
												<Plus size={14} />
											</button>
											{writeQty === 0 && (
												<button
													type="button"
													className="h-8 px-3 ml-1 text-xs font-semibold rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-colors inline-flex items-center justify-center cursor-pointer"
													onClick={() => onStepQuantity(item.id, 1)}
												>
													Списать 1
												</button>
											)}
										</div>
									</td>
									<td className="py-2.5 px-2.5 text-right whitespace-nowrap font-mono text-xs text-[var(--muted,#64748b)]">
										{Number.parseFloat(item.unitCostRub || "0").toFixed(2)} ₽
									</td>
									<td className="py-2.5 px-3 text-right whitespace-nowrap font-mono font-bold text-xs text-[var(--ink,#0f172a)]">
										{(Number.parseFloat(item.unitCostRub || "0") * writeQty).toFixed(2)} ₽
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>

			{/* МОБИЛЬНЫЙ РЕЖИМ (< 768px, Apple HIG Grouped List Cards): тач >= 44x44px, 0px горизонтального скролла */}
			<div className="block md:hidden space-y-3">
				{visibleItems.map((item) => {
					const writeQty = writeoffQuantities[item.id] || 0;
					const isZeroStock = item.stockQuantity <= 0;
					const isLowStock = !isZeroStock && item.stockQuantity <= (item.criticalThreshold || 0);
					const isOverdrafted = isZeroStock || writeQty > item.stockQuantity;
					const lineCost = Number.parseFloat(item.unitCostRub || "0") * writeQty;

					return (
						<div
							key={item.id}
							className="rounded-2xl border border-[var(--border,#e2e8f0)] bg-[var(--paper,#ffffff)] p-3.5 shadow-2xs space-y-2.5"
						>
							<div className="flex items-start justify-between gap-2">
								<div className="min-w-0 flex-1">
									<h4 className="text-sm font-semibold text-[var(--ink,#0f172a)] leading-snug">
										{item.name}
									</h4>
									<div className="text-[11px] text-[var(--muted,#94a3b8)] font-mono mt-0.5">
										{item.sku ? `SKU: ${item.sku}` : ""}
										{item.lotNumber ? ` • ${item.lotNumber}` : ""}
									</div>
								</div>
								<span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
									{item.category}
								</span>
							</div>

							<div className="flex items-center justify-between text-xs pt-1 border-t border-[var(--border,#f1f5f9)]">
								<div className="flex items-center gap-1.5">
									<span
										className={`px-2 py-0.5 rounded-md font-semibold text-[11px] ${
											isZeroStock
												? "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300"
												: isLowStock
													? "bg-orange-100 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300"
													: "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300"
										}`}
									>
										{isZeroStock
											? "Остаток 0 (дефицит)"
											: `В наличии: ${item.stockQuantity} ${item.unit}`}
									</span>
									{isOverdrafted && !isZeroStock && (
										<span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
											Дефицит
										</span>
									)}
								</div>
								<span className="font-mono text-xs text-[var(--muted,#64748b)]">
									{Number.parseFloat(item.unitCostRub || "0").toFixed(2)} ₽ / {item.unit}
								</span>
							</div>

							<div className="flex items-center justify-between pt-1">
								<div className="inline-flex items-center gap-2">
									<button
										type="button"
										className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl border border-[var(--border,#cbd5e1)] flex items-center justify-center bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] active:scale-95 transition-transform cursor-pointer"
										onClick={() => onStepQuantity(item.id, -1)}
										aria-label={`Уменьшить количество ${item.name}`}
									>
										<Minus size={16} />
									</button>
									<span className="w-10 text-center font-mono font-bold text-base text-[var(--ink,#0f172a)]">
										{writeQty}
									</span>
									<button
										type="button"
										className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl border border-[var(--border,#cbd5e1)] flex items-center justify-center bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] active:scale-95 transition-transform cursor-pointer"
										onClick={() => onStepQuantity(item.id, 1)}
										aria-label={`Увеличить количество ${item.name}`}
									>
										<Plus size={16} />
									</button>
									{writeQty === 0 && (
										<button
											type="button"
											className="h-11 min-h-[44px] px-3.5 text-xs font-semibold rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 hover:bg-teal-100 transition-colors inline-flex items-center justify-center cursor-pointer"
											onClick={() => onStepQuantity(item.id, 1)}
										>
											Списать 1
										</button>
									)}
								</div>
								{writeQty > 0 && (
									<div className="text-right">
										<div className="text-[10px] text-[var(--muted,#64748b)]">Сумма:</div>
										<div className="font-mono font-bold text-sm text-teal-700 dark:text-teal-400">
											{lineCost.toFixed(2)} ₽
										</div>
									</div>
								)}
							</div>
						</div>
					);
				})}
			</div>

			{hasMore && (
				<div className="py-3 text-center">
					<button
						type="button"
						className="h-11 min-h-[44px] px-5 text-xs font-bold rounded-xl bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border border-[var(--border,#cbd5e1)] hover:bg-[var(--paper-strong,#f1f5f9)] transition-colors cursor-pointer inline-flex items-center gap-2 shadow-2xs"
						onClick={onShowMore}
						data-testid="btn-warehouse-show-more"
					>
						Показать ещё 40 материалов (осталось {remainingCount})
					</button>
				</div>
			)}
		</div>
	);
};
