/**
 * ClinicalServiceBundlesModal.tsx — Модальное окно 1-клик добавления клинических пакетов услуг «Все включено»
 * по номенклатуре Приказа Минздрава РФ № 804н у кресла стоматолога.
 *
 * (Мандат 8e: Запрет на палки в колёса врачам и персоналу / Пакеты «Все включено» вместо номенклатурного ада).
 *
 * Позволяет врачу в 1 клик добавить полный комплекс услуг в план лечения или выставить счет пациенту,
 * а также гибко скорректировать отдельные позиции (например, исключить анестезию в один клик).
 */

import React, { useEffect, useMemo, useState } from "react";
import {
	Activity,
	Check,
	ChevronDown,
	ChevronUp,
	CornerDownRight,
	Droplet,
	Eye,
	Filter,
	PackageCheck,
	PackagePlus,
	Receipt,
	RotateCcw,
	Search,
	ShieldAlert,
	Sparkles,
	Stethoscope,
	X,
	Zap,
} from "lucide-react";
import { DentalCrown } from "../icons/DentalIcons.js";
import { showToast } from "../GlobalToast";
import type { InvoiceServiceItem } from "../finance/invoiceEngine";
import {
	CLINICAL_BUNDLES,
	type ClinicalBundleCategory,
	type ClinicalBundleDefinition,
	type ClinicalBundleId,
	calculateBundlePrice,
	createBundleInvoiceExport,
	createBundleInvoiceItems,
	createBundlePlanItems,
	getClinicalBundleById,
} from "./treatmentPlanBundlesEngine";
import type { TreatmentPlanItem } from "./types";

export interface ClinicalServiceBundlesModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onApplyToPlan?: (
		items: TreatmentPlanItem[],
		bundle: ClinicalBundleDefinition,
		toothNumber?: number,
	) => void;
	readonly onApplyToInvoice?: (
		items: InvoiceServiceItem[],
		bundle: ClinicalBundleDefinition,
		toothNumber?: number,
	) => void;
	readonly initialToothNumber?: number | undefined;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly targetMode?: "plan" | "invoice" | "both" | undefined;
}

const COMMON_FDI_TEETH = [11, 16, 21, 26, 36, 46, 14, 24, 34, 44, 38, 48];

export const ClinicalServiceBundlesModal: React.FC<ClinicalServiceBundlesModalProps> = ({
	isOpen,
	onClose,
	onApplyToPlan,
	onApplyToInvoice,
	initialToothNumber = 16,
	patientId = "pat-walkin",
	patientName = "Пациент",
	targetMode = "both",
}) => {
	const [selectedCategory, setSelectedCategory] = useState<ClinicalBundleCategory | "all">("all");
	const [selectedTooth, setSelectedTooth] = useState<number>(initialToothNumber);
	const [customToothInput, setCustomToothInput] = useState<string>(String(initialToothNumber));
	const [searchQuery, setSearchQuery] = useState<string>("");

	// Карта выбранных позиций для каждого пакета: bundleId -> Set<itemId>
	const [selectedItemsMap, setSelectedItemsMap] = useState<Record<string, string[]>>(() => {
		const initialMap: Record<string, string[]> = {};
		for (const bundle of CLINICAL_BUNDLES) {
			initialMap[bundle.id] = bundle.items.map((it) => it.id);
		}
		return initialMap;
	});

	// Открытые карточки для детальной настройки состава
	const [expandedBundleIds, setExpandedBundleIds] = useState<Record<string, boolean>>({});

	// Анимация успешного добавления
	const [justAddedBundleId, setJustAddedBundleId] = useState<string | null>(null);

	useEffect(() => {
		if (initialToothNumber && initialToothNumber >= 11 && initialToothNumber <= 85) {
			setSelectedTooth(initialToothNumber);
			setCustomToothInput(String(initialToothNumber));
		}
	}, [initialToothNumber]);

	// Закрытие по нажатию клавиши Escape
	useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				onClose();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	const handleToothChange = (tooth: number) => {
		setSelectedTooth(tooth);
		setCustomToothInput(String(tooth));
	};

	const handleCustomToothChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const val = e.target.value.replace(/\D/g, "").slice(0, 2);
		setCustomToothInput(val);
		const num = parseInt(val, 10);
		if (num >= 11 && num <= 85) {
			setSelectedTooth(num);
		}
	};

	const toggleItemSelection = (bundleId: string, itemId: string) => {
		setSelectedItemsMap((prev) => {
			const current = prev[bundleId] ?? [];
			const exists = current.includes(itemId);
			const updated = exists ? current.filter((id) => id !== itemId) : [...current, itemId];
			return { ...prev, [bundleId]: updated };
		});
	};

	const resetBundleSelection = (bundleId: ClinicalBundleId) => {
		const bundle = getClinicalBundleById(bundleId);
		if (!bundle) return;
		setSelectedItemsMap((prev) => ({
			...prev,
			[bundleId]: bundle.items.map((it) => it.id),
		}));
	};

	const toggleExpandBundle = (bundleId: string) => {
		setExpandedBundleIds((prev) => ({
			...prev,
			[bundleId]: !prev[bundleId],
		}));
	};

	// Фильтрация пакетов
	const filteredBundles = useMemo(() => {
		return CLINICAL_BUNDLES.filter((bundle) => {
			if (selectedCategory !== "all" && bundle.category !== selectedCategory) {
				return false;
			}
			if (searchQuery.trim()) {
				const q = searchQuery.toLowerCase().trim();
				const matchesTitle = bundle.title.toLowerCase().includes(q) || bundle.shortTitle.toLowerCase().includes(q);
				const matchesDesc = bundle.description.toLowerCase().includes(q);
				const matchesItems = bundle.items.some(
					(it) => it.name.toLowerCase().includes(q) || it.code804n.toLowerCase().includes(q),
				);
				if (!matchesTitle && !matchesDesc && !matchesItems) return false;
			}
			return true;
		});
	}, [selectedCategory, searchQuery]);

	// Применить пакет в план лечения
	const handleApplyPlan = (bundle: ClinicalBundleDefinition) => {
		const selectedItemIds = selectedItemsMap[bundle.id] ?? bundle.items.map((it) => it.id);
		const effectiveTooth = bundle.requiresTooth ? selectedTooth : undefined;

		const planItems = createBundlePlanItems(bundle.id, {
			toothNumber: effectiveTooth,
			selectedItemIds,
		});

		if (planItems.length === 0) {
			showToast("Выберите хотя бы одну позицию из пакета", "warning");
			return;
		}

		if (onApplyToPlan) {
			onApplyToPlan(planItems, bundle, effectiveTooth);
		}

		setJustAddedBundleId(bundle.id);
		setTimeout(() => setJustAddedBundleId(null), 2500);

		const toothInfo = effectiveTooth ? ` (Зуб #${effectiveTooth})` : "";
		const totalRub = planItems.reduce((acc, it) => acc + it.priceRub, 0);
		showToast(
			`Пакет «${bundle.shortTitle}»${toothInfo} успешно добавлен в план: ${totalRub.toLocaleString("ru-RU")} ₽!`,
			"success",
		);
	};

	// Применить пакет в счет / кассу 54-ФЗ
	const handleApplyInvoice = (bundle: ClinicalBundleDefinition) => {
		const selectedItemIds = selectedItemsMap[bundle.id] ?? bundle.items.map((it) => it.id);
		const effectiveTooth = bundle.requiresTooth ? selectedTooth : undefined;

		const invoiceItems = createBundleInvoiceItems(bundle.id, {
			toothNumber: effectiveTooth,
			selectedItemIds,
		});

		if (invoiceItems.length === 0) {
			showToast("Выберите хотя бы одну позицию из пакета", "warning");
			return;
		}

		if (onApplyToInvoice) {
			onApplyToInvoice(invoiceItems, bundle, effectiveTooth);
		}

		setJustAddedBundleId(bundle.id);
		setTimeout(() => setJustAddedBundleId(null), 2500);

		const toothInfo = effectiveTooth ? ` (Зуб #${effectiveTooth})` : "";
		const totalRub = invoiceItems.reduce((acc, it) => acc + it.priceRub, 0);
		showToast(
			`Пакет «${bundle.shortTitle}»${toothInfo} добавлен в счет: ${totalRub.toLocaleString("ru-RU")} ₽!`,
			"success",
		);
	};

	const getCategoryIcon = (category: ClinicalBundleCategory) => {
		switch (category) {
			case "therapy":
				return <Sparkles size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />;
			case "surgery":
				return <ShieldAlert size={16} className="text-rose-600 dark:text-rose-400 shrink-0" />;
			case "hygiene":
				return <Droplet size={16} className="text-cyan-600 dark:text-cyan-400 shrink-0" />;
			case "orthopedics":
				return <DentalCrown size={16} className="text-purple-600 dark:text-purple-400 shrink-0" />;
			default:
				return <PackagePlus size={16} className="text-[var(--teal,#0d9488)] shrink-0" />;
		}
	};

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
			role="dialog"
			aria-modal="true"
			aria-labelledby="chairside-bundles-title"
			data-testid="clinical-service-bundles-modal"
		>
			<div className="relative w-full max-w-5xl rounded-2xl bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
				{/* Modal Header */}
				<div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-[var(--line)] bg-[var(--paper-strong)] shrink-0">
					<div className="flex items-center gap-3 min-w-0">
						<div className="p-2 rounded-xl bg-[var(--teal)]/10 text-[var(--teal)] border border-[var(--teal)]/20 shrink-0">
							<PackageCheck size={20} />
						</div>
						<div className="min-w-0">
							<div className="flex items-center gap-2 flex-wrap">
								<h2 id="chairside-bundles-title" className="text-sm sm:text-base font-black tracking-tight break-words">
									Клинические пакеты лечения («Все включено»)
								</h2>
								<span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[var(--teal)]/15 text-[var(--teal-dark)] dark:text-teal-300 border border-[var(--teal)]/30 shrink-0">
									1 клик
								</span>
								<span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-[var(--paper-soft)] text-[var(--muted)] border border-[var(--line)] shrink-0">
									Каталог клинических услуг
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] leading-normal break-words mt-0.5">
								Быстрое добавление полного комплекса услуг в план лечения или счет пациента в 1 клик
							</p>
						</div>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="p-2 rounded-xl text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer shrink-0"
						title="Закрыть окно (Esc)"
						aria-label="Закрыть окно"
						data-testid="bundles-modal-close-btn"
					>
						<X size={20} />
					</button>
				</div>

				{/* Toolbar: Category Filters, FDI Tooth Selector & Search */}
				<div className="flex items-center justify-between gap-2.5 px-5 py-2.5 bg-[var(--paper-soft)] border-b border-[var(--line)] flex-wrap shrink-0">
					{/* Category Tabs (Hick's Law) */}
					<div className="dente-filter-chips overflow-x-auto min-w-0 py-0.5">
						<button
							type="button"
							onClick={() => setSelectedCategory("all")}
							className={`dente-filter-chip ${selectedCategory === "all" ? "active" : ""}`}
							data-active={selectedCategory === "all"}
							data-testid="filter-cat-all"
						>
							Все пакеты ({CLINICAL_BUNDLES.length})
						</button>
						<button
							type="button"
							onClick={() => setSelectedCategory("therapy")}
							className={`dente-filter-chip ${selectedCategory === "therapy" ? "active" : ""}`}
							data-active={selectedCategory === "therapy"}
							data-testid="filter-cat-therapy"
						>
							Терапия ({CLINICAL_BUNDLES.filter((b) => b.category === "therapy").length})
						</button>
						<button
							type="button"
							onClick={() => setSelectedCategory("surgery")}
							className={`dente-filter-chip ${selectedCategory === "surgery" ? "active" : ""}`}
							data-active={selectedCategory === "surgery"}
							data-testid="filter-cat-surgery"
						>
							Хирургия ({CLINICAL_BUNDLES.filter((b) => b.category === "surgery").length})
						</button>
						<button
							type="button"
							onClick={() => setSelectedCategory("hygiene")}
							className={`dente-filter-chip ${selectedCategory === "hygiene" ? "active" : ""}`}
							data-active={selectedCategory === "hygiene"}
							data-testid="filter-cat-hygiene"
						>
							Профгигиена ({CLINICAL_BUNDLES.filter((b) => b.category === "hygiene").length})
						</button>
						<button
							type="button"
							onClick={() => setSelectedCategory("orthopedics")}
							className={`dente-filter-chip ${selectedCategory === "orthopedics" ? "active" : ""}`}
							data-active={selectedCategory === "orthopedics"}
							data-testid="filter-cat-orthopedics"
						>
							Ортопедия ({CLINICAL_BUNDLES.filter((b) => b.category === "orthopedics").length})
						</button>
					</div>

					{/* Tooth Selector & Search */}
					<div className="flex items-center gap-2 shrink-0">
						<div className="flex items-center gap-1.5 bg-[var(--paper)] border border-[var(--line)] rounded-xl px-2.5 h-9">
							<span className="text-xs font-bold text-[var(--muted)]">Зуб FDI:</span>
							<select
								value={selectedTooth}
								onChange={(e) => handleToothChange(Number(e.target.value))}
								className="bg-transparent font-mono font-bold text-xs text-[var(--ink)] outline-none cursor-pointer"
								title="Выбрать номер зуба из частых"
								data-testid="tooth-quick-select"
							>
								{COMMON_FDI_TEETH.map((t) => (
									<option key={t} value={t}>
										#{t}
									</option>
								))}
							</select>
							<input
								type="text"
								value={customToothInput}
								onChange={handleCustomToothChange}
								placeholder="FDI"
								maxLength={2}
								className="w-10 text-center font-mono font-bold text-xs text-[var(--teal)] outline-none border-l border-[var(--line)] px-1"
								title="Ввести номер зуба вручную (11-85)"
								data-testid="custom-tooth-input"
							/>
						</div>

						<div className="dente-search-wrap" style={{ width: "250px" }}>
							<Search size={14} className="dente-search-icon" />
							<input
								type="text"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								placeholder="Поиск пакета или кода..."
								className="dente-search-input"
								data-testid="bundles-search-input"
							/>
							{searchQuery && (
								<button
									type="button"
									onClick={() => setSearchQuery("")}
									className="dente-search-clear"
									aria-label="Очистить поиск"
								>
									<X size={13} />
								</button>
							)}
						</div>
					</div>
				</div>

				{/* Scrollable Modal Content: Clinical Package Cards */}
				<div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 bg-[var(--paper)]">
					{filteredBundles.length === 0 ? (
						<div className="py-12 px-4 text-center text-xs text-[var(--muted)] bg-[var(--paper-soft)] rounded-2xl border border-[var(--line)] flex flex-col items-center justify-center gap-2">
							<PackagePlus size={28} className="text-[var(--muted)] opacity-50" />
							<span className="font-semibold text-sm text-[var(--ink)]">
								Пакеты не найдены по заданным критериям
							</span>
							<p className="text-xs max-w-sm">
								Попробуйте изменить поисковый запрос или сбросить фильтр категорий.
							</p>
							<button
								type="button"
								onClick={() => {
									setSelectedCategory("all");
									setSearchQuery("");
								}}
								className="h-9 min-h-[36px] px-3.5 rounded-xl text-xs font-bold text-[var(--teal)] bg-[var(--teal)]/10 hover:bg-[var(--teal)]/20 border border-[var(--teal)]/30 cursor-pointer transition-colors mt-2"
							>
								Сбросить фильтры
							</button>
						</div>
					) : (
						<div className="grid grid-cols-1 gap-3.5">
							{filteredBundles.map((bundle) => {
								const selectedIds = selectedItemsMap[bundle.id] ?? bundle.items.map((it) => it.id);
								const breakdown = calculateBundlePrice(bundle.id, selectedIds);
								const isExpanded = !!expandedBundleIds[bundle.id];
								const isRecentlyAdded = justAddedBundleId === bundle.id;

								return (
									<div
										key={bundle.id}
										className={`rounded-2xl border transition-all ${
											isRecentlyAdded
												? "border-emerald-500 shadow-md bg-emerald-50/20 dark:bg-emerald-950/20"
												: "border-[var(--line)] hover:border-[var(--teal)]/60 bg-[var(--paper-strong)] shadow-xs"
										}`}
										data-testid={`bundle-modal-card-${bundle.id}`}
									>
										{/* Package Header Row */}
										<div className="p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[var(--line)]/60">
											<div className="space-y-1.5 flex-1 min-w-0">
												<div className="flex items-center gap-2 flex-wrap">
													{getCategoryIcon(bundle.category)}
													<h3 className="text-sm sm:text-base font-black text-[var(--ink)] tracking-tight break-words leading-snug">
														{bundle.title}
													</h3>
													<span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[var(--paper-soft)] text-[var(--muted)] border border-[var(--line)] shrink-0">
														Этап {bundle.stageNumber}
													</span>
													{bundle.requiresTooth ? (
														<span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-[var(--teal)]/10 text-[var(--teal-dark)] dark:text-teal-300 border border-[var(--teal)]/30 shrink-0">
															Зуб #{selectedTooth}
														</span>
													) : (
														<span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[var(--paper-soft)] text-[var(--muted)] border border-[var(--line)] shrink-0">
															Вся полость рта
														</span>
													)}
												</div>

												<p className="text-xs text-[var(--muted)] leading-snug break-words">
													{bundle.description}
												</p>

												{/* Composition summary chip */}
												<div className="flex items-center gap-2 pt-0.5 text-[11px] text-[var(--muted)] flex-wrap">
													<span className="font-semibold text-[var(--ink)]">
														{breakdown.selectedItems.length} из {bundle.items.length} поз. выбрано
													</span>
													{!breakdown.isFullySelected && (
														<span className="text-amber-600 dark:text-amber-400 font-medium">
															(скорректировано врачом, -{breakdown.savingsRub.toLocaleString("ru-RU")} ₽)
														</span>
													)}
												</div>
											</div>

											{/* Price & Primary 1-Click Action Buttons */}
											<div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-[var(--line)]/50">
												<div className="text-left md:text-right">
													<span className="text-[10px] text-[var(--muted)] block uppercase tracking-wider font-semibold">
														{breakdown.isFullySelected ? "Итого «Все включено»" : "Итого с учетом выбора"}
													</span>
													<div className="flex items-baseline md:justify-end gap-1.5">
														<strong className="text-base sm:text-lg font-black text-[var(--ink)] font-mono">
															{breakdown.totalRub.toLocaleString("ru-RU")} ₽
														</strong>
														{!breakdown.isFullySelected && (
															<span className="text-[11px] line-through text-[var(--muted)] font-mono">
																{bundle.basePriceRub.toLocaleString("ru-RU")} ₽
															</span>
														)}
													</div>
												</div>

												<div className="flex items-center gap-2">
													{/* Toggle composition checklist */}
													<button
														type="button"
														onClick={() => toggleExpandBundle(bundle.id)}
														className="h-9 min-h-[36px] px-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors flex items-center gap-1 cursor-pointer"
														title="Настроить состав пакета (исключить анестезию или другие позиции)"
														data-testid={`toggle-expand-${bundle.id}`}
													>
														<span>Состав</span>
														{isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
													</button>

													{/* 1-Click to Plan */}
													{(targetMode === "both" || targetMode === "plan") && (
														<button
															type="button"
															onClick={() => handleApplyPlan(bundle)}
															className="h-9 min-h-[36px] px-4 rounded-xl bg-[var(--teal)] hover:bg-[var(--teal-dark)] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
															title={`Добавить пакет в активный план лечения${bundle.requiresTooth ? ` (зуб ${selectedTooth})` : ""}`}
															data-testid={`apply-plan-${bundle.id}`}
														>
															<PackagePlus size={15} />
															<span>В план</span>
														</button>
													)}

													{/* 1-Click to Invoice / Cashier */}
													{(targetMode === "both" || targetMode === "invoice") && (
														<button
															type="button"
															onClick={() => handleApplyInvoice(bundle)}
															className="h-9 min-h-[36px] px-3.5 rounded-xl border border-[var(--teal)]/40 bg-[var(--teal)]/10 hover:bg-[var(--teal)]/20 text-[var(--teal-dark)] dark:text-teal-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
															title={`Выставить счет пациенту по пакету${bundle.requiresTooth ? ` (зуб ${selectedTooth})` : ""}`}
															data-testid={`apply-invoice-${bundle.id}`}
														>
															<Receipt size={15} />
															<span>В счет</span>
														</button>
													)}
												</div>
											</div>
										</div>

										{/* Interactive Composition Checklist (Flexible doctor customization) */}
										{isExpanded && (
											<div className="p-3.5 sm:p-4 bg-[var(--paper-soft)] border-t border-[var(--line)] space-y-2.5 animate-in fade-in duration-150">
												<div className="flex items-center justify-between gap-2 flex-wrap">
													<div className="flex items-center gap-2">
														<span className="text-xs font-bold text-[var(--ink)]">
															Состав пакета лечения (клинические услуги):
														</span>
														<span className="text-[11px] text-[var(--muted)]">
															Снимите отметку, если позиция не проводилась
														</span>
													</div>

													<button
														type="button"
														onClick={() => resetBundleSelection(bundle.id)}
														className="text-[11px] text-[var(--teal)] hover:underline flex items-center gap-1 cursor-pointer font-medium"
														title="Вернуть все позиции пакета по умолчанию"
													>
														<RotateCcw size={12} />
														<span>Сбросить к «Все включено»</span>
													</button>
												</div>

												<div className="grid grid-cols-1 gap-2">
													{bundle.items.map((item) => {
														const isChecked = selectedIds.includes(item.id);

														return (
															<label
																key={item.id}
																className={`flex items-start justify-between gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
																	isChecked
																		? "bg-[var(--paper)] border-[var(--line)] shadow-2xs"
																		: "bg-[var(--paper-soft)]/60 border-dashed border-[var(--line)] opacity-60"
																}`}
																data-testid={`item-checkbox-${bundle.id}-${item.id}`}
															>
																<div className="flex items-start gap-3 min-w-0">
																	<input
																		type="checkbox"
																		checked={isChecked}
																		onChange={() => toggleItemSelection(bundle.id, item.id)}
																		className="mt-0.5 h-4 w-4 rounded text-[var(--teal)] border-[var(--line)] focus:ring-[var(--teal)] cursor-pointer shrink-0"
																	/>
																	<div className="min-w-0">
																		<div className="flex items-center gap-2 flex-wrap">
																			<span className="font-mono text-[11px] font-bold text-[var(--teal)] bg-[var(--teal)]/10 px-1.5 py-0.5 rounded shrink-0">
																				{item.code804n}
																			</span>
																			<span className={`text-xs font-bold break-words leading-snug ${isChecked ? "text-[var(--ink)]" : "text-[var(--muted)] line-through"}`}>
																				{item.name}
																			</span>
																			{item.optional && (
																				<span className="text-[10px] text-[var(--muted)] font-medium shrink-0">
																					(опционально)
																				</span>
																			)}
																		</div>
																		<p className="text-[11px] text-[var(--muted)] mt-1 break-words">
																			<strong className="text-[var(--ink)]/80">Материалы:</strong> {item.materials}
																		</p>
																	</div>
																</div>

																<div className="text-right shrink-0">
																	<span className="font-mono font-bold text-xs text-[var(--ink)]">
																		{item.defaultPriceRub.toLocaleString("ru-RU")} ₽
																	</span>
																</div>
															</label>
														);
													})}
												</div>
											</div>
										)}
									</div>
								);
							})}
						</div>
					)}
				</div>

				{/* Modal Footer */}
				<div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-[var(--line)] bg-[var(--paper-soft)] shrink-0 text-xs text-[var(--muted)]">
					<div className="flex items-center gap-2">
						<Stethoscope size={14} className="text-[var(--teal)]" />
						<span>Все суммы рассчитываются в копейках с гарантией абсолютной точности.</span>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="secondary-button min-h-[36px] px-4"
						data-testid="bundles-modal-bottom-close-btn"
					>
						Закрыть
					</button>
				</div>
			</div>
		</div>
	);
};
