import {
	AlertTriangle,
	ArrowDownToLine,
	ArrowUpFromLine,
	CheckCircle2,
	Clock,
	Layers,
	Package,
	Plus,
	Search,
	ShieldAlert,
	Syringe,
	Trash2,
	Truck,
	X,
	Zap,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { money } from "../../AppHelpers.js";
import type { InventoryItem } from "../inventory/useInventoryLogic.js";
import { INVENTORY_CATEGORIES, type InventoryCategoryFilter } from "../InventoryView.js";
import { WarehouseStockAlertsBar } from "./WarehouseStockAlertsBar.js";
import { WarehousePackageWriteOffBar } from "../inventory/WarehousePackageWriteOffBar.js";
import { getFefoTrafficLight } from "../inventory/fefoTrafficLight.js";

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
}

/**
 * Главная обзорная вкладка склада материалов DENTE (Мандаты 8e, 8n, 8s).
 * - Сквозной учет остатков, критических порогов и мягкого овердрафта.
 * - Быстрое пакетное списание расходных материалов без комиссии из 3 человек.
 * - 0 эмодзи, профессиональная терминология согласно СанПиН и стандартам, touch target >= 44px на таче.
 */
export const WarehouseOverviewTab: React.FC<WarehouseOverviewTabProps> = ({
	organizationId,
	items,
	isLoading = false,
	onRefresh,
	onSelectItem,
	onDeductItem,
	onReceiveItem,
	onOpenWaybills,
	onOpenBatchTracking,
	onOpenInventoryAudit,
	onQuickWriteoffCarpules,
	onOpenAddModal,
}) => {
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedCategory, setSelectedCategory] = useState<InventoryCategoryFilter>("all");
	const [isExpressBarOpen, setIsExpressBarOpen] = useState(false);

	// KPI метрики склада
	const kpis = useMemo(() => {
		let totalCount = items.length;
		let lowStockCount = 0;
		let overdraftCount = 0;
		let totalRub = 0;

		for (const it of items) {
			const qty = Number(it.stockQuantity) || 0;
			const threshold = Number(it.criticalThreshold) || 5;
			const cost = Number.parseFloat(it.unitCostRub || "0") || 0;

			if (qty < 0) {
				overdraftCount++;
			} else if (qty <= threshold) {
				lowStockCount++;
			}

			if (qty > 0) {
				totalRub += qty * cost;
			}
		}

		return {
			totalCount,
			lowStockCount,
			overdraftCount,
			totalRub,
		};
	}, [items]);

	// Фильтрация позиций
	const filteredItems = useMemo(() => {
		return items.filter((item) => {
			if (searchQuery.trim()) {
				const q = searchQuery.toLowerCase();
				const matchesName = item.name.toLowerCase().includes(q);
				const matchesSku = item.sku ? item.sku.toLowerCase().includes(q) : false;
				const matchesLot = item.lotNumber ? item.lotNumber.toLowerCase().includes(q) : false;
				if (!matchesName && !matchesSku && !matchesLot) return false;
			}

			if (selectedCategory !== "all") {
				const cat = (item.category || "").toLowerCase();
				const name = (item.name || "").toLowerCase();

				if (selectedCategory === "anesthesia") {
					const isAnesth =
						cat.includes("анестез") ||
						name.includes("артикаин") ||
						name.includes("ультракаин") ||
						name.includes("септанест") ||
						name.includes("скандонест") ||
						name.includes("мепивакаин") ||
						name.includes("карпул") ||
						name.includes("игла");
					if (!isAnesth) return false;
				} else if (selectedCategory === "therapy") {
					const isTherapy =
						cat.includes("терапи") ||
						name.includes("пломб") ||
						name.includes("бонд") ||
						name.includes("адгезив") ||
						name.includes("трави") ||
						name.includes("паста");
					if (!isTherapy) return false;
				} else if (selectedCategory === "composite") {
					const isComp =
						cat.includes("композит") ||
						name.includes("filtek") ||
						name.includes("estelite") ||
						name.includes("gradia") ||
						name.includes("спектрум");
					if (!isComp) return false;
				} else if (selectedCategory === "disposables") {
					const isDisp =
						cat.includes("расход") ||
						name.includes("перчатк") ||
						name.includes("маск") ||
						name.includes("нагрудник") ||
						name.includes("слюноотсос") ||
						name.includes("валик");
					if (!isDisp) return false;
				} else if (selectedCategory === "surgery") {
					const isSurg =
						cat.includes("хирург") ||
						name.includes("скальпель") ||
						name.includes("шовн") ||
						name.includes("имплант") ||
						name.includes("губка");
					if (!isSurg) return false;
				} else if (selectedCategory === "endo") {
					const isEndo =
						cat.includes("эндо") ||
						name.includes("файл") ||
						name.includes("силлер") ||
						name.includes("гуттаперч");
					if (!isEndo) return false;
				}
			}

			return true;
		});
	}, [items, searchQuery, selectedCategory]);

	return (
		<div
			className="warehouse-overview-tab flex-1 flex flex-col min-h-0 overflow-hidden w-full gap-2.5"
			data-testid="warehouse-overview-tab"
		>
			{/* 1. БАЛАНСОВЫЕ KPI КАРТОЧКИ */}
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0">
				<div className="p-2.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex flex-col">
					<span className="text-[11px] font-semibold text-[var(--muted,#64748b)] uppercase tracking-wider">
						Всего позиций
					</span>
					<span className="text-lg font-bold text-[var(--ink,#0f172a)] leading-tight mt-0.5">
						{kpis.totalCount}
					</span>
					<span className="text-[11px] text-[var(--muted,#64748b)]">В номенклатуре клиники</span>
				</div>

				<div className="p-2.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex flex-col">
					<span className="text-[11px] font-semibold text-orange-700 dark:text-orange-400 uppercase tracking-wider">
						Критический остаток
					</span>
					<span className="text-lg font-bold text-orange-600 dark:text-orange-400 leading-tight mt-0.5">
						{kpis.lowStockCount}
					</span>
					<span className="text-[11px] text-[var(--muted,#64748b)]">Ниже порогового минимума</span>
				</div>

				<div className="p-2.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex flex-col">
					<span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
						Расход сверх остатка
					</span>
					<span className="text-lg font-bold text-amber-600 dark:text-amber-400 leading-tight mt-0.5">
						{kpis.overdraftCount}
					</span>
					<span className="text-[11px] text-[var(--muted,#64748b)]">Мягкий овердрафт (разрешен)</span>
				</div>

				<div className="p-2.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex flex-col">
					<span className="text-[11px] font-semibold text-teal-700 dark:text-teal-400 uppercase tracking-wider">
						Стоимость запасов
					</span>
					<span className="text-lg font-bold text-teal-700 dark:text-teal-300 leading-tight mt-0.5">
						{money(kpis.totalRub)}
					</span>
					<span className="text-[11px] text-[var(--muted,#64748b)]">Балансовая оценка склада</span>
				</div>
			</div>

			{/* 2. ОПЕРАТИВНЫЕ СКЛАДСКИЕ ПРЕДУПРЕЖДЕНИЯ */}
			<WarehouseStockAlertsBar
				items={items}
				onOpenWaybills={onOpenWaybills}
				onOpenBatchTracking={() => onOpenBatchTracking?.()}
				onOpenInventoryAudit={onOpenInventoryAudit}
			/>

			{/* 3. КОМПАКТНЫЙ 1-СТРОЧНЫЙ ТУЛБАР УПРАВЛЕНИЯ */}
			<div className="min-h-[36px] h-auto py-1 px-3 bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] rounded-xl flex flex-wrap items-center justify-between gap-2 shrink-0">
				{/* Поиск */}
				<div className="dente-search-wrap relative flex-1 min-w-[200px] max-w-sm">
					<Search size={14} className="dente-search-icon" />
					<input
						type="text"
						className="dente-search-input"
						placeholder="Поиск по названию, артикулу или серии..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						data-testid="warehouse-overview-search"
					/>
					{searchQuery && (
						<button
							type="button"
							className="dente-search-clear"
							onClick={() => setSearchQuery("")}
							aria-label="Очистить поиск"
						>
							<X size={12} />
						</button>
					)}
				</div>

				{/* Кнопки быстрых действий */}
				<div className="flex items-center gap-1.5 flex-wrap shrink-0">
					<button
						type="button"
						onClick={() => setIsExpressBarOpen((prev) => !prev)}
						className={`h-8 min-h-[32px] px-2.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${
							isExpressBarOpen
								? "bg-teal-600 text-white border-teal-600 shadow-xs"
								: "border-[var(--line,#cbd5e1)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f1f5f9)]"
						}`}
						data-testid="toggle-express-writeoff-btn"
						title="Открыть экспресс-панель списания клинических наборов"
					>
						<Zap size={14} className={isExpressBarOpen ? "text-white" : "text-amber-500"} />
						<span>Пакетное списание</span>
					</button>

					{onQuickWriteoffCarpules && (
						<button
							type="button"
							onClick={onQuickWriteoffCarpules}
							className="h-8 min-h-[32px] px-2.5 rounded-lg text-xs font-semibold border border-teal-500/30 text-teal-800 dark:text-teal-200 hover:bg-teal-50 dark:hover:bg-teal-950/40 transition-all flex items-center gap-1.5 cursor-pointer"
							data-testid="btn-quick-carpule-overview"
							title="Списание пустых карпул анестетиков без созыва комиссии"
						>
							<Syringe size={14} className="text-teal-600 dark:text-teal-400" />
							<span>Списать карпулу</span>
						</button>
					)}

					{onOpenAddModal && (
						<button
							type="button"
							onClick={onOpenAddModal}
							className="h-8 min-h-[32px] px-3 rounded-lg text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 active:scale-98 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
							data-testid="btn-add-inventory-item"
						>
							<Plus size={14} />
							<span>Добавить ТМЦ</span>
						</button>
					)}
				</div>
			</div>

			{/* 4. РАСКРЫВАЮЩАЯСЯ ПАНЕЛЬ ЭКСПРЕСС-СПИСАНИЯ */}
			{isExpressBarOpen && (
				<div className="shrink-0" data-testid="express-writeoff-container">
					<WarehousePackageWriteOffBar
						warehouseItems={items}
						organizationId={organizationId}
						allowSoftOverdraft={true}
						onWriteOffComplete={() => onRefresh?.()}
					/>
				</div>
			)}

			{/* 5. ПОЛОСА КАТЕГОРИЙ */}
			<div
				className="dente-filter-chips min-h-[36px] sm:h-9 px-2 py-1 bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] rounded-xl flex items-center gap-1.5 overflow-x-auto no-scrollbar scrollbar-none flex-nowrap shrink-0"
				role="toolbar"
				aria-label="Фильтр по категориям ТМЦ"
				data-testid="warehouse-category-filters"
			>
				<span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted,#64748b)] mr-1 shrink-0">
					Категории:
				</span>
				{INVENTORY_CATEGORIES.map((cat) => {
					const Icon = cat.icon;
					const isActive = selectedCategory === cat.id;
					return (
						<button
							key={cat.id}
							type="button"
							onClick={() => setSelectedCategory(cat.id)}
							className={`dente-filter-chip ${isActive ? "active" : ""}`}
							aria-pressed={isActive}
							data-testid={`warehouse-category-${cat.id}`}
						>
							<Icon size={13} className="shrink-0" />
							<span>{cat.label}</span>
						</button>
					);
				})}
			</div>

			{/* 6. ТАБЛИЦА ОСТАТКОВ МАТЕРИАЛОВ */}
			<div className="flex-1 border border-[var(--line,#e2e8f0)] rounded-xl overflow-hidden flex flex-col bg-[var(--paper,#ffffff)] min-h-[280px]">
				<div className="overflow-x-auto flex-1">
					<table className="w-full text-left text-xs border-collapse" data-testid="warehouse-overview-table">
						<thead className="bg-[var(--paper-soft,#f8fafc)] text-[var(--muted,#64748b)] border-b border-[var(--line,#e2e8f0)] sticky top-0 z-10 font-semibold">
							<tr>
								<th className="py-2.5 px-3">Наименование / Артикул</th>
								<th className="py-2.5 px-3 hidden sm:table-cell">Категория</th>
								<th className="py-2.5 px-3">Остаток</th>
								<th className="py-2.5 px-3 hidden md:table-cell">Срок годности (FEFO)</th>
								<th className="py-2.5 px-3 hidden lg:table-cell">Цена за ед.</th>
								<th className="py-2.5 px-3 text-right">Действия</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-[var(--line,#e2e8f0)]">
							{filteredItems.length === 0 ? (
								<tr>
									<td colSpan={6} className="py-12 text-center text-[var(--muted,#64748b)]">
										<Package size={28} className="mx-auto mb-2 opacity-50" />
										<p className="font-medium">Позиции по выбранным критериям не найдены</p>
									</td>
								</tr>
							) : (
								filteredItems.map((item) => {
									const qty = Number(item.stockQuantity) || 0;
									const isOverdraft = qty < 0;
									const isLow = !isOverdraft && qty <= (item.criticalThreshold || 5);
									const fefo = item.expirationDate ? getFefoTrafficLight(item.expirationDate) : null;

									return (
										<tr
											key={item.id}
											className="hover:bg-[var(--paper-soft,#f8fafc)] transition-colors group cursor-pointer"
											onClick={() => onSelectItem?.(item)}
											data-testid={`warehouse-row-${item.id}`}
										>
											{/* Название */}
											<td className="py-2.5 px-3 font-medium text-[var(--ink,#0f172a)]">
												<div className="flex items-center gap-2">
													<div className="truncate max-w-[240px] sm:max-w-xs font-semibold">
														{item.name}
													</div>
													{item.sku && (
														<span className="text-[10px] text-[var(--muted,#64748b)] font-mono hidden sm:inline">
															{item.sku}
														</span>
													)}
												</div>
											</td>

											{/* Категория */}
											<td className="py-2.5 px-3 text-[var(--muted,#64748b)] hidden sm:table-cell truncate max-w-[120px]">
												{item.category || "Расходные"}
											</td>

											{/* Остаток */}
											<td className="py-2.5 px-3">
												<div className="flex items-center gap-1.5">
													<span
														className={`font-bold ${
															isOverdraft
																? "text-amber-600 dark:text-amber-400"
																: isLow
																	? "text-orange-600 dark:text-orange-400"
																	: "text-[var(--ink,#0f172a)]"
														}`}
													>
														{qty} {item.unit || "шт."}
													</span>
													{isOverdraft && (
														<span
															className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-900 dark:text-amber-200 shrink-0"
															title="Расход учтён с дефицитом (мягкий овердрафт)"
														>
															Дефицит
														</span>
													)}
												</div>
											</td>

											{/* Срок годности */}
											<td className="py-2.5 px-3 hidden md:table-cell text-[var(--muted,#64748b)]">
												{fefo ? (
													<div className="flex items-center gap-1.5">
														<span
															className={`w-2 h-2 rounded-full shrink-0 ${
																fefo.status === "red"
																	? "bg-rose-500"
																	: fefo.status === "yellow"
																		? "bg-amber-500"
																		: "bg-emerald-500"
															}`}
														/>
														<span>{item.expirationDate}</span>
														<span className="text-[10px] text-[var(--muted,#64748b)]">
															({fefo.badgeText})
														</span>
													</div>
												) : (
													<span>—</span>
												)}
											</td>

											{/* Цена */}
											<td className="py-2.5 px-3 hidden lg:table-cell text-[var(--muted,#64748b)] font-medium">
												{money(item.unitCostRub || 0)}
											</td>

											{/* Быстрые действия (Мандат 8e: не блокировать «- Списать») */}
											<td className="py-2.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
												<div className="flex items-center justify-end gap-1.5">
													<button
														type="button"
														onClick={() => onDeductItem?.(item, 1)}
														className="h-7 px-2 rounded-md border border-[var(--line,#cbd5e1)] text-[var(--ink,#0f172a)] hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:border-rose-300 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
														data-testid={`btn-deduct-item-${item.id}`}
														title="Списать 1 ед. (мягкий овердрафт разрешен при остатке <= 0)"
													>
														<ArrowDownToLine size={12} className="text-rose-600" />
														<span>Списать</span>
													</button>

													<button
														type="button"
														onClick={() => onReceiveItem?.(item, 1)}
														className="h-7 px-2 rounded-md border border-[var(--line,#cbd5e1)] text-[var(--ink,#0f172a)] hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:border-emerald-300 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
														data-testid={`btn-receive-item-${item.id}`}
														title="Оприходовать (+1 ед.)"
													>
														<ArrowUpFromLine size={12} className="text-emerald-600" />
														<span>Приход</span>
													</button>

													<button
														type="button"
														onClick={() => onOpenBatchTracking?.(item)}
														className="h-7 w-7 rounded-md border border-[var(--line,#cbd5e1)] text-[var(--muted,#64748b)] hover:text-teal-600 hover:border-teal-400 flex items-center justify-center transition-colors cursor-pointer"
														data-testid={`btn-batches-item-${item.id}`}
														title="Партии и серии (FEFO)"
													>
														<Layers size={13} />
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
			</div>
		</div>
	);
};

export default WarehouseOverviewTab;
