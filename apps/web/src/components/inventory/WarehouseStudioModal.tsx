/**
 * WarehouseStudioModal.tsx — Каноническая модалка-студия склада и расходных материалов (SSOT).
 * Мандаты: 8e (Автономия врача, 0 disabled кнопок), 8n (Соло-практика, пакетное списание, мягкий овердрафт),
 * 8am (Ровно 1 Primary CTA кнопка #0d9488), 8ze/Apple HIG (Drag Handle 36x5px, Touch Target >= 44x44px),
 * 8b (Sweet Spot: строго 380–480 строк), 8wy (Целочисленные копейки amountKopecks).
 */

import React, { useState, useMemo, useCallback } from "react";
import {
	Package,
	PlusCircle,
	MinusCircle,
	AlertTriangle,
	CheckCircle2,
	X,
	Truck,
	Sparkles,
	Filter,
	Layers,
	Search,
	RefreshCw,
} from "lucide-react";
import {
	WAREHOUSE_CATEGORIES,
	INITIAL_WAREHOUSE_STOCK,
	PROCEDURE_TECH_MAPS,
	type WarehouseCategoryKey,
	type WarehouseStockItem,
	computeWarehouseKpis,
	getStockStatusBadge,
	applyProcedureBatchDeduction,
	applyExpressIncomingInvoice,
	quickOneClickInventoryAudit,
	formatKopecksToRubles,
} from "./warehouseCatalogData.js";
import "./warehouse.css";

export interface WarehouseStudioModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly organizationId?: string;
	readonly onStockUpdated?: (items: readonly WarehouseStockItem[]) => void;
}

export type WarehouseStudioTab = "stock" | "deduct" | "inbound";

export const WarehouseStudioModal: React.FC<WarehouseStudioModalProps> = ({
	isOpen,
	onClose,
	organizationId = "org-main-01",
	onStockUpdated,
}) => {
	const [stockItems, setStockItems] = useState<WarehouseStockItem[]>(() =>
		INITIAL_WAREHOUSE_STOCK.map((item) => ({ ...item })),
	);
	const [activeTab, setActiveTab] = useState<WarehouseStudioTab>("stock");
	const [selectedCategory, setSelectedCategory] = useState<WarehouseCategoryKey | "all">("all");
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [selectedTechMapId, setSelectedTechMapId] = useState<string>("proc-filling-light");
	const [procMultiplier, setProcMultiplier] = useState<number>(1);
	const [activeSupplier, setActiveSupplier] = useState<string>("Дентал-Маркет");
	const [inboundQuantities, setInboundQuantities] = useState<Record<string, number>>({
		"mat-art-01": 20,
		"mat-needle-01": 50,
		"mat-glove-01": 10,
	});
	const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

	const kpis = useMemo(() => computeWarehouseKpis(stockItems), [stockItems]);

	const filteredItems = useMemo(() => {
		return stockItems.filter((item) => {
			const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
			const matchesQuery = !searchQuery || item.nameRu.toLowerCase().includes(searchQuery.toLowerCase()) || item.sku.toLowerCase().includes(searchQuery.toLowerCase());
			return matchesCategory && matchesQuery;
		});
	}, [stockItems, selectedCategory, searchQuery]);

	const selectedTechMap = useMemo(() => {
		return PROCEDURE_TECH_MAPS.find((tm) => tm.id === selectedTechMapId) ?? PROCEDURE_TECH_MAPS[0];
	}, [selectedTechMapId]);

	const handleCommitBatchDeduction = useCallback(() => {
		const { updatedItems, deductions, totalCostKopecks } = applyProcedureBatchDeduction(
			stockItems,
			selectedTechMapId,
			procMultiplier,
		);
		setStockItems(updatedItems);
		onStockUpdated?.(updatedItems);
		const overdrafts = deductions.filter((d) => d.isOverdraft);
		const msg = `Списано расходников на смену: ${deductions.length} поз. на ${formatKopecksToRubles(totalCostKopecks)}` +
			(overdrafts.length > 0 ? ` (мягкий овердрафт: ${overdrafts.length} поз.)` : "");
		setStatusFeedback(msg);
	}, [stockItems, selectedTechMapId, procMultiplier, onStockUpdated]);

	const handleCommitIncomingInvoice = useCallback(() => {
		const lines = Object.entries(inboundQuantities).map(([materialId, quantity]) => ({ materialId, quantity }));
		const { updatedItems, results, totalIncomingKopecks } = applyExpressIncomingInvoice(stockItems, lines);
		setStockItems(updatedItems);
		onStockUpdated?.(updatedItems);
		const totalCleared = results.reduce((acc, r) => acc + r.clearedOverdraft, 0);
		const msg = `Оприходована накладная поставщика ${activeSupplier} на ${formatKopecksToRubles(totalIncomingKopecks)}` +
			(totalCleared > 0 ? ` (погашен овердрафт: ${totalCleared} ед.)` : "");
		setStatusFeedback(msg);
	}, [stockItems, inboundQuantities, activeSupplier, onStockUpdated]);

	const handleQuickAudit = useCallback(() => {
		const { updatedItems, clearedDeficitCount } = quickOneClickInventoryAudit(stockItems);
		setStockItems(updatedItems);
		onStockUpdated?.(updatedItems);
		setStatusFeedback(`Экспресс-инвентаризация завершена: нормализовано ${clearedDeficitCount} дефицитных позиций.`);
	}, [stockItems, onStockUpdated]);

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-center warehouse-modal-backdrop p-0 sm:p-4 overflow-x-clip" role="dialog" aria-modal="true">
			<div className="warehouse-sheet-container w-full sm:max-w-4xl max-h-[92vh] sm:max-h-[88vh] rounded-t-[24px] sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-[var(--line)]" data-testid="warehouse-studio-modal">
				{/* Apple HIG Drag Handle для мобильных экранов 390x844 */}
				<div className="warehouse-drag-handle sm:hidden shrink-0 cursor-grab" data-testid="mobile-drag-handle" aria-label="Сдвинуть для закрытия" />

				{/* Шапка модалки */}
				<header className="px-4 py-3 sm:px-6 sm:py-4 border-b border-[var(--line)] flex items-center justify-between shrink-0">
					<div className="flex items-center gap-3 min-w-0">
						<div className="w-10 h-10 rounded-xl bg-teal-500/15 text-[#0d9488] flex items-center justify-center shrink-0">
							<Package className="w-5 h-5" />
						</div>
						<div className="min-w-0">
							<h2 className="text-sm sm:text-lg font-bold text-[var(--ink)] leading-tight">
								<span className="hidden sm:inline">Склад и пакетное списание расходных материалов</span>
								<span className="sm:hidden">Склад и расходные материалы</span>
							</h2>
							<p className="text-xs text-[var(--ink)]/60 leading-tight">
								<span className="hidden sm:inline">Организация: {organizationId} • Учет в копейках • Мягкий овердрафт без блокировок</span>
								<span className="sm:hidden">Организация: {organizationId} • Учет в копейках</span>
							</p>
						</div>
					</div>
					<button type="button" onClick={onClose} className="warehouse-touch-target p-2 rounded-lg text-[var(--ink)]/70 hover:text-[var(--ink)] hover:bg-[var(--line)]/10 transition-colors" aria-label="Закрыть окно склада">
						<X className="w-5 h-5" />
					</button>
				</header>

				{/* Сводные KPI склада */}
				<section className="px-4 py-2 sm:px-6 sm:py-3 bg-[var(--line)]/5 border-b border-[var(--line)] grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs shrink-0">
					<div className="p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)]/60">
						<span className="text-[var(--ink)]/60 block">Всего позиций</span>
						<span className="text-sm font-bold text-[var(--ink)]">{kpis.totalPositions}</span>
					</div>
					<div className="p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)]/60">
						<span className="text-[var(--ink)]/60 block">В дефиците</span>
						<span className={`text-sm font-bold ${kpis.deficitCount > 0 ? "text-rose-600" : "text-emerald-600"}`}>{kpis.deficitCount}</span>
					</div>
					<div className="p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)]/60">
						<span className="text-[var(--ink)]/60 block">Требуют заказа</span>
						<span className={`text-sm font-bold ${kpis.reorderCount > 0 ? "text-amber-600" : "text-emerald-600"}`}>{kpis.reorderCount}</span>
					</div>
					<div className="p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)]/60">
						<span className="text-[var(--ink)]/60 block">Стоимость запасов</span>
						<span className="text-sm font-bold text-[#0d9488]">{formatKopecksToRubles(kpis.totalValuationKopecks)}</span>
					</div>
				</section>

				{/* Панель вкладок и быстрых действий */}
				<div className="px-4 py-2 sm:px-6 sm:py-2.5 border-b border-[var(--line)] flex flex-wrap items-center justify-between gap-2 shrink-0">
					<div className="inline-flex p-1 rounded-xl bg-[var(--line)]/10 text-xs">
						<button type="button" onClick={() => setActiveTab("stock")} className={`px-3 py-1.5 rounded-lg transition-all warehouse-touch-target min-h-[36px] ${activeTab === "stock" ? "warehouse-tab-active" : "text-[var(--ink)]/70 hover:text-[var(--ink)]"}`}>
							Остатки на складе
						</button>
						<button type="button" onClick={() => setActiveTab("deduct")} className={`px-3 py-1.5 rounded-lg transition-all warehouse-touch-target min-h-[36px] ${activeTab === "deduct" ? "warehouse-tab-active" : "text-[var(--ink)]/70 hover:text-[var(--ink)]"}`}>
							Пакетное списание смены
						</button>
						<button type="button" onClick={() => setActiveTab("inbound")} className={`px-3 py-1.5 rounded-lg transition-all warehouse-touch-target min-h-[36px] ${activeTab === "inbound" ? "warehouse-tab-active" : "text-[var(--ink)]/70 hover:text-[var(--ink)]"}`}>
							Приходная накладная
						</button>
					</div>

					<div className="flex items-center gap-2">
						<button type="button" data-testid="btn-batch-deduct" onClick={() => setActiveTab("deduct")} className="warehouse-secondary-btn px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 warehouse-touch-target min-h-[36px]">
							<MinusCircle className="w-3.5 h-3.5 text-amber-500" />
							<span>Пакетный расход</span>
						</button>
						<button type="button" data-testid="btn-express-inbound" onClick={() => setActiveTab("inbound")} className="warehouse-secondary-btn px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 warehouse-touch-target min-h-[36px]">
							<Truck className="w-3.5 h-3.5 text-blue-500" />
							<span>Приход</span>
						</button>
						<button type="button" data-testid="btn-quick-inventory-audit" onClick={handleQuickAudit} className="warehouse-secondary-btn px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 warehouse-touch-target min-h-[36px]">
							<RefreshCw className="w-3.5 h-3.5 text-[#0d9488]" />
							<span className="hidden sm:inline">Инвентаризация в 1 клик</span>
							<span className="sm:hidden">Сверка</span>
						</button>
					</div>
				</div>

				{/* Обратная связь о совершенной операции */}
				{statusFeedback && (
					<div className="mx-4 sm:mx-6 mt-2 p-2.5 rounded-lg bg-teal-500/10 border border-teal-500/20 text-xs text-[#0d9488] flex items-center justify-between shrink-0">
						<div className="flex items-center gap-2">
							<CheckCircle2 className="w-4 h-4 shrink-0" />
							<span>{statusFeedback}</span>
						</div>
						<button type="button" onClick={() => setStatusFeedback(null)} className="text-[var(--ink)]/50 hover:text-[var(--ink)] ml-2 text-xs">
							Закрыть
						</button>
					</div>
				)}

				{/* Основное содержимое вкладок */}
				<main className="p-4 sm:p-6 overflow-y-auto grow space-y-4">
					{/* Вкладка 1: Остатки на складе */}
					{activeTab === "stock" && (
						<div className="space-y-3">
							<div className="flex flex-col sm:flex-row gap-2 justify-between items-stretch sm:items-center">
								<div className="relative grow sm:max-w-xs">
									<Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink)]/40 pointer-events-none" />
									<input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Поиск по артикулу или названию..." className="w-full pl-9 pr-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs text-[var(--ink)] placeholder:text-[var(--ink)]/40 min-h-[44px]" />
								</div>

								{/* Категории фильтра */}
								<div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs shrink-0 max-w-full">
									<button type="button" onClick={() => setSelectedCategory("all")} className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded-lg border warehouse-touch-target min-h-[40px] ${selectedCategory === "all" ? "bg-[#0d9488]/15 border-[#0d9488] text-[#0d9488] font-semibold" : "border-[var(--line)] text-[var(--ink)]/70 hover:bg-[var(--line)]/10"}`}>
										Все ({stockItems.length})
									</button>
									{WAREHOUSE_CATEGORIES.map((cat) => (
										<button key={cat.id} type="button" onClick={() => setSelectedCategory(cat.id)} className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded-lg border warehouse-touch-target min-h-[40px] ${selectedCategory === cat.id ? "bg-[#0d9488]/15 border-[#0d9488] text-[#0d9488] font-semibold" : "border-[var(--line)] text-[var(--ink)]/70 hover:bg-[var(--line)]/10"}`}>
											{cat.nameRu}
										</button>
									))}
								</div>
							</div>

							{/* Таблица остатков */}
							<div className="border border-[var(--line)] rounded-xl overflow-hidden bg-[var(--paper)]">
								<div className="overflow-x-auto max-w-full">
									<table className="w-full text-left text-xs border-collapse">
										<thead>
											<tr className="border-b border-[var(--line)] bg-[var(--line)]/5 text-[var(--ink)]/60 font-medium">
												<th className="p-3">Материал и артикул</th>
												<th className="p-3">Категория</th>
												<th className="p-3 text-right">Текущий остаток</th>
												<th className="p-3 text-right">Мин. норма</th>
												<th className="p-3 text-right">Цена за ед.</th>
												<th className="p-3">Статус</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-[var(--line)]">
											{filteredItems.map((item) => {
												const badge = getStockStatusBadge(item.currentStock, item.minStock);
												return (
													<tr key={item.id} className="hover:bg-[var(--line)]/5 transition-colors">
														<td className="p-3">
															<span className="font-medium text-[var(--ink)] block">{item.nameRu}</span>
															<span className="text-[10px] text-[var(--ink)]/50">{item.sku} • {item.supplierName}</span>
														</td>
														<td className="p-3 text-[var(--ink)]/70">{WAREHOUSE_CATEGORIES.find((c) => c.id === item.category)?.nameRu ?? item.category}</td>
														<td className="p-3 text-right font-semibold">
															<span className={item.currentStock < 0 ? "text-rose-600" : "text-[var(--ink)]"}>
																{item.currentStock} {item.unit}
															</span>
														</td>
														<td className="p-3 text-right text-[var(--ink)]/60">{item.minStock} {item.unit}</td>
														<td className="p-3 text-right text-[var(--ink)]/80 font-mono">{formatKopecksToRubles(item.unitCostKopecks)}</td>
														<td className="p-3">
															<span className={`inline-block px-2 py-0.5 rounded-full text-[11px] border ${badge.colorClass}`}>{badge.badgeLabel}</span>
														</td>
													</tr>
												);
											})}
										</tbody>
									</table>
								</div>
							</div>
						</div>
					)}

					{/* Вкладка 2: Пакетное списание смены */}
					{activeTab === "deduct" && (
						<div className="space-y-4">
							<div className="p-4 rounded-xl bg-[var(--line)]/5 border border-[var(--line)] space-y-3">
								<h3 className="text-sm font-semibold text-[var(--ink)] flex items-center gap-2">
									<Sparkles className="w-4 h-4 text-[#0d9488]" />
									Автоматическое списание по техкартам процедур (Мандат 8n)
								</h3>
								<p className="text-xs text-[var(--ink)]/70">
									Списание расходников крупным пакетом за рабочую смену врача в 1 клик. Если остаток нулевой — применяется мягкий овердрафт без сбоев.
								</p>

								<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
									<div>
										<label className="text-xs font-medium text-[var(--ink)] block mb-1">Выбор процедуры / техкарты:</label>
										<select value={selectedTechMapId} onChange={(e) => setSelectedTechMapId(e.target.value)} className="w-full p-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs text-[var(--ink)] min-h-[44px]">
											{PROCEDURE_TECH_MAPS.map((tm) => (
												<option key={tm.id} value={tm.id}>{tm.titleRu} ({tm.code})</option>
											))}
										</select>
									</div>

									<div>
										<label className="text-xs font-medium text-[var(--ink)] block mb-1">Количество приёмов за смену:</label>
										<div className="flex items-center gap-2">
											<input type="number" min={1} max={30} value={procMultiplier} onChange={(e) => setProcMultiplier(Math.max(1, parseInt(e.target.value, 10) || 1))} className="w-24 p-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs text-[var(--ink)] min-h-[44px] text-center font-bold" />
											<span className="text-xs text-[var(--ink)]/60">пациентов по данной процедуре</span>
										</div>
									</div>
								</div>
							</div>

							{/* Предварительный расчет материалов к списанию */}
							<div className="border border-[var(--line)] rounded-xl p-4 bg-[var(--paper)] space-y-2">
								<h4 className="text-xs font-bold text-[var(--ink)] uppercase tracking-wider">
									Расходные материалы по протоколу: {selectedTechMap.titleRu}
								</h4>
								<div className="divide-y divide-[var(--line)]">
									{selectedTechMap.items.map((mat) => {
										const currentItem = stockItems.find((i) => i.id === mat.materialId);
										const totalDeduct = mat.quantity * procMultiplier;
										const nextStock = (currentItem?.currentStock ?? 0) - totalDeduct;
										return (
											<div key={mat.materialId} className="py-2 flex items-center justify-between text-xs">
												<div>
													<span className="font-medium text-[var(--ink)]">{mat.nameRu}</span>
													<span className="text-[11px] text-[var(--ink)]/50 block">Норма на приём: {mat.quantity} {mat.unit}</span>
												</div>
												<div className="text-right">
													<span className="font-bold text-[var(--ink)]">Списать: {totalDeduct} {mat.unit}</span>
													<span className={`text-[11px] block ${nextStock < 0 ? "text-rose-500 font-semibold" : "text-[var(--ink)]/60"}`}>
														Остаток после: {nextStock} {mat.unit} {nextStock < 0 ? "(овердрафт)" : ""}
													</span>
												</div>
											</div>
										);
									})}
								</div>
							</div>
						</div>
					)}

					{/* Вкладка 3: Приходная накладная */}
					{activeTab === "inbound" && (
						<div className="space-y-4">
							<div className="p-4 rounded-xl bg-[var(--line)]/5 border border-[var(--line)] space-y-3">
								<h3 className="text-sm font-semibold text-[var(--ink)] flex items-center gap-2">
									<Truck className="w-4 h-4 text-blue-500" />
									Экспресс-оприходование накладной поставщика
								</h3>
								<p className="text-xs text-[var(--ink)]/70">Ввод фактической поставки материалов. Автоматически закрывает накопленный отрицательный овердрафт склада.</p>
								<div>
									<label className="text-xs font-medium text-[var(--ink)] block mb-1">Поставщик стоматологических материалов:</label>
									<select value={activeSupplier} onChange={(e) => setActiveSupplier(e.target.value)} className="w-full sm:max-w-xs p-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs text-[var(--ink)] min-h-[44px]">
										<option value="Дентал-Маркет">Дентал-Маркет (Анестезия, слепки)</option>
										<option value="СтомТорг Комплект">СтомТорг Комплект (Композиты, СИЗ)</option>
										<option value="МедСнаб Трейд">МедСнаб Трейд (Хирургия, иглы)</option>
									</select>
								</div>
							</div>

							<div className="border border-[var(--line)] rounded-xl p-4 bg-[var(--paper)] space-y-3">
								<h4 className="text-xs font-bold text-[var(--ink)] uppercase tracking-wider">Позиции накладной поставщика:</h4>
								<div className="space-y-2">
									{stockItems.slice(0, 5).map((item) => {
										const currentQty = inboundQuantities[item.id] ?? 0;
										return (
											<div key={item.id} className="p-2 rounded-lg border border-[var(--line)] flex items-center justify-between gap-3 text-xs">
												<div className="min-w-0">
													<span className="font-medium text-[var(--ink)] truncate block">{item.nameRu}</span>
													<span className="text-[10px] text-[var(--ink)]/50">Текущий остаток: {item.currentStock} {item.unit} • {formatKopecksToRubles(item.unitCostKopecks)}/ед.</span>
												</div>
												<div className="flex items-center gap-2 shrink-0">
													<input type="number" min={0} value={currentQty} onChange={(e) => {
														const val = Math.max(0, parseInt(e.target.value, 10) || 0);
														setInboundQuantities((prev) => ({ ...prev, [item.id]: val }));
													}} className="w-20 p-2 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs text-[var(--ink)] text-center font-semibold min-h-[40px]" />
													<span className="text-xs text-[var(--ink)]/60 w-10">{item.unit}</span>
												</div>
											</div>
										);
									})}
								</div>
							</div>
						</div>
					)}
				</main>

				{/* Подвал с ровно одной Primary CTA кнопкой (Мандат 8am: #0d9488) и 0 disabled кнопками (Мандат 8e) */}
				<footer className="p-4 sm:px-6 sm:py-3 border-t border-[var(--line)] bg-[var(--paper)] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2 shrink-0">
					<button type="button" onClick={onClose} className="warehouse-secondary-btn px-4 py-2.5 rounded-xl text-xs warehouse-touch-target min-h-[44px]">
						Закрыть
					</button>

					{activeTab === "deduct" && (
						<button type="button" data-testid="btn-primary-commit-warehouse" onClick={handleCommitBatchDeduction} className="warehouse-primary-btn px-5 py-2.5 rounded-xl text-xs bg-[#0d9488] text-white flex items-center justify-center gap-2 warehouse-touch-target min-h-[44px] shadow-sm">
							<CheckCircle2 className="w-4 h-4" />
							<span>✓ Списать расход смены</span>
						</button>
					)}

					{activeTab === "inbound" && (
						<button type="button" data-testid="btn-primary-commit-warehouse" onClick={handleCommitIncomingInvoice} className="warehouse-primary-btn px-5 py-2.5 rounded-xl text-xs bg-[#0d9488] text-white flex items-center justify-center gap-2 warehouse-touch-target min-h-[44px] shadow-sm">
							<CheckCircle2 className="w-4 h-4" />
							<span>✓ Оприходовать поставку</span>
						</button>
					)}

					{activeTab === "stock" && (
						<button type="button" data-testid="btn-primary-commit-warehouse" onClick={() => setActiveTab("deduct")} className="warehouse-primary-btn px-5 py-2.5 rounded-xl text-xs bg-[#0d9488] text-white flex items-center justify-center gap-2 warehouse-touch-target min-h-[44px] shadow-sm">
							<CheckCircle2 className="w-4 h-4" />
							<span>✓ Сохранить складские движения</span>
						</button>
					)}
				</footer>
			</div>
		</div>
	);
};

export default WarehouseStudioModal;
