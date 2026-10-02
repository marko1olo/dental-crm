import {
	AlertTriangle,
	ArrowDownToLine,
	ArrowUpFromLine,
	CheckCircle2,
	Clock,
	FileText,
	Filter,
	Package,
	Search,
	ShieldAlert,
	Sparkles,
	Syringe,
	Trash2,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { money } from "../AppHelpers.js";
import {
	getExpiryTrafficLight,
	type ExpiryTrafficLightInfo,
	type ExpiryTrafficStatus,
} from "./inventory/InventoryStockTable.js";
import type { InventoryItem } from "./inventory/useInventoryLogic.js";

export interface InventoryBatchFefoPanelProps {
	readonly items: readonly InventoryItem[];
	readonly isLoading?: boolean;
	readonly organizationId?: string;
	readonly onDeductItem: (item: InventoryItem, qty: number) => void;
	readonly onReceiveItem: (item: InventoryItem, qty: number) => void;
	readonly onSelectItem: (item: InventoryItem) => void;
	readonly onWriteOffExpired?: (item: InventoryItem) => void;
}

type FefoFilter = "all" | "expired" | "warning_soon" | "good" | "unknown";

/**
 * Панель партионного учета по срокам годности (FEFO) и партий материалов.
 * Обеспечивает сквозной контроль партий, сроков годности и приоритета отпуска
 * по СанПиН 3.3686-21 и Мандатам 8e, 8n, 8v (лимит <= 800 строк).
 */
export const InventoryBatchFefoPanel: React.FC<InventoryBatchFefoPanelProps> = ({
	items,
	isLoading = false,
	onDeductItem,
	onReceiveItem,
	onSelectItem,
	onWriteOffExpired,
}) => {
	const [searchQuery, setSearchQuery] = useState("");
	const [activeFilter, setActiveFilter] = useState<FefoFilter>("all");

	// Расчет метаданных партий и FEFO светофора
	const itemsWithFefo = useMemo(() => {
		return items.map((item) => {
			const fefoInfo = getExpiryTrafficLight(item.expirationDate);
			return {
				item,
				fefoInfo,
				daysLeft: fefoInfo.daysLeft,
				status: fefoInfo.status,
			};
		});
	}, [items]);

	// Сводная статистика по партиям
	const stats = useMemo(() => {
		let expiredCount = 0;
		let warningCount = 0;
		let goodCount = 0;
		let unknownCount = 0;
		let totalBatchedStock = 0;

		for (const entry of itemsWithFefo) {
			const qty = Number(entry.item.stockQuantity) || 0;
			totalBatchedStock += qty;

			if (entry.status === "expired") {
				expiredCount++;
			} else if (entry.status === "warning_soon") {
				warningCount++;
			} else if (entry.status === "good" || entry.status === "normal") {
				goodCount++;
			} else {
				unknownCount++;
			}
		}

		return {
			total: itemsWithFefo.length,
			expiredCount,
			warningCount,
			goodCount,
			unknownCount,
			totalBatchedStock,
		};
	}, [itemsWithFefo]);

	// Фильтрация и FEFO сортировка (сначала просроченные и скоро истекающие)
	const filteredBatches = useMemo(() => {
		const q = searchQuery.trim().toLowerCase();

		return itemsWithFefo
			.filter((entry) => {
				// Фильтр по поисковому запросу
				if (q) {
					const nameMatch = entry.item.name.toLowerCase().includes(q);
					const lotMatch = Boolean(entry.item.lotNumber?.toLowerCase().includes(q));
					const skuMatch = Boolean(entry.item.sku?.toLowerCase().includes(q));
					const categoryMatch = Boolean(entry.item.category?.toLowerCase().includes(q));
					if (!nameMatch && !lotMatch && !skuMatch && !categoryMatch) {
						return false;
					}
				}

				// Фильтр по статусу FEFO
				if (activeFilter === "expired") {
					return entry.status === "expired";
				}
				if (activeFilter === "warning_soon") {
					return entry.status === "warning_soon";
				}
				if (activeFilter === "good") {
					return entry.status === "good" || entry.status === "normal";
				}
				if (activeFilter === "unknown") {
					return entry.status === "unknown";
				}
				return true;
			})
			.sort((a, b) => {
				// Приоритетная сортировка FEFO:
				// 1. Просроченные (daysLeft <= 0)
				// 2. Скоро истекающие (daysLeft ASC)
				// 3. Нормальные (daysLeft ASC)
				// 4. Без срока (в конце)
				if (a.daysLeft === null && b.daysLeft === null) return 0;
				if (a.daysLeft === null) return 1;
				if (b.daysLeft === null) return -1;
				return a.daysLeft - b.daysLeft;
			});
	}, [itemsWithFefo, searchQuery, activeFilter]);

	return (
		<div className="flex flex-col h-full w-full overflow-hidden bg-[var(--paper)] text-[var(--ink)]">
			{/* Верхняя статусная полоса и быстрые фильтры FEFO */}
			<div className="p-3 bg-[var(--paper-soft)] border-b border-[var(--line)] flex flex-wrap items-center justify-between gap-2.5 shrink-0">
				{/* KPI чипы */}
				<div className="flex flex-wrap items-center gap-1.5 text-xs">
					<button
						type="button"
						onClick={() => setActiveFilter("all")}
						className={`px-2 py-1 rounded-md text-xs font-semibold cursor-pointer border transition-colors inline-flex items-center gap-1 ${
							activeFilter === "all"
								? "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] shadow-xs"
								: "bg-transparent text-[var(--muted)] border-transparent hover:text-[var(--ink)]"
						}`}
						data-testid="fefo-filter-all"
					>
						<Package size={13} className="text-teal-600 dark:text-teal-400 shrink-0" />
						<span>Все партии:</span>
						<strong className="font-mono text-[var(--ink)]">{stats.total}</strong>
					</button>

					<button
						type="button"
						onClick={() => setActiveFilter("expired")}
						className={`px-2 py-1 rounded-md text-xs font-semibold cursor-pointer border transition-colors inline-flex items-center gap-1 ${
							activeFilter === "expired"
								? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/40 shadow-xs"
								: "bg-transparent text-[var(--muted)] border-transparent hover:text-rose-600"
						}`}
						data-testid="fefo-filter-expired"
					>
						<ShieldAlert size={13} className="text-rose-600 dark:text-rose-400 shrink-0" />
						<span>Истёк срок годности:</span>
						<strong className="font-mono text-rose-600 dark:text-rose-400">{stats.expiredCount}</strong>
					</button>

					<button
						type="button"
						onClick={() => setActiveFilter("warning_soon")}
						className={`px-2 py-1 rounded-md text-xs font-semibold cursor-pointer border transition-colors inline-flex items-center gap-1 ${
							activeFilter === "warning_soon"
								? "bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/40 shadow-xs"
								: "bg-transparent text-[var(--muted)] border-transparent hover:text-amber-600"
						}`}
						data-testid="fefo-filter-warning"
					>
						<Clock size={13} className="text-amber-600 dark:text-amber-400 shrink-0" />
						<span>FEFO отпуск (&lt; 30 дн):</span>
						<strong className="font-mono text-amber-600 dark:text-amber-400">{stats.warningCount}</strong>
					</button>

					<button
						type="button"
						onClick={() => setActiveFilter("good")}
						className={`px-2 py-1 rounded-md text-xs font-semibold cursor-pointer border transition-colors inline-flex items-center gap-1 ${
							activeFilter === "good"
								? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-500/40 shadow-xs"
								: "bg-transparent text-[var(--muted)] border-transparent hover:text-emerald-600"
						}`}
						data-testid="fefo-filter-good"
					>
						<CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
						<span>Норма:</span>
						<strong className="font-mono text-emerald-600 dark:text-emerald-400">{stats.goodCount}</strong>
					</button>
				</div>

				{/* Поле поиска по партии/материалу */}
				<div className="relative flex items-center min-w-[200px] max-w-xs shrink-0">
					<Search size={13} className="absolute left-2.5 text-[var(--muted)] pointer-events-none" />
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder="Партия, артикул, материал..."
						className="w-full h-8 pl-8 pr-3 text-xs rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] outline-none focus:border-teal-500 transition-colors"
						data-testid="fefo-search-input"
					/>
				</div>
			</div>

			{/* Основной список / таблица партий */}
			<div className="flex-1 overflow-y-auto p-3">
				{isLoading ? (
					<div className="flex items-center justify-center h-48 text-xs text-[var(--muted)] gap-2">
						<Clock className="animate-spin text-teal-600" size={18} />
						<span>Загрузка данных партионного учета FEFO...</span>
					</div>
				) : filteredBatches.length === 0 ? (
					<div className="flex flex-col items-center justify-center h-64 text-center text-xs text-[var(--muted)] gap-2">
						<Package size={32} className="text-[var(--muted)] opacity-50" />
						<p className="font-medium text-[var(--ink)]">Партии материалов не найдены</p>
						<p className="text-[11px]">Попробуйте изменить поисковый запрос или сбросить фильтры FEFO</p>
					</div>
				) : (
					<div className="border border-[var(--line)] rounded-xl overflow-hidden shadow-xs bg-[var(--paper)]">
						<table className="w-full text-left text-xs border-collapse">
							<thead>
								<tr className="bg-[var(--paper-soft)] border-b border-[var(--line)] text-[var(--muted)] font-semibold">
									<th className="py-2.5 px-3">Материал</th>
									<th className="py-2.5 px-3">Номер партии (Lot)</th>
									<th className="py-2.5 px-3">Срок годности</th>
									<th className="py-2.5 px-3">Статус FEFO</th>
									<th className="py-2.5 px-3 text-right">Текущий остаток</th>
									<th className="py-2.5 px-3 text-right">Цена за ед.</th>
									<th className="py-2.5 px-3 text-center">Операции FEFO</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-[var(--line)]">
								{filteredBatches.map(({ item, fefoInfo, daysLeft, status }) => {
									const qty = Number(item.stockQuantity) || 0;
									const isLow = qty <= (Number(item.criticalThreshold) || 0);
									const isOverdraft = qty <= 0;

									return (
										<tr
											key={item.id}
											className="hover:bg-[var(--paper-soft)] transition-colors group cursor-pointer"
											onClick={() => onSelectItem(item)}
											data-testid={`fefo-row-${item.id}`}
										>
											{/* Наименование и артикул */}
											<td className="py-2.5 px-3 font-medium text-[var(--ink)]">
												<div className="flex flex-col">
													<span className="font-semibold text-xs text-[var(--ink)]">
														{item.name}
													</span>
													{item.sku && (
														<span className="text-[10px] text-[var(--muted)] font-mono">
															Арт: {item.sku}
														</span>
													)}
												</div>
											</td>

											{/* Партия */}
											<td className="py-2.5 px-3 font-mono text-[var(--ink)]">
												{item.lotNumber ? (
													<span className="inline-flex items-center px-1.5 py-0.5 rounded bg-[var(--paper-soft)] border border-[var(--line)] text-[11px] font-bold">
														{item.lotNumber}
													</span>
												) : (
													<span className="text-[var(--muted)] text-[11px]">—</span>
												)}
											</td>

											{/* Срок годности */}
											<td className="py-2.5 px-3 font-mono text-[var(--ink)] whitespace-nowrap">
												{item.expirationDate ? (
													<span className="text-[11px]">
														{item.expirationDate}
													</span>
												) : (
													<span className="text-[var(--muted)] text-[11px]">Не указан</span>
												)}
											</td>

											{/* Светофор FEFO */}
											<td className="py-2.5 px-3">
												<span
													className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${fefoInfo.className}`}
												>
													{status === "expired" && <ShieldAlert size={12} className="shrink-0" />}
													{status === "warning_soon" && <Clock size={12} className="shrink-0" />}
													{status === "good" && <CheckCircle2 size={12} className="shrink-0" />}
													<span>{fefoInfo.labelRu}</span>
												</span>
											</td>

											{/* Остаток */}
											<td className="py-2.5 px-3 text-right font-mono">
												<div className="flex flex-col items-end">
													<span
														className={`font-bold text-xs ${
															isOverdraft
																? "text-rose-600 dark:text-rose-400"
																: isLow
																	? "text-amber-600 dark:text-amber-400"
																	: "text-[var(--ink)]"
														}`}
													>
														{qty} {item.unit || "шт."}
													</span>
													{isOverdraft && (
														<span
															className="text-[10px] text-rose-500 font-sans font-medium"
															data-testid={`fefo-overdraft-badge-${item.id}`}
														>
															Овердрафт
														</span>
													)}
												</div>
											</td>

											{/* Цена */}
											<td className="py-2.5 px-3 text-right font-mono text-[var(--muted)] whitespace-nowrap">
												{item.unitCostRub ? money(Number(item.unitCostRub) * 100) : "—"}
											</td>

											{/* Действия FEFO */}
											<td
												className="py-2.5 px-3 text-center"
												onClick={(e) => e.stopPropagation()}
											>
												<div className="flex items-center justify-center gap-1.5">
													{status === "expired" ? (
														<button
															type="button"
															onClick={() => {
																if (onWriteOffExpired) {
																	onWriteOffExpired(item);
																} else {
																	onDeductItem(item, 1);
																}
															}}
															className="h-7 px-2 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30 text-[11px] font-bold cursor-pointer inline-flex items-center gap-1 transition-colors"
															title="Списать просроченный материал (утилизация)"
															data-testid={`btn-fefo-dispose-${item.id}`}
														>
															<Trash2 size={12} className="shrink-0" />
															<span>Утилизация</span>
														</button>
													) : (
														<>
															<button
																type="button"
																onClick={() => onDeductItem(item, 1)}
																className="h-7 px-2 rounded bg-[var(--paper-soft)] hover:bg-[var(--line)] text-[var(--ink)] border border-[var(--line)] text-[11px] font-semibold cursor-pointer inline-flex items-center gap-1 transition-colors"
																title="Списать материал по первоочередному FEFO отпуску"
																data-testid={`btn-fefo-deduct-${item.id}`}
															>
																<ArrowUpFromLine size={12} className="text-amber-600 dark:text-amber-400 shrink-0" />
																<span>Отпуск FEFO</span>
															</button>

															<button
																type="button"
																onClick={() => onReceiveItem(item, 1)}
																className="h-7 px-2 rounded bg-[var(--paper-soft)] hover:bg-[var(--line)] text-[var(--ink)] border border-[var(--line)] text-[11px] font-semibold cursor-pointer inline-flex items-center gap-1 transition-colors"
																title="Оприходовать партию материала на склад"
																data-testid={`btn-fefo-receive-${item.id}`}
															>
																<ArrowDownToLine size={12} className="text-teal-600 dark:text-teal-400 shrink-0" />
																<span>+ Приход</span>
															</button>
														</>
													)}
												</div>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				)}
			</div>
		</div>
	);
};

export default InventoryBatchFefoPanel;
