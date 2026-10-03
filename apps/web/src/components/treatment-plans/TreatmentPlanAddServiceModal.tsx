/**
 * TreatmentPlanAddServiceModal.tsx — модальное окно добавления услуги из прейскуранта клиники / номенклатуры 804н
 * с выбором зуба по стандарту FDI ISO 3950, количества, скидки врача и назначения в этап плана.
 */

import React, { useState, useMemo, useEffect } from "react";
import { Check, FolderPlus, Plus, Search, Tag, X } from "lucide-react";
import {
	type TreatmentPlanItem,
	type TreatmentPlanStage,
	romanizeStageNumber,
} from "./types";
import type { CatalogServiceLookupItem } from "./treatmentPlanPricingEngine";
import { ORDER_804N_DICTIONARY } from "./treatmentPlanNomenclature804n";
import { showToast } from "../GlobalToast";

export interface TreatmentPlanAddServiceModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly stages: readonly TreatmentPlanStage[];
	readonly targetStage: TreatmentPlanStage | null;
	readonly catalog: readonly CatalogServiceLookupItem[] | undefined;
	readonly onAddService: (targetStageNumber: number, item: Partial<TreatmentPlanItem>) => void;
}

export const TreatmentPlanAddServiceModal: React.FC<TreatmentPlanAddServiceModalProps> = ({
	isOpen,
	onClose,
	stages,
	targetStage,
	catalog,
	onAddService,
}) => {
	const [serviceSearchQuery, setServiceSearchQuery] = useState("");
	const [serviceCategoryFilter, setServiceCategoryFilter] = useState("all");
	const [selectedCatalogItem, setSelectedCatalogItem] = useState<CatalogServiceLookupItem | null>(null);
	const [selectedToothForService, setSelectedToothForService] = useState<number | null>(null);
	const [serviceQuantity, setServiceQuantity] = useState(1);
	const [serviceDiscountPercent, setServiceDiscountPercent] = useState(0);
	const [serviceTargetStageNumber, setServiceTargetStageNumber] = useState<number>(
		targetStage?.stageNumber ?? stages[0]?.stageNumber ?? 1,
	);

	useEffect(() => {
		if (targetStage) {
			setServiceTargetStageNumber(targetStage.stageNumber);
		} else if (stages.length > 0 && !stages.some((s) => s.stageNumber === serviceTargetStageNumber)) {
			setServiceTargetStageNumber(stages[0]!.stageNumber);
		}
	}, [targetStage, stages]);

	// Эффективный каталог услуг: прейскурант клиники из базы или номенклатура 804н
	const effectiveCatalog = useMemo<CatalogServiceLookupItem[]>(() => {
		if (Array.isArray(catalog) && catalog.length > 0) {
			return catalog;
		}
		return Object.values(ORDER_804N_DICTIONARY).map((proc) => ({
			id: proc.code,
			title: proc.title,
			category: proc.category,
			basePriceRub: proc.defaultPriceRub,
			code: proc.code,
			order804nCode: proc.code,
			active: true,
		}));
	}, [catalog]);

	const availableCategories = useMemo(() => {
		const set = new Set<string>();
		for (const it of effectiveCatalog) {
			if (it.category) set.add(it.category);
		}
		return Array.from(set).sort();
	}, [effectiveCatalog]);

	const filteredCatalogServices = useMemo(() => {
		const q = serviceSearchQuery.trim().toLowerCase();
		return effectiveCatalog.filter((item) => {
			if (serviceCategoryFilter !== "all") {
				const cat = (item.category || "").toLowerCase();
				if (!cat.includes(serviceCategoryFilter.toLowerCase())) return false;
			}
			if (!q) return true;
			const t = (item.title || "").toLowerCase();
			const c = (item.code || item.order804nCode || "").toLowerCase();
			const cat = (item.category || "").toLowerCase();
			return t.includes(q) || c.includes(q) || cat.includes(q);
		});
	}, [effectiveCatalog, serviceSearchQuery, serviceCategoryFilter]);

	const handleConfirmAddService = () => {
		if (!selectedCatalogItem) {
			showToast("Выберите услугу из каталога", "warning");
			return;
		}
		const basePrice = selectedCatalogItem.basePriceRub || 0;
		const qty = Math.max(1, serviceQuantity);
		const discPct = Math.max(0, Math.min(100, serviceDiscountPercent));
		const grossRub = basePrice * qty;
		const discountRub = Math.round((grossRub * discPct) / 100);

		onAddService(serviceTargetStageNumber, {
			code804n: selectedCatalogItem.order804nCode || selectedCatalogItem.code || selectedCatalogItem.id,
			name: selectedCatalogItem.title,
			category: selectedCatalogItem.category || "Общее",
			...(selectedToothForService ? { toothNumber: selectedToothForService } : {}),
			quantity: qty,
			unitPriceRub: basePrice,
			discountRub,
		});

		onClose();
		setSelectedCatalogItem(null);
		setSelectedToothForService(null);
		setServiceQuantity(1);
		setServiceDiscountPercent(0);
	};

	if (!isOpen) return null;

	return (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
					role="dialog"
					aria-modal="true"
					aria-labelledby="add-service-modal-title"
					data-testid="add-service-from-catalog-modal"
				>
					<div
						className="w-full max-w-2xl bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] rounded-3xl border border-[var(--line,var(--border,#cbd5e1))] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
						onClick={(e) => e.stopPropagation()}
					>
						{/* Header */}
						<div className="flex items-center justify-between p-4 border-b border-[var(--line,var(--border,#cbd5e1))]">
							<div className="flex items-center gap-2.5">
								<div className="p-2 rounded-xl bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal,var(--brand-primary))] border border-[var(--teal)]/20">
									<FolderPlus size={18} />
								</div>
								<div>
									<h3 id="add-service-modal-title" className="text-sm font-black text-[var(--ink,#0f172a)]">
										Добавить услугу из каталога
									</h3>
									<p className="text-[11px] text-[var(--muted,#64748b)]">
										Прейскурант услуг и каталог клиники
									</p>
								</div>
							</div>
							<button
								type="button"
								onClick={() => {
									onClose();
									setSelectedCatalogItem(null);
								}}
								className="p-1.5 rounded-xl text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] cursor-pointer transition-colors"
								aria-label="Закрыть окно"
							>
								<X size={18} />
							</button>
						</div>

						{/* Body */}
						<div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
							{/* Search & Category Filter */}
							<div className="space-y-2">
								<div className="relative">
									<Search
										size={15}
										className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted,#64748b)]"
									/>
									<input
										type="text"
										value={serviceSearchQuery}
										onChange={(e) => setServiceSearchQuery(e.target.value)}
										placeholder="Поиск по названию или коду услуги (кариес, коронка, имплант, A16.07...)"
										className="w-full h-9 pl-9 pr-8 text-xs rounded-xl border border-[var(--line,var(--border,#cbd5e1))] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] focus:outline-none focus:ring-2 focus:ring-[var(--teal)]"
										data-testid="catalog-service-search-input"
									/>
									{serviceSearchQuery && (
										<button
											type="button"
											onClick={() => setServiceSearchQuery("")}
											className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
										>
											<X size={14} />
										</button>
									)}
								</div>

								{/* Category Pills */}
								{availableCategories.length > 0 && (
									<div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full">
										<button
											type="button"
											onClick={() => setServiceCategoryFilter("all")}
											className={`h-6 px-2.5 rounded-lg text-[11px] font-bold cursor-pointer transition-colors shrink-0 ${
												serviceCategoryFilter === "all"
													? "bg-[var(--teal,var(--brand-primary))] text-white shadow-2xs"
													: "bg-[var(--paper-soft,#f8fafc)] text-[var(--muted,#64748b)] hover:text-[var(--ink)] border border-[var(--line,#e2e8f0)]"
											}`}
										>
											Все ({effectiveCatalog.length})
										</button>
										{availableCategories.map((cat) => (
											<button
												key={cat}
												type="button"
												onClick={() => setServiceCategoryFilter(cat)}
												className={`h-6 px-2.5 rounded-lg text-[11px] font-bold cursor-pointer transition-colors shrink-0 ${
													serviceCategoryFilter === cat
														? "bg-[var(--teal,var(--brand-primary))] text-white shadow-2xs"
														: "bg-[var(--paper-soft,#f8fafc)] text-[var(--muted,#64748b)] hover:text-[var(--ink)] border border-[var(--line,#e2e8f0)]"
												}`}
											>
												{cat}
											</button>
										))}
									</div>
								)}
							</div>

							{/* Services List */}
							<div className="border border-[var(--line,var(--border,#cbd5e1))] rounded-2xl overflow-hidden max-h-48 overflow-y-auto divide-y divide-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)]">
								{filteredCatalogServices.length === 0 ? (
									<div className="p-4 text-center text-xs text-[var(--muted,#64748b)]">
										Услуги не найдены. Попробуйте изменить поисковый запрос.
									</div>
								) : (
									filteredCatalogServices.map((item) => {
										const isSelected = selectedCatalogItem?.id === item.id;
										return (
											<div
												key={item.id}
												onClick={() => setSelectedCatalogItem(item)}
												data-testid={`catalog-item-${item.id}`}
												className={`p-2.5 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
													isSelected
														? "bg-[var(--teal-soft,var(--paper-soft))] border-l-4 border-l-[var(--teal,var(--brand-primary))]"
														: "hover:bg-[var(--paper-strong,#ffffff)]"
												}`}
											>
												<div className="min-w-0 flex-1">
													<div className="flex items-center gap-1.5 flex-wrap">
														<span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--paper-strong)] border border-[var(--line)] text-[var(--teal-dark,var(--teal))]">
															{item.order804nCode || item.code || item.id}
														</span>
														<span className="text-[10px] text-[var(--muted,#64748b)]">
															{item.category}
														</span>
													</div>
													<div className="font-semibold text-xs text-[var(--ink,#0f172a)] truncate mt-0.5">
														{item.title}
													</div>
												</div>
												<div className="text-right shrink-0 flex items-center gap-2">
													<span className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
														{(item.basePriceRub || 0).toLocaleString("ru-RU")} ₽
													</span>
													{isSelected && (
														<Check size={14} className="text-[var(--teal,var(--brand-primary))]" />
													)}
												</div>
											</div>
										);
									})
								)}
							</div>

							{/* Configuration when a service is selected */}
							{selectedCatalogItem && (
								<div className="p-3 rounded-2xl bg-[var(--paper-strong,#ffffff)] border border-[var(--teal)]/40 space-y-3 shadow-xs">
									<div className="flex items-center justify-between gap-2 border-b border-[var(--line)] pb-2">
										<div className="min-w-0">
											<div className="text-[10px] text-[var(--muted)] uppercase font-bold tracking-wider">
												Выбранная процедура:
											</div>
											<div className="font-bold text-xs text-[var(--ink)] truncate">
												{selectedCatalogItem.title}
											</div>
										</div>
										<span className="font-mono font-bold text-sm text-emerald-600 shrink-0">
											{(selectedCatalogItem.basePriceRub || 0).toLocaleString("ru-RU")} ₽ / ед.
										</span>
									</div>

									{/* Target Stage selector */}
									<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
										<label className="text-[11px] font-bold text-[var(--muted)]">
											Назначить в этап плана:
										</label>
										<select
											value={serviceTargetStageNumber}
											onChange={(e) => setServiceTargetStageNumber(Number(e.target.value))}
											className="h-8 px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-xs font-bold text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-[var(--teal)]"
											data-testid="target-stage-selector"
										>
											{stages.map((st) => (
												<option key={st.stageNumber} value={st.stageNumber}>
													Этап {romanizeStageNumber(st.stageNumber)}: {st.title}
												</option>
											))}
											{stages.length === 0 && (
												<option value={1}>Этап I: Клинический этап</option>
											)}
										</select>
									</div>

									{/* FDI Tooth Selector */}
									<div className="space-y-1.5">
										<div className="flex items-center justify-between">
											<label className="text-[11px] font-bold text-[var(--muted)]">
												Привязка к зубу (FDI ISO 3950):
											</label>
											<button
												type="button"
												onClick={() => setSelectedToothForService(null)}
												className={`text-[10px] px-2 py-0.5 rounded-md font-bold cursor-pointer transition-colors ${
													selectedToothForService === null
														? "bg-[var(--teal)] text-white"
														: "bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] border border-[var(--line)]"
												}`}
											>
												Без зуба / Общая
											</button>
										</div>

										{/* Quick tooth selector chips */}
										<div className="space-y-1 bg-[var(--paper-soft)] p-2 rounded-xl border border-[var(--line)]">
											{/* Upper Jaw: Q1 (18..11) | Q2 (21..28) */}
											<div className="flex items-center justify-center gap-1 flex-wrap text-[10px] font-mono font-bold">
												<span className="text-[9px] text-[var(--muted)] mr-1">В/Ч:</span>
												{[18, 17, 16, 15, 14, 13, 12, 11].map((t) => (
													<button
														key={t}
														type="button"
														onClick={() => setSelectedToothForService(selectedToothForService === t ? null : t)}
														className={`w-6 h-6 rounded flex items-center justify-center cursor-pointer transition-all ${
															selectedToothForService === t
																? "bg-[var(--teal)] text-white shadow-2xs font-black"
																: "bg-[var(--paper-strong)] text-[var(--ink)] hover:bg-[var(--line)] border border-[var(--line)]"
														}`}
													>
														{t}
													</button>
												))}
												<span className="text-[var(--line)] font-normal">|</span>
												{[21, 22, 23, 24, 25, 26, 27, 28].map((t) => (
													<button
														key={t}
														type="button"
														onClick={() => setSelectedToothForService(selectedToothForService === t ? null : t)}
														className={`w-6 h-6 rounded flex items-center justify-center cursor-pointer transition-all ${
															selectedToothForService === t
																? "bg-[var(--teal)] text-white shadow-2xs font-black"
																: "bg-[var(--paper-strong)] text-[var(--ink)] hover:bg-[var(--line)] border border-[var(--line)]"
														}`}
													>
														{t}
													</button>
												))}
											</div>

											{/* Lower Jaw: Q4 (48..41) | Q3 (31..38) */}
											<div className="flex items-center justify-center gap-1 flex-wrap text-[10px] font-mono font-bold">
												<span className="text-[9px] text-[var(--muted)] mr-1">Н/Ч:</span>
												{[48, 47, 46, 45, 44, 43, 42, 41].map((t) => (
													<button
														key={t}
														type="button"
														onClick={() => setSelectedToothForService(selectedToothForService === t ? null : t)}
														className={`w-6 h-6 rounded flex items-center justify-center cursor-pointer transition-all ${
															selectedToothForService === t
																? "bg-[var(--teal)] text-white shadow-2xs font-black"
																: "bg-[var(--paper-strong)] text-[var(--ink)] hover:bg-[var(--line)] border border-[var(--line)]"
														}`}
													>
														{t}
													</button>
												))}
												<span className="text-[var(--line)] font-normal">|</span>
												{[31, 32, 33, 34, 35, 36, 37, 38].map((t) => (
													<button
														key={t}
														type="button"
														onClick={() => setSelectedToothForService(selectedToothForService === t ? null : t)}
														className={`w-6 h-6 rounded flex items-center justify-center cursor-pointer transition-all ${
															selectedToothForService === t
																? "bg-[var(--teal)] text-white shadow-2xs font-black"
																: "bg-[var(--paper-strong)] text-[var(--ink)] hover:bg-[var(--line)] border border-[var(--line)]"
														}`}
													>
														{t}
													</button>
												))}
											</div>
										</div>
									</div>

									{/* Quantity & Discount */}
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
										{/* Quantity */}
										<div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
											<span className="text-[11px] font-bold text-[var(--muted)]">Количество:</span>
											<div className="flex items-center gap-1.5">
												<button
													type="button"
													onClick={() => setServiceQuantity(Math.max(1, serviceQuantity - 1))}
													className="w-7 h-7 rounded-lg bg-[var(--paper-strong)] border border-[var(--line)] text-xs font-bold flex items-center justify-center cursor-pointer hover:bg-[var(--line)]"
												>
													-
												</button>
												<span className="w-8 text-center font-mono font-bold text-xs">
													{serviceQuantity}
												</span>
												<button
													type="button"
													onClick={() => setServiceQuantity(serviceQuantity + 1)}
													className="w-7 h-7 rounded-lg bg-[var(--paper-strong)] border border-[var(--line)] text-xs font-bold flex items-center justify-center cursor-pointer hover:bg-[var(--line)]"
												>
													+
												</button>
											</div>
										</div>

										{/* Doctor Discount */}
										<div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
											<span className="text-[11px] font-bold text-[var(--muted)]">Скидка врача:</span>
											<div className="flex items-center gap-1">
												{[0, 10, 50, 100].map((pct) => (
													<button
														key={pct}
														type="button"
														onClick={() => setServiceDiscountPercent(pct)}
														className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold cursor-pointer transition-colors ${
															serviceDiscountPercent === pct
																? "bg-[var(--teal)] text-white"
																: "bg-[var(--paper-strong)] text-[var(--muted)] hover:text-[var(--ink)] border border-[var(--line)]"
														}`}
													>
														{pct}%
													</button>
												))}
												<input
													type="number"
													min="0"
													max="100"
													value={serviceDiscountPercent}
													onChange={(e) => {
														const v = Math.max(0, Math.min(100, Number(e.target.value) || 0));
														setServiceDiscountPercent(v);
													}}
													className="w-10 h-7 text-center font-mono font-bold text-xs rounded border border-[var(--line)] bg-[var(--paper-strong)] text-[var(--ink)]"
												/>
											</div>
										</div>
									</div>

									{/* Total Calculation Strip (Mandate 8k: Kopeck Exact Money) */}
									{(() => {
										const basePrice = selectedCatalogItem.basePriceRub || 0;
										const grossRub = basePrice * serviceQuantity;
										const discRub = Math.round((grossRub * serviceDiscountPercent) / 100);
										const netRub = Math.max(0, grossRub - discRub);
										return (
											<div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs font-bold">
												<span className="text-emerald-900 dark:text-emerald-200">
													Итого к начислению в план:
												</span>
												<div className="flex items-center gap-2">
													{discRub > 0 && (
														<span className="text-[11px] text-[var(--muted)] line-through font-mono">
															{grossRub.toLocaleString("ru-RU")} ₽
														</span>
													)}
													<span className="font-mono text-sm text-emerald-700 dark:text-emerald-300">
														{netRub.toLocaleString("ru-RU")} ₽
													</span>
												</div>
											</div>
										);
									})()}
								</div>
							)}
						</div>

						{/* Footer */}
						<div className="p-4 border-t border-[var(--line,var(--border,#cbd5e1))] flex items-center justify-between gap-3 bg-[var(--paper-soft,#f8fafc)]">
							<button
								type="button"
								onClick={() => {
									onClose();
									setSelectedCatalogItem(null);
								}}
								className="min-h-[44px] sm:min-h-[36px] px-4 py-2 rounded-xl text-xs font-bold text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] border border-[var(--line,#e2e8f0)] bg-[var(--paper-strong,#ffffff)] cursor-pointer transition-colors"
							>
								Отмена
							</button>

							<button
								type="button"
								disabled={!selectedCatalogItem}
								onClick={handleConfirmAddService}
								data-testid="confirm-add-service-to-stage-btn"
								className="min-h-[44px] sm:min-h-[36px] px-5 py-2 rounded-xl text-xs font-black text-white bg-[var(--teal,var(--brand-primary))] hover:bg-[var(--teal-dark,#0f766e)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shadow-md flex items-center gap-1.5"
							>
								<Plus size={15} />
								<span>Добавить в этап</span>
							</button>
						</div>
					</div>
				</div>
	);
};
