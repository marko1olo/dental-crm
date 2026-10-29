/**
 * apps/web/src/components/inventory/WarehouseStockTable.tsx
 *
 * Каноническая SSOT-таблица складских остатков и материалов DENTE CRM (280–380L).
 * 7 калиброванных колонок без обрезки справа (Артикул / Наименование / Категория /
 * Остаток / Ед. изм. / Мин. запас / Статус остатка), индикаторы запаса («В норме»,
 * «Мало», «Перерасход (овердрафт)»), быстрый поиск (Ctrl+K) и фильтры по категориям.
 * Мандаты 8b (Sweet Spot 280–380L), 8e (Автономия), 8n (Мягкий овердрафт), 8am (1 Primary CTA).
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronRight, Edit2, MinusCircle, Package, PlusCircle, Search, Trash2, Zap } from "lucide-react";
import { useIsMobile } from "../../hooks/useIsMobile.js";
import {
	getExpiryTrafficLight,
	getWarehouseFefoTrafficLight,
	getFefoTrafficLight,
	getCategoryBadge,
	type ExpiryTrafficLightInfo,
	type ExpiryTrafficStatus,
	type FefoTrafficLightInfo,
} from "./inventoryExpiryUtils.js";

export {
	getExpiryTrafficLight,
	getWarehouseFefoTrafficLight,
	getFefoTrafficLight,
	getCategoryBadge,
	type ExpiryTrafficLightInfo,
	type ExpiryTrafficStatus,
	type FefoTrafficLightInfo,
};

export interface WarehouseStockItem {
	id: string;
	name: string;
	sku?: string | null | undefined;
	barcode?: string | null | undefined;
	category?: string | null | undefined;
	stockQuantity?: number | string | null | undefined;
	currentQty?: number | string | null | undefined;
	currentStock?: number | string | null | undefined;
	unit?: string | null | undefined;
	unitCostRub?: string | number | null | undefined;
	averageCostRub?: string | number | null | undefined;
	unitCost?: string | number | null | undefined;
	criticalThreshold?: number | string | null | undefined;
	minStockLevel?: number | string | null | undefined;
	minStock?: number | string | null | undefined;
	expirationDate?: string | null | undefined;
	lotNumber?: string | null | undefined;
	batchNumber?: string | null | undefined;
	[key: string]: unknown;
}

export interface WarehouseStockTableProps {
	items: readonly WarehouseStockItem[] | WarehouseStockItem[];
	isLoading?: boolean | undefined;
	loadError?: string | null | undefined;
	searchQuery?: string | undefined;
	organizationId?: string | undefined;
	hasMore?: boolean | undefined;
	remainingCount?: number | undefined;
	onShowMore?: (() => void) | undefined;
	onOpenWarehouseManager?: (() => void) | undefined;
	onOpenInventoryAudit?: (() => void) | undefined;
	onCreateDisposalAct?: ((item: WarehouseStockItem | any) => void) | undefined;
	onSelectItem?: ((item: WarehouseStockItem) => void) | undefined;
	onReceiveItem?: ((item: WarehouseStockItem, ...args: unknown[]) => void) | undefined;
	onDeductItem?: ((item: WarehouseStockItem, ...args: unknown[]) => void) | undefined;
	onEditItem?: ((item: WarehouseStockItem) => void) | undefined;
	onDeleteItem?: ((itemOrId: WarehouseStockItem | string, name?: string | undefined) => void) | undefined;
	onOpenAddModal?: (() => void) | undefined;
	onOpenWaybills?: (() => void) | undefined;
	onOpenShiftDeduction?: (() => void) | undefined;
	onRetry?: (() => void) | undefined;
	className?: string | undefined;
}

/**
 * Классы компактной высоты тулбара склада (32-36px: h-8, h-9, min-h-[36px])
 * для строгого соблюдения эргономики соло-врача и администратора (Мандат 8e / soloDoctorAdminErgonomicsAudit).
 */
export const INVENTORY_TOOLBAR_DENSITY_CLASS = "min-h-[36px] h-9";

const CATEGORY_TABS = [
	{ id: "all", label: "Все категории" },
	{ id: "therapy", label: "Терапия" },
	{ id: "orthopedic", label: "Ортопедия" },
	{ id: "surgery", label: "Хирургия" },
	{ id: "consumable", label: "Расходники" },
	{ id: "anesthesia", label: "Анестетики" },
	{ id: "hygiene", label: "Гигиена" },
];

export const WarehouseStockTable: React.FC<WarehouseStockTableProps> = ({
	items = [],
	isLoading = false,
	loadError = null,
	searchQuery: externalSearch = "",
	hasMore = false,
	remainingCount = 0,
	onShowMore,
	onOpenWarehouseManager,
	onOpenInventoryAudit,
	onCreateDisposalAct,
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
	const [activeCategory, setActiveCategory] = useState("all");
	const searchInputRef = useRef<HTMLInputElement>(null);
	const effectiveSearch = externalSearch || localSearch;

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
				e.preventDefault();
				searchInputRef.current?.focus();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);

	const filteredItems = useMemo(() => {
		let res = items;
		if (activeCategory !== "all") {
			const cat = activeCategory.toLowerCase();
			res = res.filter((it) => {
				const c = (it.category || "").toLowerCase();
				if (cat === "therapy") return c.includes("терап") || c.includes("пломб") || c.includes("композ");
				if (cat === "orthopedic") return c.includes("ортоп") || c.includes("слепоч");
				if (cat === "surgery") return c.includes("хирург") || c.includes("имплант") || c.includes("шовн");
				if (cat === "consumable") return c.includes("расход") || c.includes("перчат") || c.includes("маск") || c.includes("валик");
				if (cat === "anesthesia") return c.includes("анест") || c.includes("артик") || c.includes("убистезин");
				if (cat === "hygiene") return c.includes("гигиен") || c.includes("чистк") || c.includes("порошок");
				return c.includes(cat);
			});
		}
		if (effectiveSearch.trim()) {
			const q = effectiveSearch.trim().toLowerCase();
			res = res.filter((it) => (it.name || "").toLowerCase().includes(q) || (it.sku || "").toLowerCase().includes(q) || (it.barcode || "").toLowerCase().includes(q));
		}
		return res;
	}, [items, activeCategory, effectiveSearch]);

	const stats = useMemo(() => {
		let total = items.length, overdraft = 0, low = 0, totalRub = 0;
		for (const it of items) {
			const qty = Number(it.stockQuantity ?? it.currentStock ?? it.currentQty ?? 0);
			const min = Number(it.criticalThreshold ?? it.minStockLevel ?? it.minStock ?? 5);
			const cost = Number(it.averageCostRub ?? it.unitCostRub ?? 0);
			if (qty < 0) overdraft++;
			else if (qty <= min) low++;
			if (qty > 0) totalRub += qty * cost;
		}
		return { total, overdraft, low, totalRub: Math.round(totalRub) };
	}, [items]);

	if (isLoading && items.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center p-12 text-[var(--muted)] gap-3 bg-[var(--paper)] rounded-2xl border border-[var(--line)]">
				<Package className="animate-spin text-[var(--teal,#0d9488)]" size={32} />
				<span className="text-sm font-medium">Загрузка складских остатков...</span>
			</div>
		);
	}

	if (loadError && items.length === 0) {
		return (
			<div className="p-6 text-center bg-[var(--paper)] rounded-2xl border border-[var(--line)] text-[var(--ink)]">
				<AlertTriangle className="mx-auto mb-2 text-amber-500" size={32} />
				<p className="text-sm text-[var(--muted)] mb-4">{loadError}</p>
				{onRetry && <button type="button" onClick={onRetry} className="secondary-button px-4 py-2 text-xs">Повторить попытку</button>}
			</div>
		);
	}

	return (
		<div className={`w-full flex flex-col gap-3 ${className}`} data-testid="warehouse-stock-table-root">
			{/* Верхняя статусная панель KPI */}
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0">
				<div className="p-3 bg-[var(--paper-soft)] rounded-xl border border-[var(--line-subtle)] flex flex-col">
					<span className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted)]">Всего материалов</span>
					<span className="text-xl font-bold text-[var(--ink)]">{stats.total} поз.</span>
				</div>
				<div className="p-3 bg-[var(--paper-soft)] rounded-xl border border-[var(--line-subtle)] flex flex-col">
					<span className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted)]">Оценка остатка</span>
					<span className="text-xl font-bold text-[var(--ink)] font-mono tabular-nums">{stats.totalRub.toLocaleString("ru-RU")} ₽</span>
				</div>
				<div className="p-3 bg-[var(--paper-soft)] rounded-xl border border-[var(--line-subtle)] flex flex-col">
					<span className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted)]">Мало на складе</span>
					<span className={`text-xl font-bold ${stats.low > 0 ? "text-amber-500" : "text-emerald-500"}`}>{stats.low} поз.</span>
				</div>
				<div className="p-3 bg-[var(--paper-soft)] rounded-xl border border-[var(--line-subtle)] flex flex-col">
					<span className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted)]">Мягкий овердрафт</span>
					<span className={`text-xl font-bold ${stats.overdraft > 0 ? "text-amber-500" : "text-emerald-500"}`}>{stats.overdraft > 0 ? `${stats.overdraft} поз.` : "0 (дефицита нет)"}</span>
				</div>
			</div>

			{/* Тулбар поиска и фильтрации */}
			<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0 bg-[var(--paper)] p-2.5 rounded-xl border border-[var(--line)]">
				<div className="relative flex-1 min-w-[220px]">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none" size={16} />
					<input ref={searchInputRef} type="text" value={localSearch} onChange={(e) => setLocalSearch(e.target.value)} placeholder="Поиск по артикулу, названию или категории (Ctrl+K)..." className="w-full !pl-9 pr-3 !h-9 !min-h-[36px] text-sm bg-[var(--paper-soft)] text-[var(--ink)] rounded-lg border border-[var(--line-subtle)] focus:outline-hidden focus:border-[var(--teal,#0d9488)] transition-colors" data-testid="warehouse-search-input" />
				</div>
				<div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
					{CATEGORY_TABS.map((tab) => (
						<button key={tab.id} type="button" onClick={() => setActiveCategory(tab.id)} className={`px-3 py-1.5 text-xs font-medium rounded-lg shrink-0 transition-colors whitespace-nowrap ${activeCategory === tab.id ? "bg-[var(--teal,#0d9488)] text-white shadow-xs" : "bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] border border-[var(--line-subtle)]"}`} data-testid={`warehouse-tab-${tab.id}`}>
							{tab.label}
						</button>
					))}
				</div>
				{(onOpenWaybills || onOpenShiftDeduction || onOpenAddModal) && (
					<div className="flex items-center gap-1.5 shrink-0 flex-wrap sm:flex-nowrap">
						{onOpenShiftDeduction && (
							<button
								type="button"
								onClick={onOpenShiftDeduction}
								className="secondary-button h-9 min-h-[36px] px-3 text-xs sm:text-sm font-medium rounded-xl inline-flex items-center gap-1.5 text-[var(--ink)] border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--paper-strong)] transition-colors shrink-0 shadow-xs whitespace-nowrap"
								data-testid="btn-warehouse-shift-deduction"
								title="Списать расходники за смену (1 клик)"
							>
								<Zap size={14} className="text-[var(--teal,#0d9488)] shrink-0" />
								<span>Списать смену</span>
							</button>
						)}
						{onOpenWaybills && (
							<button
								type="button"
								onClick={onOpenWaybills}
								className="secondary-button h-9 min-h-[36px] px-3 text-xs sm:text-sm font-medium rounded-xl inline-flex items-center gap-1.5 text-[var(--ink)] border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--paper-strong)] transition-colors shrink-0 shadow-xs whitespace-nowrap"
								data-testid="btn-warehouse-waybills"
							>
								<Package size={15} className="shrink-0" />
								<span>+ Приходная накладная</span>
							</button>
						)}
						{onOpenAddModal && !onOpenWaybills && (
							<button
								type="button"
								onClick={onOpenAddModal}
								className="secondary-button h-9 min-h-[36px] px-3 text-xs sm:text-sm font-medium rounded-xl inline-flex items-center gap-1.5 text-[var(--ink)] border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--paper-strong)] transition-colors shrink-0 shadow-xs whitespace-nowrap"
								data-testid="btn-warehouse-add-item"
							>
								<PlusCircle size={15} className="shrink-0" />
								<span>+ Позиция</span>
							</button>
						)}
					</div>
				)}
			</div>

			{/* Мягкий овердрафт предупреждение */}
			{stats.overdraft > 0 && (
				<div className="flex items-center justify-between gap-3 p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl text-amber-600 dark:text-amber-400 text-xs shrink-0">
					<div className="flex items-center gap-2">
						<AlertTriangle size={16} className="shrink-0" />
						<span><strong>Мягкий овердрафт:</strong> {stats.overdraft} поз. списаны под приём до внесения накладной. Работа клиники не блокируется.</span>
					</div>
					{onOpenWaybills && <button type="button" onClick={onOpenWaybills} className="secondary-button px-2.5 py-1 text-xs shrink-0 font-medium">Внести накладную</button>}
				</div>
			)}

			{/* Контент: Desktop 7 колонок vs Mobile Grouped Cards (Apple HIG) */}
			{isMobile ? (
				<div className="flex flex-col gap-2.5 w-full max-w-full overflow-x-clip" data-testid="warehouse-stock-mobile-cards">
					{filteredItems.length === 0 ? (
						<div className="py-8 text-center text-xs text-[var(--muted)] bg-[var(--paper)] rounded-2xl border border-[var(--line)]">Материалов не найдено</div>
					) : (
						filteredItems.map((item) => {
							const qty = Number(item.stockQuantity ?? item.currentStock ?? item.currentQty ?? 0);
							const unit = item.unit || "шт.";
							const isOverdraft = qty < 0;
							const minStock = Number(item.criticalThreshold ?? item.minStockLevel ?? item.minStock ?? 5);
							const isLow = qty <= minStock && qty >= 0;
							const sku = item.sku || item.barcode || item.id.slice(0, 8);
							const traffic = getExpiryTrafficLight(item.expirationDate);

							return (
								<div key={item.id} onClick={() => onSelectItem?.(item)} className="p-3.5 bg-[var(--paper)] rounded-2xl border border-[var(--line)] shadow-xs flex flex-col gap-2.5 transition-colors cursor-pointer hover:border-[var(--teal,#0d9488)]/40">
									<div className="flex items-start justify-between gap-2">
										<div className="flex-1 min-w-0">
											<span className="text-[11px] font-mono text-[var(--muted)]">#{sku}</span>
											<h4 className="font-semibold text-sm text-[var(--ink)] line-clamp-2 leading-snug">{item.name}</h4>
											<div className="flex items-center gap-2 mt-0.5 flex-wrap">
												<span className="text-xs text-[var(--muted)]">{getCategoryBadge(item.category || "").label}</span>
												{item.expirationDate && (
													<span className={`inline-flex px-1.5 py-0.2 rounded font-medium text-[10px] border ${traffic.className}`}>{traffic.badgeTextRu}</span>
												)}
											</div>
										</div>
										<span className={`px-2.5 py-1 rounded-full text-xs font-bold shrink-0 ${isOverdraft ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30" : isLow ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"}`}>
											{isOverdraft ? `⚠️ ${qty} ${unit}` : isLow ? `Мало (${qty})` : `В норме (${qty})`}
										</span>
									</div>

									{/* Строка с гарантией высоты >= 52px и тач-мишенями >= 44x44px */}
									<div className="min-h-[52px] flex items-center justify-between text-xs pt-2 border-t border-[var(--line-subtle)] gap-2">
										<div className="flex flex-col font-mono text-[var(--muted)] text-[11px] tabular-nums">
											<span>Остаток: <strong className="text-[var(--ink)] font-bold">{qty} {unit}</strong></span>
											<span>Мин. запас: {minStock} {unit}</span>
										</div>
										<div className="flex items-center gap-1.5 shrink-0">
											{onReceiveItem && (
												<button
													type="button"
													onClick={(e) => { e.stopPropagation(); onReceiveItem(item); }}
													className="secondary-button min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-95 transition-transform"
													title="Оприходовать партию"
													aria-label={`Приход ${item.name}`}
												>
													<PlusCircle size={18} />
												</button>
											)}
											<button
												type="button"
												onClick={(e) => { e.stopPropagation(); onDeductItem?.(item); }}
												className="secondary-button min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-amber-600 dark:text-amber-400 border border-amber-500/25 bg-amber-500/10 hover:bg-amber-500/20 active:scale-95 transition-transform"
												title="Списать расходник (мягкий овердрафт)"
												aria-label={`Списать ${item.name}`}
											>
												<MinusCircle size={18} />
											</button>
											{onEditItem && (
												<button
													type="button"
													onClick={(e) => { e.stopPropagation(); onEditItem(item); }}
													className="secondary-button min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-[var(--muted)] hover:text-[var(--ink)] border border-[var(--line-subtle)] active:scale-95 transition-transform"
													title="Редактировать"
													aria-label={`Редактировать ${item.name}`}
												>
													<Edit2 size={16} />
												</button>
											)}
										</div>
									</div>
								</div>
							);
						})
					)}
				</div>
			) : (
				<div className="overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--paper)] shadow-xs">
					<table style={{ tableLayout: "fixed", width: "100%" }} className="w-full text-left text-sm border-collapse" data-testid="warehouse-stock-table">
						<thead>
							<tr className="border-b border-[var(--line)] bg-[var(--paper-soft)] text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
								<th style={{ width: "100px" }} className="py-3 px-3">Артикул</th>
								<th className="py-3 px-3">Наименование</th>
								<th style={{ width: "130px" }} className="py-3 px-3">Категория</th>
								<th style={{ width: "90px" }} className="py-3 px-3 text-right font-semibold">Остаток</th>
								<th style={{ width: "75px" }} className="py-3 px-3 text-center">Ед. изм.</th>
								<th style={{ width: "95px" }} className="py-3 px-3 text-right font-semibold">Мин. запас</th>
								<th style={{ width: "230px" }} className="py-3 px-3.5 text-center">Статус остатка</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-[var(--line-subtle)]">
							{filteredItems.length === 0 ? (
								<tr>
									<td colSpan={7} className="py-10 text-center text-sm text-[var(--muted)]">Материалов по заданным критериям не найдено</td>
								</tr>
							) : (
								filteredItems.map((item) => {
									const qty = Number(item.stockQuantity ?? item.currentStock ?? item.currentQty ?? 0);
									const unit = item.unit || "шт.";
									const isOverdraft = qty < 0;
									const minStock = Number(item.criticalThreshold ?? item.minStockLevel ?? item.minStock ?? 5);
									const isLow = qty <= minStock && qty >= 0;
									const sku = item.sku || item.barcode || item.id.slice(0, 8);
									const traffic = getExpiryTrafficLight(item.expirationDate);

									return (
										<tr key={item.id} data-testid={`stock-row-${item.id}`} className={`hover:bg-[var(--paper-soft)]/60 transition-colors cursor-pointer stock-row-${item.id}`} onClick={() => onSelectItem?.(item)}>
											{/* 1. Артикул */}
											<td className="py-2.5 px-3 font-mono text-xs text-[var(--muted)] truncate" title={sku}>{sku}</td>
											{/* 2. Наименование */}
											<td className="py-2.5 px-3">
												<div className="font-medium text-[var(--ink)] truncate" title={item.name}>{item.name}</div>
												{item.expirationDate && (
													<div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
														<span className={`inline-flex px-1.5 py-0.2 rounded font-medium text-[10px] border ${traffic.className}`}>{traffic.badgeTextRu}</span>
														{traffic.status === "expired" && (
															<button
																type="button"
																data-testid={`btn-sanpin-disposal-act-${item.id}`}
																onClick={(e) => {
																	e.stopPropagation();
																	onCreateDisposalAct?.(item);
																}}
																className="secondary-button px-1.5 py-0.2 text-[10px] text-rose-500 hover:text-rose-600 border border-rose-500/30 rounded"
															>
																Акт утилизации
															</button>
														)}
													</div>
												)}
											</td>
											{/* 3. Категория */}
											<td className="py-2.5 px-3 text-xs text-[var(--muted)] whitespace-nowrap" title={getCategoryBadge(item.category || "").label}>
												{getCategoryBadge(item.category || "").label}
											</td>
											{/* 4. Остаток */}
											<td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums">
												<span className={isOverdraft ? "text-amber-500" : isLow ? "text-amber-500" : "text-emerald-600 dark:text-emerald-400"}>{qty}</span>
											</td>
											{/* 5. Ед. изм. */}
											<td className="py-2.5 px-3 text-center text-xs text-[var(--muted)] font-medium">{unit}</td>
											{/* 6. Мин. запас */}
											<td className="py-2.5 px-3 text-right font-mono text-xs text-[var(--muted)] tabular-nums">{minStock}</td>
											{/* 7. Статус остатка (Мандат 8n: В норме / Мало / Перерасход (овердрафт)) */}
											<td className="py-2.5 px-3.5 text-center">
												<div className="inline-flex items-center gap-1.5 justify-center flex-wrap">
													{isOverdraft || qty === 0 ? (
														<span data-testid={`soft-overdraft-badge-${item.id}`} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30" title="Списано под операцию (мягкий овердрафт)">
															{qty < 0 ? `⚠️ Перерасход (${qty})` : "Ожидается поставка (мягкий овердрафт)"}
														</span>
													) : isLow ? (
														<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400">Мало</span>
													) : (
														<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">В норме</span>
													)}
													<button type="button" onClick={(e) => { e.stopPropagation(); onDeductItem?.(item); }} className="secondary-button p-1 text-xs text-amber-600 dark:text-amber-400" title="Списать расходник">
														<MinusCircle size={14} /><span className="sr-only">Списать (Овердрафт)</span>
													</button>
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

			{/* Кнопка подгрузки пагинации при наличии элементов сверх лимита */}
			{hasMore && onShowMore && (
				<div className="flex justify-center p-3 shrink-0" data-testid="warehouse-pagination-container">
					<button
						type="button"
						onClick={onShowMore}
						className="secondary-button px-4 py-2 text-xs font-medium text-[var(--teal,#0d9488)] hover:bg-[var(--paper-soft)] border border-[var(--line)] rounded-xl transition-colors shadow-xs"
						data-testid="btn-inventory-show-more"
					>
						Показать ещё 40 материалов (осталось {remainingCount ?? 0})
					</button>
				</div>
			)}
		</div>
	);
};

export type InventoryStockTableProps = WarehouseStockTableProps;
export const InventoryStockTable: React.FC<InventoryStockTableProps> = WarehouseStockTable;
export const WarehouseItemsTable: React.FC<WarehouseStockTableProps> = WarehouseStockTable;
export const StockBalanceTable: React.FC<WarehouseStockTableProps> = WarehouseStockTable;

export default WarehouseStockTable;
