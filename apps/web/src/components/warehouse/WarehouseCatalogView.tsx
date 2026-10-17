import { Package, Search, Zap } from "lucide-react";
import React, { useMemo, useState } from "react";
import type { InventoryItem } from "../inventory/useInventoryLogic.js";

export type WarehouseCatalogCategory = "all" | "anesthetics" | "filling" | "impression" | "disposables" | "disinfection" | "surgery" | "therapy" | "orthopedics";

export interface WarehouseCatalogCategoryTab {
	readonly id: WarehouseCatalogCategory;
	readonly label: string;
}

export const WAREHOUSE_CATALOG_CATEGORIES: readonly WarehouseCatalogCategoryTab[] = [
	{ id: "all", label: "Все" },
	{ id: "anesthetics", label: "Анестетики" },
	{ id: "filling", label: "Пломбировочные" },
	{ id: "impression", label: "Слепочные" },
	{ id: "disposables", label: "Расходные средства" },
	{ id: "disinfection", label: "Дезинфекция" },
	{ id: "surgery", label: "Хирургия" },
];

export function formatCategoryRu(category?: string | null): string {
	if (!category) return "Расходные материалы";
	const l = category.toLowerCase().trim();
	if (l === "therapy") return "Терапия";
	if (l === "disinfection") return "Дезинфекция";
	if (l === "orthopedics" || l === "orthodontics") return "Ортопедия";
	if (l === "surgery") return "Хирургия";
	if (l === "anesthesia" || l === "anesthetics") return "Анестетики";
	if (l === "composite" || l === "composites" || l === "filling") return "Пломбировочные";
	if (l === "impression" || l === "impressions") return "Слепочные";
	if (l === "disposables" || l === "consumables") return "Расходные средства";
	if (l === "endo" || l === "endodontics") return "Эндодонтия";
	return category;
}

export interface WarehouseCatalogViewProps {
	readonly organizationId: string;
	readonly items: readonly InventoryItem[];
	readonly isLoading?: boolean | undefined;
	readonly onRefresh?: (() => void) | undefined;
	readonly onSelectItem?: ((item: InventoryItem) => void) | undefined;
	readonly onDeductItem?: ((item: InventoryItem, qty?: number) => void) | undefined;
	readonly onReceiveItem?: ((item: InventoryItem, qty?: number) => void) | undefined;
	readonly onOpenBatches?: ((item?: InventoryItem) => void) | undefined;
	readonly onOpenReceiptModal?: (() => void) | undefined;
	readonly onOpenAuditModal?: (() => void) | undefined;
}

export const WarehouseCatalogView: React.FC<WarehouseCatalogViewProps> = ({
	items,
	onSelectItem,
}) => {
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedCat, setSelectedCat] = useState<WarehouseCatalogCategory>("all");

	const filtered = useMemo(() => {
		let list = items.slice();
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase().trim();
			list = list.filter((i) => i.name.toLowerCase().includes(q) || Boolean(i.sku?.toLowerCase().includes(q)));
		}
		return list;
	}, [items, searchQuery]);

	return (
		<div className="warehouse-catalog-view flex flex-col gap-2 p-2 w-full" data-testid="warehouse-catalog-view">
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
						<tr><th className="py-2 px-3">Наименование</th><th className="py-2 px-3">Категория</th><th className="py-2 px-3 text-right">Остаток</th></tr>
					</thead>
					<tbody className="divide-y divide-[var(--line-subtle)]">
						{filtered.map((it) => (
							<tr key={it.id} className="hover:bg-[var(--paper-soft)] cursor-pointer" onClick={() => onSelectItem?.(it)}>
								<td className="py-2 px-3 font-medium text-[var(--ink)]">{it.name}</td>
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

export default WarehouseCatalogView;
