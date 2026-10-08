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
	Truck,
	X,
	Zap,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { money } from "../../AppHelpers.js";
import type { InventoryItem } from "../inventory/useInventoryLogic.js";
import { AutoBomDeductionBanner } from "./AutoBomDeductionBanner.js";
import { ConsumablesDeductionModal } from "./ConsumablesDeductionModal.js";
import { getFefoTrafficLight } from "../inventory/fefoTrafficLight.js";

export type WarehouseCatalogCategory =
	| "all"
	| "therapy"
	| "surgery"
	| "orthopedics"
	| "disposables"
	| "disinfection";

export interface WarehouseCatalogCategoryTab {
	readonly id: WarehouseCatalogCategory;
	readonly label: string;
}

export const WAREHOUSE_CATALOG_CATEGORIES: readonly WarehouseCatalogCategoryTab[] = [
	{ id: "all", label: "Все" },
	{ id: "therapy", label: "Терапия" },
	{ id: "surgery", label: "Хирургия" },
	{ id: "orthopedics", label: "Ортопедия" },
	{ id: "disposables", label: "Расходники" },
	{ id: "disinfection", label: "Дезинфекция" },
];

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

/**
 * WarehouseCatalogView — Единый клинический каталог склада материалов и списаний DENTE.
 *
 * Мандаты 8e (Врачебная автономия), 8n (Масштаб), 8s (Анти-блоат), СанПиН 3.3686-21.
 * - Тулбар склада: СТРОГО в 1 строку (32–36px) — поиск, segmented bar категорий и действия.
 * - Живой клинический язык: «Остаток в кабинете», «Списание по протоколу лечения», «Поступление партии».
 * - Автоматический баннер списания расходников к услуге (BOM) в 1 клик.
 * - Мягкий овердрафт: не блокирует работу врача у кресла.
 * - Тач-таргеты >= 44x44px на таче, плотная сетка 32px на ПК.
 */
export const WarehouseCatalogView: React.FC<WarehouseCatalogViewProps> = ({
	organizationId,
	items,
	isLoading = false,
	onRefresh,
	onSelectItem,
	onDeductItem,
	onReceiveItem,
	onOpenBatches,
	onOpenReceiptModal,
	onOpenAuditModal,
}) => {
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedCategory, setSelectedCategory] = useState<WarehouseCatalogCategory>("all");
	const [isDeductionModalOpen, setIsDeductionModalOpen] = useState(false);
	const [isBannerVisible, setIsBannerVisible] = useState(true);

	// Карта остатков для BOM списания
	const stockMap = useMemo(() => {
		const map: Record<string, number> = {};
		for (const it of items) {
			map[it.id] = Number(it.stockQuantity) || 0;
		}
		return map;
	}, [items]);

	// Балансовые показатели
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

		return { totalCount, lowStockCount, overdraftCount, totalRub };
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

			if (selectedCategory === "all") return true;

			const cat = (item.category || "").toLowerCase();
			const name = (item.name || "").toLowerCase();

			if (selectedCategory === "therapy") {
				return (
					cat.includes("терапи") ||
					cat.includes("композит") ||
					cat.includes("эндо") ||
					cat.includes("адгезив") ||
					name.includes("пломб") ||
					name.includes("бонд") ||
					name.includes("filtek") ||
					name.includes("estelite") ||
					name.includes("файл") ||
					name.includes("силлер")
				);
			}

			if (selectedCategory === "surgery") {
				return (
					cat.includes("хирург") ||
					cat.includes("имплант") ||
					name.includes("скальпель") ||
					name.includes("шовн") ||
					name.includes("имплант") ||
					name.includes("губка")
				);
			}

			if (selectedCategory === "orthopedics") {
				return (
					cat.includes("ортопед") ||
					cat.includes("слепоч") ||
					cat.includes("цемент") ||
					name.includes("силикон") ||
					name.includes("корон") ||
					name.includes("цемент")
				);
			}

			if (selectedCategory === "disposables") {
				return (
					cat.includes("расход") ||
					cat.includes("сиз") ||
					name.includes("перчатк") ||
					name.includes("маск") ||
					name.includes("слюноотсос") ||
					name.includes("валик")
				);
			}

			if (selectedCategory === "disinfection") {
				return (
					cat.includes("дезинфек") ||
					cat.includes("стерил") ||
					cat.includes("санпин") ||
					name.includes("крафт") ||
					name.includes("аламинол") ||
					name.includes("спирт")
				);
			}

			return true;
		});
	}, [items, searchQuery, selectedCategory]);

	return (
		<div
			className="warehouse-catalog-view flex-1 flex flex-col min-h-0 overflow-hidden w-full gap-2"
			data-testid="warehouse-catalog-view"
		>
			{/* 1. КОМПАКТНЫЙ КЛИНИЧЕСКИЙ СТРИП (ПОЛЕЗНАЯ ВЫСОТА, СОХРАНЕНИЕ FOLD LINE) */}
			<div className="min-h-[32px] py-1 px-3 bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] rounded-lg flex flex-wrap items-center justify-between gap-2 shrink-0 text-xs">
				<div className="flex items-center gap-3.5 flex-wrap">
					<div className="flex items-center gap-1.5">
						<span className="text-[var(--muted,#64748b)]">Позиций в клинике:</span>
						<span className="font-bold text-[var(--ink,#0f172a)]">{kpis.totalCount}</span>
					</div>

					<div className="flex items-center gap-1.5">
						<span className="text-orange-700 dark:text-orange-400 font-semibold">Заканчивается:</span>
						<span className="font-bold text-orange-600 dark:text-orange-400">{kpis.lowStockCount}</span>
					</div>

					<div className="flex items-center gap-1.5">
						<span className="text-amber-700 dark:text-amber-400 font-semibold">Остаток 0:</span>
						<span className="font-bold text-amber-600 dark:text-amber-400">{kpis.overdraftCount}</span>
						{kpis.overdraftCount > 0 && (
							<span className="text-[10px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300 font-medium">
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
					{kpis.overdraftCount > 0 && onOpenReceiptModal && (
						<button
							type="button"
							onClick={onOpenReceiptModal}
							className="text-[11px] font-semibold text-teal-700 dark:text-teal-300 hover:underline flex items-center gap-1 cursor-pointer"
							data-testid="link-resolve-overdraft"
						>
							<Truck size={12} />
							<span>Поступление партии</span>
						</button>
					)}
				</div>
			</div>

			{/* 2. ИНФОРМАЦИОННЫЙ БАННЕР АВТОСПИСАНИЯ ПО ПРОТОКОЛУ (TIER 1 HOT PATH) */}
			{isBannerVisible && (
				<AutoBomDeductionBanner
					procedureTitle="Препарирование и пломба светового отверждения (Filtek / Estelite)"
					itemsCount={4}
					totalCostRub={549.5}
					hasOverdraft={kpis.overdraftCount > 0}
					overdraftCount={kpis.overdraftCount}
					onOpenDetails={() => setIsDeductionModalOpen(true)}
					onConfirmOneClick={() => {
						setIsBannerVisible(false);
					}}
					onDismiss={() => setIsBannerVisible(false)}
				/>
			)}

			{/* 3. ТУЛБАР СКЛАДА — СТРОГО 1 СТРОКА (32–36PX) ПО ЗАКОНУ ХИКА И APPLE HIG */}
			<div className="min-h-[36px] py-1 px-2.5 bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] rounded-lg flex flex-wrap items-center justify-between gap-2 shrink-0">
				{/* Канонический поисковый контейнер */}
				<div className="dente-search-wrap relative min-w-[180px] max-w-xs flex-1">
					<Search size={14} className="dente-search-icon" />
					<input
						type="text"
						className="dente-search-input"
						placeholder="Поиск по названию, артикулу или серии..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						data-testid="warehouse-catalog-search-input"
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

				{/* Apple HIG 32px Segmented Bar фильтрации по категориям */}
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
					aria-label="Категории материалов"
					data-testid="catalog-category-segmented-bar"
				>
					{WAREHOUSE_CATALOG_CATEGORIES.map((tab) => {
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
									color: isActive ? "var(--brand, #0f766e)" : "var(--muted, #64748b)",
									cursor: "pointer",
									transition: "all 0.15s ease",
									whiteSpace: "nowrap",
								}}
								data-testid={`catalog-category-${tab.id}`}
							>
								{tab.label}
							</button>
						);
					})}
				</div>

				{/* Кнопки быстрых клинических действий */}
				<div className="flex items-center gap-1.5 flex-wrap shrink-0">
					<button
						type="button"
						onClick={() => setIsDeductionModalOpen(true)}
						className="h-8 min-h-[32px] px-2.5 rounded-lg text-xs font-semibold border border-teal-500/40 text-teal-800 dark:text-teal-200 hover:bg-teal-50 dark:hover:bg-teal-950/40 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
						data-testid="btn-open-protocol-deduction"
						title="Списание расходных материалов по клиническому протоколу процедуры"
					>
						<Zap size={14} className="text-teal-600 dark:text-teal-400" />
						<span>Списание по протоколу</span>
					</button>

					{onOpenReceiptModal && (
						<button
							type="button"
							onClick={onOpenReceiptModal}
							className="h-8 min-h-[32px] px-3 rounded-lg text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 active:scale-98 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
							data-testid="btn-add-incoming-batch"
							title="Оприходование поступившей партии материалов"
						>
							<Plus size={14} />
							<span>Поступление партии</span>
						</button>
					)}
				</div>
			</div>

			{/* 4. ТАБЛИЦА МАТЕРИАЛОВ КЛИНИКИ */}
			<div className="flex-1 border border-[var(--line,#e2e8f0)] rounded-lg overflow-hidden flex flex-col bg-[var(--paper,#ffffff)] min-h-[300px]">
				<div className="overflow-x-auto flex-1">
					<table className="w-full text-left text-xs border-collapse" data-testid="warehouse-catalog-table">
						<thead className="bg-[var(--paper-soft,#f8fafc)] text-[var(--muted,#64748b)] border-b border-[var(--line,#e2e8f0)] sticky top-0 z-10 font-semibold">
							<tr>
								<th className="py-2.5 px-3">Материал</th>
								<th className="py-2.5 px-3 hidden sm:table-cell">Категория</th>
								<th className="py-2.5 px-3">Остаток в кабинете</th>
								<th className="py-2.5 px-3 hidden md:table-cell">Минимум</th>
								<th className="py-2.5 px-3 hidden lg:table-cell">Себестоимость</th>
								<th className="py-2.5 px-3">Статус наличия</th>
								<th className="py-2.5 px-3 text-right">Действия</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-[var(--line,#e2e8f0)]">
							{items.length === 0 ? (
								<tr>
									<td colSpan={7} className="py-14 text-center text-[var(--muted,#64748b)]">
										<div className="flex flex-col items-center justify-center max-w-sm mx-auto">
											<div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-600 flex items-center justify-center mb-3 border border-teal-500/20">
												<Package size={24} />
											</div>
											<p className="font-bold text-sm text-[var(--ink,#0f172a)] mb-1">
												Склад пуст — проведите первую приходную накладную
											</p>
											<p className="text-xs text-[var(--muted,#64748b)] mb-4">
												В боевой базе отсутствуют остатки материалов. Оприходуйте накладную от поставщика или начните прием с мягким овердрафтом.
											</p>
											{onOpenReceiptModal && (
												<button
													type="button"
													onClick={onOpenReceiptModal}
													className="h-8 px-3.5 rounded-lg bg-teal-600 text-white font-semibold text-xs hover:bg-teal-700 active:scale-98 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
													data-testid="btn-empty-state-receipt"
												>
													<Plus size={14} />
													<span>+ Оприходовать накладную</span>
												</button>
											)}
										</div>
									</td>
								</tr>
							) : filteredItems.length === 0 ? (
								<tr>
									<td colSpan={7} className="py-12 text-center text-[var(--muted,#64748b)]">
										<Package size={28} className="mx-auto mb-2 opacity-50" />
										<p className="font-medium">Позиции по выбранным критериям не найдены</p>
									</td>
								</tr>
							) : (
								filteredItems.map((item) => {
									const qty = Number(item.stockQuantity) || 0;
									const threshold = Number(item.criticalThreshold) || 5;
									const isOverdraft = qty < 0;
									const isZero = qty === 0;
									const isLow = !isOverdraft && !isZero && qty <= threshold;
									const fefo = item.expirationDate ? getFefoTrafficLight(item.expirationDate) : null;

									return (
										<tr
											key={item.id}
											className="hover:bg-[var(--paper-soft,#f8fafc)] transition-colors group cursor-pointer"
											onClick={() => onSelectItem?.(item)}
											data-testid={`catalog-row-${item.id}`}
										>
											{/* 1. Название материала */}
											<td className="py-2 px-3 font-medium text-[var(--ink,#0f172a)] max-w-md">
												<div className="flex items-center gap-2 flex-wrap">
													<div className="font-semibold leading-snug">
														{item.name}
													</div>
													{item.sku && (
														<span className="text-[10px] text-[var(--muted,#64748b)] font-mono hidden sm:inline">
															{item.sku}
														</span>
													)}
												</div>
												{item.lotNumber && (
													<div className="text-[10px] text-[var(--muted,#64748b)] font-mono">
														Серия: {item.lotNumber}
													</div>
												)}
											</td>

											{/* 2. Категория */}
											<td className="py-2 px-3 text-[var(--muted,#64748b)] hidden sm:table-cell truncate max-w-[120px]">
												{item.category || "Расходные"}
											</td>

											{/* 3. Остаток в кабинете */}
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

											{/* 4. Минимум */}
											<td className="py-2 px-3 hidden md:table-cell text-[var(--muted,#64748b)]">
												{threshold} {item.unit || "шт."}
											</td>

											{/* 5. Себестоимость */}
											<td className="py-2 px-3 hidden lg:table-cell text-[var(--muted,#64748b)] font-medium">
												{money(item.unitCostRub || 0)}
											</td>

											{/* 6. Статус наличия */}
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
														data-testid={`btn-catalog-deduct-${item.id}`}
														title="Списать 1 ед. (мягкий овердрафт разрешен при остатке <= 0)"
													>
														<ArrowDownToLine size={12} className="text-rose-600" />
														<span>Списать</span>
													</button>

													<button
														type="button"
														onClick={() => onReceiveItem?.(item, 1)}
														className="h-7 px-2 rounded-md border border-[var(--line,#cbd5e1)] text-[var(--ink,#0f172a)] hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:border-emerald-300 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
														data-testid={`btn-catalog-receive-${item.id}`}
														title="Оприходовать (+1 ед.)"
													>
														<ArrowUpFromLine size={12} className="text-emerald-600" />
														<span>Приход</span>
													</button>

													<button
														type="button"
														onClick={() => onOpenBatches?.(item)}
														className="h-7 w-7 rounded-md border border-[var(--line,#cbd5e1)] text-[var(--muted,#64748b)] hover:text-teal-600 hover:border-teal-400 flex items-center justify-center transition-colors cursor-pointer"
														data-testid={`btn-catalog-batches-${item.id}`}
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

			{/* 5. МОДАЛКА СПИСАНИЯ ПО ПРОТОКОЛУ */}
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

export default WarehouseCatalogView;
