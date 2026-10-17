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
	rawItems, filteredItems, visibleItems, hasMore, remainingCount, onShowMore,
	searchQuery, isLoadingStock, onRefreshStock, writeoffQuantities, onStepQuantity,
}) => {
	if (rawItems.length === 0) {
		return (
			<div className="py-10 text-center text-[var(--muted,#64748b)] border border-[var(--border,#e2e8f0)] rounded-lg">
				<div className="flex flex-col items-center justify-center gap-2">
					<Package size={28} className="text-slate-400 opacity-60" />
					<p className="text-xs font-semibold text-[var(--ink,#0f172a)]">
						{isLoadingStock ? "Загрузка остатков склада..." : "На складе нет зарегистрированных материалов."}
					</p>
					<p className="text-[11px] text-slate-500">Оформите приходную накладную или обратитесь к старшей медсестре</p>
					{!isLoadingStock && (
						<button type="button" onClick={onRefreshStock} className="mt-2 h-7 px-3 text-xs rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer">
							Обновить остатки
						</button>
					)}
				</div>
			</div>
		);
	}

	if (filteredItems.length === 0) {
		return (
			<div className="py-8 text-center text-xs text-[var(--muted,#64748b)] border border-[var(--border,#e2e8f0)] rounded-lg">
				По запросу «{searchQuery}» ничего не найдено
			</div>
		);
	}

	return (
		<div className="border border-[var(--border,#e2e8f0)] rounded-lg overflow-hidden">
			<table className="w-full text-left text-xs border-collapse">
				<thead className="bg-[var(--paper-strong,#f8fafc)] text-[var(--muted,#64748b)] border-b border-[var(--border,#e2e8f0)] font-semibold">
					<tr>
						<th className="py-2.5 px-3">Материал / Артикул</th>
						<th className="py-2.5 px-3">Категория</th>
						<th className="py-2.5 px-3 text-right">Остаток</th>
						<th className="py-2.5 px-3 text-center">Списание</th>
						<th className="py-2.5 px-3 text-right">Цена</th>
						<th className="py-2.5 px-3 text-right">Сумма</th>
					</tr>
				</thead>
				<tbody className="divide-y divide-[var(--border,#f1f5f9)]">
					{visibleItems.map((item) => {
						const writeQty = writeoffQuantities[item.id] || 0;
						const isZeroStock = item.stockQuantity <= 0;
						const isLowStock = !isZeroStock && item.stockQuantity <= (item.criticalThreshold || 0);
						const isOverdrafted = isZeroStock || writeQty > item.stockQuantity;
						return (
							<tr key={item.id} className="hover:bg-[var(--paper-strong,#f8fafc)] transition-colors" style={{ contain: "content", contentVisibility: "auto", containIntrinsicSize: "1px 48px" }}>
								<td className="py-2.5 px-3 min-w-0 max-w-xs">
									<div className="font-semibold truncate" title={item.name}>{item.name}</div>
									<div className="text-[11px] text-[var(--muted,#94a3b8)] font-mono truncate">{item.sku ? `SKU: ${item.sku}` : ""}{item.lotNumber ? ` • Серия: ${item.lotNumber}` : ""}</div>
								</td>
								<td className="py-2.5 px-3"><span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">{item.category}</span></td>
								<td className="py-2.5 px-3 text-right whitespace-nowrap">
									<span className={`font-semibold ${isZeroStock ? "text-amber-600 dark:text-amber-400" : isLowStock ? "text-orange-600 dark:text-orange-400" : "text-emerald-700 dark:text-emerald-400"}`}>
										{item.stockQuantity} {item.unit}
									</span>
									{isOverdrafted && <span className="block text-[10px] text-amber-600 dark:text-amber-400 font-semibold truncate max-w-[160px]" title="Внимание: остаток отрицательный, требуется оприходование накладной">{isZeroStock ? "Остаток 0 (списание с дефицитом)" : "Внимание: дефицит"}</span>}
								</td>
								<td className="py-2.5 px-3 text-center whitespace-nowrap">
									<div className="inline-flex items-center gap-1.5">
										<button type="button" className="w-8 h-8 rounded-lg border border-[var(--border,#cbd5e1)] flex items-center justify-center hover:bg-[var(--paper-strong,#f1f5f9)] active:scale-95 transition-transform cursor-pointer" onClick={() => onStepQuantity(item.id, -1)} aria-label={`Уменьшить количество ${item.name}`}><Minus size={14} /></button>
										<span className="w-10 text-center font-mono font-bold text-sm">{writeQty}</span>
										<button type="button" className="w-8 h-8 rounded-lg border border-[var(--border,#cbd5e1)] flex items-center justify-center hover:bg-[var(--paper-strong,#f1f5f9)] active:scale-95 transition-transform cursor-pointer" onClick={() => onStepQuantity(item.id, 1)} aria-label={`Увеличить количество ${item.name}`}><Plus size={14} /></button>
										{writeQty === 0 && <button type="button" className="h-8 px-3 ml-1 text-xs font-semibold rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 hover:bg-teal-100 transition-colors inline-flex items-center justify-center cursor-pointer" onClick={() => onStepQuantity(item.id, 1)}>Списать 1</button>}
									</div>
								</td>
								<td className="py-2.5 px-3 text-right whitespace-nowrap font-mono text-[11px]">{Number.parseFloat(item.unitCostRub || "0").toFixed(2)} ₽</td>
								<td className="py-2.5 px-3 text-right whitespace-nowrap font-mono font-semibold">{(Number.parseFloat(item.unitCostRub || "0") * writeQty).toFixed(2)} ₽</td>
							</tr>
						);
					})}
					{hasMore && (
						<tr><td colSpan={6} className="py-3 text-center bg-[var(--paper-strong,#f8fafc)]">
							<button type="button" className="h-8 px-4 text-xs font-semibold rounded-lg bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border border-[var(--border,#cbd5e1)] hover:bg-[var(--paper-strong,#f1f5f9)] transition-colors cursor-pointer inline-flex items-center gap-1.5" onClick={onShowMore} data-testid="btn-warehouse-show-more">
								Показать ещё 40 материалов (осталось {remainingCount})
							</button>
						</td></tr>
					)}
				</tbody>
			</table>
		</div>
	);
};
