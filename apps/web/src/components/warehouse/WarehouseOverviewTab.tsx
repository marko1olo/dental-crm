import { AlertTriangle, Package, Search, Truck } from "lucide-react";
import React, { useMemo, useState } from "react";
import type { InventoryItem } from "../inventory/useInventoryLogic.js";
import { formatCategoryRu } from "./WarehouseCatalogView.js";

export type WarehouseCategoryKey = "all" | "anesthetics" | "filling" | "impression" | "disposables" | "disinfection" | "surgery" | "therapy" | "orthopedics";

export interface WarehouseCategoryTabDef {
	id: WarehouseCategoryKey;
	label: string;
}

export const WAREHOUSE_CATEGORY_TABS: WarehouseCategoryTabDef[] = [
	{ id: "all", label: "Все" },
	{ id: "anesthetics", label: "Анестетики" },
	{ id: "filling", label: "Пломбировочные" },
	{ id: "impression", label: "Слепочные" },
	{ id: "disposables", label: "Расходные средства" },
	{ id: "disinfection", label: "Дезинфекция" },
	{ id: "surgery", label: "Хирургия" },
];

export interface WarehouseOverviewTabProps {
	readonly organizationId: string;
	readonly items: readonly InventoryItem[];
	readonly isLoading?: boolean | undefined;
	readonly onRefresh?: (() => void) | undefined;
	readonly onSelectItem?: ((item: InventoryItem) => void) | undefined;
	readonly onDeductItem?: ((item: InventoryItem, qty?: number) => void) | undefined;
	readonly onReceiveItem?: ((item: InventoryItem, qty?: number, lotNumber?: string, expDate?: string) => void) | undefined;
	readonly onOpenWaybills?: (() => void) | undefined;
	readonly onOpenBatchTracking?: ((item?: InventoryItem) => void) | undefined;
	readonly onOpenInventoryAudit?: (() => void) | undefined;
	readonly onQuickWriteoffCarpules?: (() => void) | undefined;
	readonly onOpenAddModal?: (() => void) | undefined;
	readonly onOpenProtocolDeduction?: (() => void) | undefined;
}

export const WarehouseOverviewTab: React.FC<WarehouseOverviewTabProps> = ({
	items,
	onSelectItem,
	onOpenWaybills,
}) => {
	const [searchQuery, setSearchQuery] = useState("");

	const kpis = useMemo(() => {
		const totalCount = items.length;
		const lowStockCount = items.filter((i) => i.stockQuantity > 0 && i.stockQuantity <= (i.criticalThreshold || 0)).length;
		const overdraftCount = items.filter((i) => i.stockQuantity <= 0).length;
		return { totalCount, lowStockCount, overdraftCount };
	}, [items]);

	const filtered = useMemo(() => {
		let list = items.slice();
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase().trim();
			list = list.filter((i) => i.name.toLowerCase().includes(q) || Boolean(i.sku?.toLowerCase().includes(q)));
		}
		return list;
	}, [items, searchQuery]);

	return (
		<div className="warehouse-overview-tab flex-1 flex flex-col min-h-0 overflow-hidden w-full gap-2 p-2" data-testid="warehouse-overview-tab">
			<div className="kpi-stock-total min-h-[32px] py-1 px-3 bg-[var(--paper-soft)] border border-[var(--line)] rounded-lg flex flex-wrap items-center justify-between gap-2 shrink-0 text-xs">
				<div className="flex items-center gap-3.5 flex-wrap">
					<div className="flex items-center gap-1.5"><span className="text-[var(--muted)]">Всего позиций:</span><span className="font-bold text-[var(--ink)]">{kpis.totalCount}</span></div>
					<div className="flex items-center gap-1.5"><span className="text-orange-700 dark:text-orange-400 font-semibold">Критический остаток:</span><span className="font-bold text-orange-600 dark:text-orange-400">{kpis.lowStockCount}</span></div>
					<div className="flex items-center gap-1.5"><span className="text-amber-700 dark:text-amber-400 font-semibold">Расход сверх остатка:</span><span className="font-bold text-amber-600 dark:text-amber-400">{kpis.overdraftCount}</span></div>
				</div>
				{kpis.overdraftCount > 0 && onOpenWaybills && (
					<button type="button" onClick={onOpenWaybills} className="text-[11px] font-semibold text-teal-700 dark:text-teal-300 hover:underline flex items-center gap-1 cursor-pointer">
						<Truck size={12} /><span>Оприходовать накладную</span>
					</button>
				)}
			</div>

			<div className="h-9 min-h-[36px] px-3 bg-[var(--paper)] border border-[var(--line)] rounded-xl flex items-center gap-2 shrink-0">
				<Search size={14} className="text-[var(--muted)]" />
				<input
					type="text"
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					placeholder="Поиск по остаткам склада..."
					className="w-full text-xs bg-transparent border-none outline-none text-[var(--ink)]"
				/>
			</div>

			<div className="border border-[var(--line)] rounded-xl overflow-hidden bg-[var(--paper)] flex-1 overflow-y-auto">
				<table className="w-full text-left text-xs">
					<thead className="bg-[var(--paper-soft)] border-b border-[var(--line)] font-semibold text-[var(--muted)]">
						<tr><th className="py-2 px-3">Наименование</th><th className="py-2 px-3">Категория</th><th className="py-2 px-3 text-right">Остаток</th></tr>
					</thead>
					<tbody className="divide-y divide-[var(--line-subtle)]">
						{filtered.map((it) => (
							<tr key={it.id} className="hover:bg-[var(--paper-soft)] cursor-pointer" onClick={() => onSelectItem?.(it)}>
								<td className="py-2 px-3 font-medium text-[var(--ink)]">
									<div>{it.name}</div>
									{it.stockQuantity <= 0 && <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">[Ожидает оприходования накладной]</span>}
								</td>
								<td className="py-2 px-3 text-[var(--muted)]">{formatCategoryRu(it.category)}</td>
								<td className="py-2 px-3 text-right font-mono font-bold text-[var(--ink)]">{it.stockQuantity} {it.unit || "шт."}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
};

export default WarehouseOverviewTab;
