import { Search } from "lucide-react";
import React from "react";
import { useMemo, useState } from "react";
import { WarehouseOverviewKpiBar } from "./overviewTab/WarehouseOverviewKpiBar.js";
import { WarehouseOverviewTable } from "./overviewTab/WarehouseOverviewTable.js";
import type { InventoryItem } from "./useInventoryLogic.js";

export type WarehouseCategoryKey =
	| "all"
	| "anesthetics"
	| "filling"
	| "impression"
	| "disposables"
	| "disinfection"
	| "surgery"
	| "therapy"
	| "orthopedics";

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
	readonly onDeductItem?:
		| ((item: InventoryItem, qty?: number) => void)
		| undefined;
	readonly onReceiveItem?:
		| ((
				item: InventoryItem,
				qty?: number,
				lotNumber?: string,
				expDate?: string,
		  ) => void)
		| undefined;
	readonly onOpenWaybills?: (() => void) | undefined;
	readonly onOpenBatchTracking?: ((item?: InventoryItem) => void) | undefined;
	readonly onOpenInventoryAudit?: (() => void) | undefined;
	readonly onQuickWriteoffCarpules?: (() => void) | undefined;
	readonly onOpenAddModal?: (() => void) | undefined;
	readonly onOpenProtocolDeduction?: (() => void) | undefined;
	readonly onOpenShiftDeductionModal?: (() => void) | undefined;
}

/**
 * Вкладка сводки складских остатков и овердрафта (Мандаты 8e, 8n).
 * Декомпозирована строго <= 120 строк в соответствии с Мандатом 8b.
 */
export const WarehouseOverviewTab: React.FC<WarehouseOverviewTabProps> = ({
	items,
	onSelectItem,
	onOpenWaybills,
	onOpenShiftDeductionModal,
}) => {
	const [searchQuery, setSearchQuery] = useState("");

	const kpis = useMemo(() => {
		const totalCount = items.length;
		const lowStockCount = items.filter(
			(i) =>
				i.stockQuantity > 0 && i.stockQuantity <= (i.criticalThreshold || 0),
		).length;
		const overdraftCount = items.filter((i) => i.stockQuantity <= 0).length;
		return { totalCount, lowStockCount, overdraftCount };
	}, [items]);

	const filtered = useMemo(() => {
		if (!searchQuery.trim()) return items.slice();
		const q = searchQuery.toLowerCase().trim();
		return items.filter(
			(i) =>
				i.name.toLowerCase().includes(q) ||
				Boolean(i.sku?.toLowerCase().includes(q)),
		);
	}, [items, searchQuery]);

	return (
		<div
			className="warehouse-overview-tab flex-1 flex flex-col min-h-0 overflow-hidden w-full gap-2 p-2"
			data-testid="warehouse-overview-tab"
		>
			<WarehouseOverviewKpiBar
				kpis={kpis}
				onOpenShiftDeductionModal={onOpenShiftDeductionModal}
				onOpenWaybills={onOpenWaybills}
			/>

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

			<WarehouseOverviewTable filtered={filtered} onSelectItem={onSelectItem} />
		</div>
	);
};

export default WarehouseOverviewTab;
