import { Search, Zap } from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import {
	formatCategoryRu,
	WAREHOUSE_CATALOG_CATEGORIES,
	type WarehouseCatalogCategory,
	type WarehouseCatalogCategoryTab,
} from "./catalog/warehouseCatalogTypes.js";
import type { InventoryItem } from "./useInventoryLogic.js";

export type { WarehouseCatalogCategory, WarehouseCatalogCategoryTab };
export { formatCategoryRu, WAREHOUSE_CATALOG_CATEGORIES };

export interface WarehouseCatalogViewProps {
	readonly organizationId: string;
	readonly items: readonly InventoryItem[];
	readonly isLoading?: boolean | undefined;
	readonly onRefresh?: (() => void) | undefined;
	readonly onSelectItem?: ((item: InventoryItem) => void) | undefined;
	readonly onDeductItem?:
		| ((item: InventoryItem, qty?: number) => void)
		| undefined;
	readonly onReceiveItem?:
		| ((item: InventoryItem, qty?: number) => void)
		| undefined;
	readonly onOpenBatches?: ((item?: InventoryItem) => void) | undefined;
	readonly onOpenReceiptModal?: (() => void) | undefined;
	readonly onOpenAuditModal?: (() => void) | undefined;
}

export const WarehouseCatalogView: React.FC<WarehouseCatalogViewProps> = ({
	items,
	onSelectItem,
}) => {
	const [searchQuery, setSearchQuery] = useState("");

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
			className="warehouse-catalog-view flex flex-col gap-2 p-2 w-full"
			data-testid="warehouse-catalog-view"
		>
			<div className="h-9 min-h-[36px] px-3 bg-[var(--paper)] border border-[var(--line)] rounded-xl flex items-center justify-between gap-2 shrink-0">
				<div className="flex items-center gap-2 flex-1 max-w-xs">
					<Search size={14} className="text-[var(--muted)]" />
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder="Поиск по каталогу..."
						className="w-full text-xs bg-transparent border-none outline-none text-[var(--ink)]"
					/>
				</div>
				<div className="flex items-center gap-2 text-xs">
					<span className="text-[var(--muted)]">Позиций в клинике:</span>
					<strong className="text-[var(--ink)]">{items.length}</strong>
					<button
						type="button"
						className="btn-open-protocol-deduction h-7 px-2.5 rounded-lg border border-[var(--line)] hover:bg-[var(--paper-soft)] text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
					>
						<Zap size={12} className="text-amber-500" />
						<span>Списание по протоколу</span>
					</button>
				</div>
			</div>

			<div className="border border-[var(--line)] rounded-xl overflow-hidden bg-[var(--paper)]">
				<table className="w-full text-left text-xs">
					<thead className="bg-[var(--paper-soft)] border-b border-[var(--line)] font-semibold text-[var(--muted)]">
						<tr>
							<th className="py-2 px-3">Наименование</th>
							<th className="py-2 px-3">Категория</th>
							<th className="py-2 px-3 text-right">Остаток</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-[var(--line-subtle)]">
						{filtered.map((it) => (
							<tr
								key={it.id}
								className="hover:bg-[var(--paper-soft)] cursor-pointer"
								onClick={() => onSelectItem?.(it)}
							>
								<td className="py-2 px-3 font-medium text-[var(--ink)]">
									{it.name}
								</td>
								<td className="py-2 px-3 text-[var(--muted)]">
									{formatCategoryRu(it.category)}
								</td>
								<td className="py-2 px-3 text-right font-mono font-bold text-[var(--ink)]">
									{it.stockQuantity} {it.unit || "шт."}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
};

export default WarehouseCatalogView;
