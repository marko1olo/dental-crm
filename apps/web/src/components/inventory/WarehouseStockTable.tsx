/**
 * apps/web/src/components/inventory/WarehouseStockTable.tsx
 *
 * Канонический каталог остатков и материалов склада DENTE CRM.
 * Реализует Мандаты 8b (Sweet Spot 200–350 строк), 8e (Автономия персонала),
 * 8n (Мягкий овердрафт Soft Negative Stock), 8am (1 Primary CTA) и Apple HIG.
 */

import React, { useMemo, useState } from "react";
import {
	AlertTriangle, Calendar, CheckCircle2, ChevronRight, Edit2,
	MinusCircle, Package, PackagePlus, PlusCircle, Search, Trash2,
} from "lucide-react";
import { useIsMobile } from "../../hooks/useIsMobile.js";
import { WarehouseStockMobileCards } from "./WarehouseStockMobileCards.js";
import {
	formatExpDate, getCategoryBadge, getExpiryTrafficLight,
	getFefoTrafficLight, getWarehouseFefoTrafficLight,
	type ExpiryTrafficLightInfo, type ExpiryTrafficStatus, type FefoTrafficLightInfo,
} from "./inventoryExpiryUtils.js";

export {
	formatExpDate, getCategoryBadge, getExpiryTrafficLight,
	getFefoTrafficLight, getWarehouseFefoTrafficLight,
	type ExpiryTrafficLightInfo, type ExpiryTrafficStatus, type FefoTrafficLightInfo,
};

export interface WarehouseStockItem {
	id: string;
	name: string;
	category?: string | null;
	stockQuantity?: number | string | null;
	currentQty?: number | string | null;
	currentStock?: number | string | null;
	unit?: string | null;
	unitCostRub?: string | number | null;
	averageCostRub?: string | number | null;
	unitCost?: string | number | null;
	expirationDate?: string | null;
	lotNumber?: string | null;
	batchNumber?: string | null;
	barcode?: string | null;
	sku?: string | null;
	criticalThreshold?: number | string | null;
	minStockLevel?: number | string | null;
	minStock?: number | string | null;
	[key: string]: any;
}

export interface WarehouseStockTableProps {
	items: WarehouseStockItem[];
	isLoading?: boolean;
	loadError?: string | null;
	searchQuery?: string;
	organizationId?: string;
	onSelectItem?: (item: WarehouseStockItem) => void;
	onReceiveItem?: (item: WarehouseStockItem) => void;
	onDeductItem?: (item: WarehouseStockItem) => void;
	onEditItem?: (item: WarehouseStockItem) => void;
	onDeleteItem?: (item: WarehouseStockItem) => void;
	onOpenAddModal?: () => void;
	onOpenWaybills?: () => void;
	onOpenShiftDeduction?: () => void;
	onRetry?: () => void;
	className?: string;
}

const CATEGORY_CHIPS = [
	{ id: "all", label: "Все материалы" },
	{ id: "anesthesia", label: "Анестетики" },
	{ id: "consumable", label: "Расходные" },
	{ id: "composite", label: "Пломбировочные" },
	{ id: "endodontic", label: "Эндодонтия" },
	{ id: "hygiene", label: "Гигиена" },
	{ id: "surgery", label: "Хирургия" },
	{ id: "orthopedic", label: "Ортопедия" },
	{ id: "disinfection", label: "Дезинфекция" },
];

export const WarehouseStockTable: React.FC<WarehouseStockTableProps> = ({
	items = [],
	isLoading = false,
	loadError = null,
	searchQuery: externalSearch = "",
	onSelectItem,
	onReceiveItem,
	onDeductItem,
	onEditItem,
	onDeleteItem,
	onOpenAddModal,
	onOpenWaybills,
	onOpenShiftDeduction,
	onRetry,
	className = "",
}) => {
	const isMobile = useIsMobile(768);
	const [localSearch, setLocalSearch] = useState("");
	const [selectedCategory, setSelectedCategory] = useState("all");
	const effectiveSearch = externalSearch || localSearch;

	const filteredItems = useMemo(() => {
		let res = items;
		if (selectedCategory !== "all") {
			const catLower = selectedCategory.toLowerCase();
			res = res.filter((it) => {
				const c = (it.category || "").toLowerCase();
				if (catLower === "anesthesia") return c.includes("анест") || c.includes("anest");
				if (catLower === "consumable") return c.includes("расход") || c.includes("consum");
				if (catLower === "composite") return c.includes("пломб") || c.includes("композ") || c.includes("терап");
				if (catLower === "endodontic") return c.includes("эндо") || c.includes("endo");
				if (catLower === "hygiene") return c.includes("гигиен") || c.includes("hygi");
				if (catLower === "surgery") return c.includes("хирург") || c.includes("surg");
				if (catLower === "orthopedic") return c.includes("ортоп") || c.includes("ortho");
				if (catLower === "disinfection") return c.includes("дезинф") || c.includes("стерил");
				return c.includes(catLower);
			});
		}
		if (effectiveSearch.trim()) {
			const q = effectiveSearch.trim().toLowerCase();
			res = res.filter((it) =>
				(it.name || "").toLowerCase().includes(q) ||
				(it.lotNumber || "").toLowerCase().includes(q) ||
				(it.barcode || "").toLowerCase().includes(q),
			);
		}
		return res;
	}, [items, selectedCategory, effectiveSearch]);

	const kpi = useMemo(() => {
		let totalCount = items.length, overdraftCount = 0, lowStockCount = 0, totalRub = 0;
		for (const it of items) {
			const qty = Number(it.stockQuantity ?? it.currentStock ?? it.currentQty ?? 0);
			const cost = Number(it.averageCostRub ?? it.unitCostRub ?? 0);
			if (qty < 0) overdraftCount++; else if (qty <= 5) lowStockCount++;
			if (qty > 0) totalRub += qty * cost;
		}
		return { totalCount, overdraftCount, lowStockCount, totalRub: Math.round(totalRub) };
	}, [items]);

	if (isLoading && items.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center p-12 text-[var(--muted)] gap-3 bg-[var(--paper)] rounded-2xl border border-[var(--line)]">
				<Package className="animate-spin text-[var(--teal,#0d9488)]" size={32} />
				<span className="text-sm font-medium">Загрузка каталога остатков...</span>
			</div>
		);
	}

	if (loadError && items.length === 0) {
		return (
			<div className="p-6 text-center bg-[var(--paper)] rounded-2xl border border-[var(--line)] text-[var(--ink)]">
				<AlertTriangle className="mx-auto mb-2 text-amber-500" size={32} />
				<p className="text-sm text-[var(--muted)] mb-4">{loadError}</p>
				{onRetry && (
					<button type="button" onClick={onRetry} className="secondary-button px-4 py-2 text-xs">
						Повторить попытку
					</button>
				)}
			</div>
		);
	}

	const kpiCards = [
		{ label: "Всего позиций", val: String(kpi.totalCount), cls: "text-[var(--ink)]" },
		{ label: "В наличии (оценка)", val: `${kpi.totalRub.toLocaleString("ru-RU")} ₽`, cls: "text-[var(--ink)]" },
		{ label: "Мало на складе", val: String(kpi.lowStockCount), cls: kpi.lowStockCount > 0 ? "text-amber-500" : "text-[var(--ink)]" },
		{ label: "Мягкий овердрафт", val: kpi.overdraftCount > 0 ? `${kpi.overdraftCount} поз.` : "0 (дефицита нет)", cls: kpi.overdraftCount > 0 ? "text-amber-500" : "text-emerald-500" },
	];

	return (
		<div className={`w-full flex flex-col gap-3 ${className}`} data-testid="warehouse-stock-table-root">
			{/* KPI плашки */}
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0">
				{kpiCards.map((c) => (
					<div key={c.label} className="p-3 bg-[var(--paper-soft)] rounded-xl border border-[var(--line-subtle)] flex flex-col">
						<span className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted)]">{c.label}</span>
						<span className={`text-xl font-bold ${c.cls}`}>{c.val}</span>
					</div>
				))}
			</div>

			{/* Тулбар поиска и фильтрации */}
			<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shrink-0 bg-[var(--paper)] p-2.5 rounded-xl border border-[var(--line)]">
				<div className="dente-search-wrap relative flex-1 min-w-[200px]">
					<Search className="dente-search-icon absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none" size={16} />
					<input
						type="text"
						value={localSearch}
						onChange={(e) => setLocalSearch(e.target.value)}
						placeholder="Поиск по названию, серии или штрихкоду..."
						className="dente-search-input w-full !pl-10 pr-3 !h-9 !min-h-[36px] text-sm bg-[var(--paper-soft)] text-[var(--ink)] rounded-lg border border-[var(--line-subtle)] focus:outline-hidden focus:border-[var(--teal,#0d9488)] transition-colors"
						data-testid="warehouse-search-input"
					/>
				</div>
				<div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
					{CATEGORY_CHIPS.map((cat) => {
						const active = selectedCategory === cat.id;
						return (
							<button
								key={cat.id}
								type="button"
								onClick={() => setSelectedCategory(cat.id)}
								className={`px-3 py-1.5 text-xs font-medium rounded-lg shrink-0 transition-colors ${
									active
										? "bg-[var(--teal,#0d9488)] text-white shadow-xs"
										: "bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] border border-[var(--line-subtle)]"
								}`}
							>
								{cat.label}
							</button>
						);
					})}
				</div>
			</div>

			{/* Предупреждение о дефиците (Мандат 8n) */}
			{kpi.overdraftCount > 0 && (
				<div className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl text-amber-600 dark:text-amber-400 text-xs shrink-0">
					<AlertTriangle size={18} className="shrink-0" />
					<div className="flex-1">
						<span className="font-semibold">Мягкий овердрафт активен (Мандат 8n):</span> {kpi.overdraftCount} поз. списаны под приём до внесения накладной поставщика. Проведение процедур и приёмов не блокируется.
					</div>
					{onOpenWaybills && (
						<button
							type="button"
							onClick={onOpenWaybills}
							className="secondary-button px-2.5 py-1 text-xs shrink-0"
						>
							Внести накладную
						</button>
					)}
				</div>
			)}

			{/* Контент: Desktop Таблица vs Mobile Grouped Inset Cards (Мандат 8ze) */}
			{isMobile ? (
				<WarehouseStockMobileCards
					items={filteredItems}
					onSelectItem={onSelectItem}
					onReceiveItem={onReceiveItem}
					onDeductItem={onDeductItem}
					onEditItem={onEditItem}
				/>
			) : (
				<div className="overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--paper)]">
					<table className="w-full text-left text-sm border-collapse" data-testid="warehouse-stock-table">
						<thead>
							<tr className="border-b border-[var(--line)] bg-[var(--paper-soft)] text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
								<th className="py-3 px-3.5">Наименование</th>
								<th className="py-3 px-3">Категория</th>
								<th className="py-3 px-3">
									<div>Срок годности</div>
									<div className="text-[10px] text-[var(--muted)] font-normal normal-case">Партия / FEFO</div>
								</th>
								<th className="py-3 px-3 text-right">Остаток</th>
								<th className="py-3 px-3 text-right">Мин. запас</th>
								<th className="py-3 px-3 text-right">Себестоимость</th>
								<th className="py-3 px-3.5 text-right">Действия</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-[var(--line-subtle)]">
							{filteredItems.length === 0 ? (
								<tr>
									<td colSpan={7} className="py-10 text-center text-sm text-[var(--muted)]">
										Позиций не найдено
									</td>
								</tr>
							) : (
								filteredItems.map((item) => {
									const qty = Number(item.stockQuantity ?? item.currentStock ?? item.currentQty ?? 0);
									const isOverdraft = qty < 0;
									const unit = item.unit || "шт.";
									const minStock = item.criticalThreshold ?? item.minStockLevel ?? item.minStock ?? null;
									const costVal = item.averageCostRub ?? item.unitCostRub ?? item.unitCost ?? null;
									const traffic = getExpiryTrafficLight(item.expirationDate);
									return (
										<tr
											key={item.id}
											data-testid={`stock-row-${item.id}`}
											className={`hover:bg-[var(--paper-soft)]/50 transition-colors group cursor-pointer stock-row-${item.id}`}
											onClick={() => onSelectItem?.(item)}
										>
											<td className="py-2.5 px-3.5">
												<div className="font-medium text-[var(--ink)]">{item.name}</div>
												{item.barcode && (
													<span className="text-[11px] text-[var(--muted)] font-mono">
														{item.barcode}
													</span>
												)}
												{item.sku && !item.barcode && (
													<span className="text-[11px] text-[var(--muted)] font-mono">
														{item.sku}
													</span>
												)}
											</td>
											<td className="py-2.5 px-3 text-[var(--muted)] text-xs">
												{item.category || "—"}
											</td>
											<td className="py-2.5 px-3 text-xs text-[var(--muted)]">
												<div className="flex items-center gap-1.5 flex-wrap">
													<span className={`inline-flex px-2 py-0.5 rounded-md font-medium text-[11px] border ${traffic.className}`}>
														{traffic.badgeTextRu}
													</span>
													{traffic.status === "expired" && (
														<button
															type="button"
															data-testid={`btn-sanpin-disposal-act-${item.id}`}
															onClick={(e) => {
																e.stopPropagation();
															}}
															className="secondary-button px-2 py-0.5 text-[10px] text-rose-500"
														>
															Акт утилизации СанПиН 3.3686-21
														</button>
													)}
													{(item.lotNumber || item.batchNumber) && (
														<span className="px-1.5 py-0.2 rounded bg-[var(--paper-soft)] text-[10px] font-mono">
															{item.lotNumber || item.batchNumber}
														</span>
													)}
												</div>
											</td>
											<td className="py-2.5 px-3 text-right font-medium">
												{isOverdraft || qty === 0 ? (
													<span
														data-testid={`soft-overdraft-badge-${item.id}`}
														className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
														title="Списано под операцию (мягкий Овердрафт, накладная ещё не внесена)"
													>
														{qty < 0 ? `⚠️ ${qty} ${unit} (Дефицит / Овердрафт)` : "Ожидается поставка (мягкий овердрафт)"}
													</span>
												) : (
													<span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
														{qty} {unit}
													</span>
												)}
											</td>
											<td className="py-2.5 px-3 text-right font-mono text-xs text-[var(--muted)]">
												{minStock != null ? `${minStock} ${unit}` : "—"}
											</td>
											<td className="py-2.5 px-3 text-right font-mono text-xs text-[var(--ink)]">
												{costVal != null ? `${Number(costVal).toLocaleString("ru-RU")} ₽` : "—"}
											</td>
											<td className="py-2.5 px-3.5 text-right">
												<div className="inline-flex items-center gap-1">
													{onReceiveItem && (
														<button
															type="button"
															onClick={(e) => {
																e.stopPropagation();
																onReceiveItem(item);
															}}
															className="secondary-button p-1.5 text-xs text-emerald-600 dark:text-emerald-400"
															title="Оприходовать партию"
														>
															<PlusCircle size={15} />
														</button>
													)}
													<button
														type="button"
														onClick={(e) => {
															e.stopPropagation();
															onDeductItem?.(item);
														}}
														className="secondary-button p-1.5 text-xs text-amber-600 dark:text-amber-400"
														title="Списать расходник"
													>
														<MinusCircle size={15} />
														<span className="sr-only">Списать (Овердрафт)</span>
													</button>
													{onEditItem && (
														<button
															type="button"
															onClick={(e) => {
																e.stopPropagation();
																onEditItem(item);
															}}
															className="secondary-button p-1.5 text-xs text-[var(--muted)]"
															title="Редактировать позицию"
														>
															<Edit2 size={14} />
														</button>
													)}
													{onDeleteItem && (
														<button
															type="button"
															onClick={(e) => {
																e.stopPropagation();
																onDeleteItem(item);
															}}
															className="secondary-button p-1.5 text-xs text-rose-500"
															title="Удалить"
														>
															<Trash2 size={14} />
														</button>
													)}
												</div>
											</td>
										</tr>
									);
								})
							)}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
};

export default WarehouseStockTable;
