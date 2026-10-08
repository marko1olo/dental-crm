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
import { WarehouseStockAlertsBar } from "./WarehouseStockAlertsBar.js";
import { WarehousePackageWriteOffBar } from "../inventory/WarehousePackageWriteOffBar.js";
import { ConsumablesDeductionModal } from "./ConsumablesDeductionModal.js";
import { getFefoTrafficLight } from "../inventory/fefoTrafficLight.js";
import { isDemoShowcaseMode } from "../../lib/demoMode.js";

export type WarehouseCategoryKey =
	| "all"
	| "therapy"
	| "surgery"
	| "orthopedics"
	| "disposables"
	| "disinfection";

export interface WarehouseCategoryTabDef {
	id: WarehouseCategoryKey;
	label: string;
}

export const WAREHOUSE_CATEGORY_TABS: WarehouseCategoryTabDef[] = [
	{ id: "all", label: "Все" },
	{ id: "therapy", label: "Терапия" },
	{ id: "surgery", label: "Хирургия" },
	{ id: "orthopedics", label: "Ортопедия" },
	{ id: "disposables", label: "Расходники" },
	{ id: "disinfection", label: "Дезинфекция" },
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

/**
 * Главная обзорная вкладка склада материалов DENTE (СанПиН 3.3686-21, Мандаты 8e, 8n, 8s).
 * - Сжатый 32px Segmented Bar: [ Все | Терапия | Хирургия | Ортопедия | Расходники | Дезинфекция ].
 * - Сохранение линии сгиба (Fold Line) без раздутых баннеров.
 * - Цветовые маркеры статусов: "В норме" (зеленый), "Заканчивается" (янтарный), "Требуется заказ / Овердрафт" (красный).
 * - Мягкий овердрафт разрешен, автономия врача защищена.
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
	onOpenProtocolDeduction,
}) => {
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedCategory, setSelectedCategory] = useState<WarehouseCategoryKey>("all");
	const [isExpressBarOpen, setIsExpressBarOpen] = useState(false);
	const [isDeductionModalOpen, setIsDeductionModalOpen] = useState(false);

	// Карта остатков для BOM автосписания (Мандат 8e / 8n)
	const stockMap = useMemo(() => {
		const map: Record<string, number> = {};
		for (const it of items) {
			map[it.id] = Number(it.stockQuantity) || 0;
		}
		return map;
	}, [items]);

	// Балансовые KPI метрики склада (компактный 32px стрип)
	const kpis = useMemo(() => {
		const totalCount = items.length;
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

	// Фильтрация позиций по категориям СанПиН / номенклатуре
	const filteredItems = useMemo(() => {
		return items.filter((item) => {
			if (searchQuery.trim()) {
				const q = searchQuery.toLowerCase();
				const matchesName = item.name.toLowerCase().includes(q);
				const matchesSku = item.sku ? item.sku.toLowerCase().includes(q) : false;
				const matchesLot = item.lotNumber ? item.lotNumber.toLowerCase().includes(q) : false;
				if (!matchesName && !matchesSku && !matchesLot) return false;
			}

			if (selectedCategory === "all") return true;

			const cat = (item.category || "").toLowerCase();
			const name = (item.name || "").toLowerCase();

			if (selectedCategory === "therapy") {
				return (
					cat.includes("терапи") ||
					cat.includes("композит") ||
					cat.includes("эндо") ||
					name.includes("пломб") ||
					name.includes("бонд") ||
					name.includes("адгезив") ||
					name.includes("трави") ||
					name.includes("паста") ||
					name.includes("filtek") ||
					name.includes("estelite") ||
					name.includes("gradia") ||
					name.includes("спектрум") ||
					name.includes("файл") ||
					name.includes("силлер") ||
					name.includes("гуттаперч")
				);
			}

			if (selectedCategory === "surgery") {
				return (
					cat.includes("хирург") ||
					name.includes("скальпель") ||
					name.includes("шовн") ||
					name.includes("имплант") ||
					name.includes("губка") ||
					name.includes("элеватор") ||
					name.includes("щипц")
				);
			}

			if (selectedCategory === "orthopedics") {
				return (
					cat.includes("ортопед") ||
					cat.includes("протез") ||
					name.includes("слепоч") ||
					name.includes("силикон") ||
					name.includes("альгинат") ||
					name.includes("цемент") ||
					name.includes("корон") ||
					name.includes("абатмент") ||
					name.includes("ложка")
				);
			}

			if (selectedCategory === "disposables") {
				return (
					cat.includes("расход") ||
					cat.includes("сиз") ||
					name.includes("перчатк") ||
					name.includes("маск") ||
					name.includes("нагрудник") ||
					name.includes("слюноотсос") ||
					name.includes("валик") ||
					name.includes("браш") ||
					name.includes("салфет") ||
					name.includes("простын") ||
					name.includes("бахил") ||
					name.includes("шприц") ||
					name.includes("игла")
				);
			}

			if (selectedCategory === "disinfection") {
				return (
					cat.includes("дезинфек") ||
					cat.includes("стерил") ||
					cat.includes("санпин") ||
					name.includes("аламинол") ||
					name.includes("азопирам") ||
					name.includes("крафт") ||
					name.includes("индикатор") ||
					name.includes("стерил") ||
					name.includes("антисептик") ||
					name.includes("спирт") ||
					name.includes("дез")
				);
			}

			return true;
		});
	}, [items, searchQuery, selectedCategory]);

	return (
		<div
			className="warehouse-overview-tab flex-1 flex flex-col min-h-0 overflow-hidden w-full gap-2"
			data-testid="warehouse-overview-tab"
		>
			{/* 1. КОМПАКТНЫЙ 32PX МЕТРИЧЕСКИЙ СТРИП (СОХРАНЕНИЕ FOLD LINE) */}
			<div className="min-h-[32px] py-1 px-3 bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] rounded-lg flex flex-wrap items-center justify-between gap-2 shrink-0 text-xs">
				<div className="flex items-center gap-3.5 flex-wrap">
					<div className="flex items-center gap-1.5">
						<span className="text-[var(--muted,#64748b)]">Всего позиций:</span>
						<span className="font-bold text-[var(--ink,#0f172a)]">{kpis.totalCount}</span>
					</div>

					<div className="flex items-center gap-1.5">
						<span className="text-orange-700 dark:text-orange-400 font-semibold">Критический остаток:</span>
						<span className="font-bold text-orange-600 dark:text-orange-400">{kpis.lowStockCount}</span>
					</div>

					<div className="flex items-center gap-1.5">
						<span className="text-amber-700 dark:text-amber-400 font-semibold">Расход сверх остатка:</span>
						<span className="font-bold text-amber-600 dark:text-amber-400">{kpis.overdraftCount}</span>
						{kpis.overdraftCount > 0 && (
							<span className="text-[10px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300">
								Овердрафт
							</span>
						)}
					</div>

					<div className="flex items-center gap-1.5 hidden sm:flex">
						<span className="text-[var(--muted,#64748b)]">Стоимость запасов:</span>
						<span className="font-bold text-teal-700 dark:text-teal-300">{money(kpis.totalRub)}</span>
					</div>
				</div>

				<div className="flex items-center gap-2">
					{kpis.overdraftCount > 0 && onOpenWaybills && (
						<button
							type="button"
							onClick={onOpenWaybills}
							className="text-[11px] font-semibold text-teal-700 dark:text-teal-300 hover:underline flex items-center gap-1 cursor-pointer"
						>
							<Truck size={12} />
							<span>Закрыть накладной</span>
						</button>
					)}
				</div>
			</div>

			{/* 2. ОПЕРАТИВНЫЕ ПРЕДУПРЕЖДЕНИЯ (ТОЛЬКО ПРИ НАЛИЧИИ АЛЕРТОВ) */}
			<WarehouseStockAlertsBar
				items={items}
				onOpenWaybills={onOpenWaybills}
				onOpenBatchTracking={() => onOpenBatchTracking?.()}
				onOpenInventoryAudit={onOpenInventoryAudit}
			/>

			{/* 3. ЕДИНЫЙ 32PX ТУЛБАР УПРАВЛЕНИЯ И СЕГМЕНТИРОВАННЫЙ БАР КАТЕГОРИЙ */}
			<div className="min-h-[36px] py-1 px-2.5 bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] rounded-lg flex flex-wrap items-center justify-between gap-2 shrink-0">
				{/* Поиск */}
				<div className="dente-search-wrap relative min-w-[180px] max-w-xs flex-1">
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

				{/* Apple HIG 32px Segmented Bar категорий */}
				<div
					style={{
						height: 32,
						padding: 2,
						background: "var(--paper-soft, #f1f5f9)",
						border: "1px solid var(--line, #cbd5e1)",
						borderRadius: 8,
						display: "inline-flex",
						alignItems: "center",
						gap: 3,
					}}
					role="tablist"
					aria-label="Категории ТМЦ"
					data-testid="warehouse-category-filters"
				>
					{WAREHOUSE_CATEGORY_TABS.map((tab) => {
						const isActive = selectedCategory === tab.id;
						return (
							<button
								key={tab.id}
								type="button"
								role="tab"
								aria-selected={isActive}
								onClick={() => setSelectedCategory(tab.id)}
								style={{
									height: 26,
									padding: "0 10px",
									borderRadius: 6,
									fontSize: "0.75rem",
									fontWeight: isActive ? 700 : 500,
									border: isActive ? "1px solid var(--line, #cbd5e1)" : "1px solid transparent",
									background: isActive ? "var(--paper, #ffffff)" : "transparent",
									color: isActive ? "var(--teal-700, #0f766e)" : "var(--muted, #64748b)",
									boxShadow: isActive ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
									cursor: "pointer",
									whiteSpace: "nowrap",
									transition: "all 0.15s ease",
								}}
								data-testid={`warehouse-category-${tab.id}`}
							>
								{tab.label}
							</button>
						);
					})}
				</div>

				{/* Кнопки быстрых действий */}
				<div className="flex items-center gap-1.5 flex-wrap shrink-0">
					<button
						type="button"
						onClick={() => {
							if (onOpenProtocolDeduction) {
								onOpenProtocolDeduction();
							} else {
								setIsDeductionModalOpen(true);
							}
						}}
						className="h-8 min-h-[32px] px-2.5 rounded-lg text-xs font-semibold border border-teal-500/40 text-teal-800 dark:text-teal-200 hover:bg-teal-50 dark:hover:bg-teal-950/40 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
						data-testid="btn-overview-protocol-deduction"
						title="Списание комплекта расходных материалов по клиническому протоколу услуги (BOM 804н)"
					>
						<Zap size={14} className="text-teal-600 dark:text-teal-400" />
						<span>Списание по протоколу</span>
					</button>

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

			{/* 4. РАСКРЫВАЮЩАЯСЯ ПАНЕЛЬ ПАКЕТНОГО СПИСАНИЯ */}
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

			{/* 5. ПОЛНОЦЕННАЯ ТАБЛИЦА ОСТАТКОВ МАТЕРИАЛОВ */}
			<div className="flex-1 border border-[var(--line,#e2e8f0)] rounded-lg overflow-hidden flex flex-col bg-[var(--paper,#ffffff)] min-h-[300px]">
				<div className="overflow-x-auto flex-1">
					<table className="w-full text-left text-xs border-collapse" data-testid="warehouse-overview-table">
						<thead className="bg-[var(--paper-soft,#f8fafc)] text-[var(--muted,#64748b)] border-b border-[var(--line,#e2e8f0)] sticky top-0 z-10 font-semibold">
							<tr>
								<th className="py-2.5 px-3">Материал</th>
								<th className="py-2.5 px-3 hidden sm:table-cell">Категория</th>
								<th className="py-2.5 px-3">Текущий остаток</th>
								<th className="py-2.5 px-3 hidden md:table-cell">Критический порог</th>
								<th className="py-2.5 px-3 hidden lg:table-cell">Себестоимость</th>
								<th className="py-2.5 px-3">Статус остатка</th>
								<th className="py-2.5 px-3 text-right">Действия</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-[var(--line,#e2e8f0)]">
							{filteredItems.length === 0 ? (
								<tr>
									<td colSpan={7} className="py-12 text-center text-[var(--muted,#64748b)]" data-testid="overview-empty-state">
										<Package size={32} className="mx-auto mb-2 opacity-50 text-teal-600" />
										<p className="font-semibold text-sm text-[var(--ink,#0f172a)]">
											{items.length === 0
												? "Склад пуст — проведите первую приходную накладную"
												: "Позиции по выбранным критериям не найдены"}
										</p>
										<p className="text-xs text-[var(--muted,#64748b)] mt-1 max-w-md mx-auto">
											{items.length === 0
												? "В боевом режиме остатки формируются по приходным накладным ТОРГ-12 от поставщиков или ручному оприходованию."
												: "Попробуйте изменить категорию или поисковый запрос."}
										</p>
										{items.length === 0 && onOpenWaybills && (
											<button
												type="button"
												onClick={onOpenWaybills}
												className="mt-3 h-8 px-3.5 rounded-lg bg-teal-600 text-white font-semibold text-xs hover:bg-teal-700 active:scale-98 transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
												data-testid="btn-empty-open-waybills"
											>
												<Truck size={13} />
												<span>Оприходовать накладную</span>
											</button>
										)}
									</td>
								</tr>
							) : (
								filteredItems.map((item) => {
									const qty = Number(item.stockQuantity) || 0;
									const threshold = Number(item.criticalThreshold) || 5;
									const isOverdraft = qty < 0;
									const isZero = qty === 0;
									const isLow = !isOverdraft && !isZero && qty <= threshold;
									const isNormal = qty > threshold;
									const fefo = item.expirationDate ? getFefoTrafficLight(item.expirationDate) : null;

									return (
										<tr
											key={item.id}
											className="hover:bg-[var(--paper-soft,#f8fafc)] transition-colors group cursor-pointer"
											onClick={() => onSelectItem?.(item)}
											data-testid={`warehouse-row-${item.id}`}
										>
											{/* 1. Материал */}
											<td className="py-2 px-3 font-medium text-[var(--ink,#0f172a)]">
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
												{(item.lotNumber || item.expirationDate) && (
													<div className="flex items-center gap-1.5 flex-wrap mt-0.5">
														{item.lotNumber && (
															<span className="text-[10px] text-[var(--muted,#64748b)] font-mono">
																Серия: {item.lotNumber}
															</span>
														)}
														{item.expirationDate && (
															<span className="text-[10px] text-[var(--muted,#64748b)]">
																до {item.expirationDate}
															</span>
														)}
														{fefo && (
															<span
																className={`inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${
																	fefo.status === "red"
																		? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30"
																		: fefo.status === "yellow"
																			? "bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30"
																			: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
																}`}
																title={fefo.tooltip}
																data-testid={`fefo-badge-${item.id}`}
															>
																{fefo.status === "red"
																	? fefo.daysLeft <= 0
																		? "Просрочен"
																		: "Истекает"
																	: fefo.status === "yellow"
																		? "Внимание"
																		: "Свежий"}
															</span>
														)}
													</div>
												)}
											</td>

											{/* 2. Категория */}
											<td className="py-2 px-3 text-[var(--muted,#64748b)] hidden sm:table-cell truncate max-w-[120px]">
												{item.category || "Расходные"}
											</td>

											{/* 3. Текущий остаток и ед. изм. */}
											<td className="py-2 px-3 font-semibold">
												<span
													className={
														isOverdraft
															? "text-rose-600 dark:text-rose-400 font-bold"
															: isLow || isZero
																? "text-amber-600 dark:text-amber-400 font-bold"
																: "text-[var(--ink,#0f172a)]"
													}
												>
													{qty} {item.unit || "шт."}
												</span>
											</td>

											{/* 4. Критический порог */}
											<td className="py-2 px-3 hidden md:table-cell text-[var(--muted,#64748b)]">
												{threshold} {item.unit || "шт."}
											</td>

											{/* 5. Себестоимость */}
											<td className="py-2 px-3 hidden lg:table-cell text-[var(--muted,#64748b)] font-medium">
												{money(item.unitCostRub || 0)}
											</td>

											{/* 6. Статус остатка с цветовыми маркерами */}
											<td className="py-2 px-3">
												{isOverdraft ? (
													<span
														className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30"
														title="Расход зафиксирован с дефицитом, прием не блокируется (мягкий овердрафт)"
													>
														<ShieldAlert size={12} className="text-rose-600" />
														<span>Овердрафт ({qty})</span>
													</span>
												) : isZero ? (
													<span
														className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30"
														title="Остаток 0, требуется пополнение накладной"
													>
														<AlertTriangle size={12} className="text-rose-600" />
														<span>Требуется заказ (0)</span>
													</span>
												) : isLow ? (
													<span
														className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30"
														title="Остаток ниже минимального порога"
													>
														<Clock size={12} className="text-amber-600" />
														<span>Заканчивается</span>
													</span>
												) : (
													<span
														className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
														title="Запас в норме"
													>
														<CheckCircle2 size={12} className="text-emerald-600" />
														<span>В норме</span>
													</span>
												)}
											</td>

											{/* 7. Действия (Мандат 8e: не блокировать списание) */}
											<td className="py-2 px-3 text-right" onClick={(e) => e.stopPropagation()}>
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

			{/* 6. МОДАЛКА СПИСАНИЯ ПО КЛИНИЧЕСКОМУ ПРОТОКОЛУ (BOM 804Н) */}
			<ConsumablesDeductionModal
				isOpen={isDeductionModalOpen}
				onClose={() => setIsDeductionModalOpen(false)}
				procedureTitle="Препарирование и пломба светового отверждения (Filtek / Estelite)"
				service804nCode="A16.07.002.011"
				currentStockMap={stockMap}
				onConfirmDeduction={(deducted) => {
					for (const d of deducted) {
						const it = items.find((x) => x.id === d.inventoryItemId);
						if (it) onDeductItem?.(it, d.deductedQty);
					}
					onRefresh?.();
				}}
			/>
		</div>
	);
};

export default WarehouseOverviewTab;
