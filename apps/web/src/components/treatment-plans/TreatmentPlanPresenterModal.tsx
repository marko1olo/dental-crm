/**
 * TreatmentPlanPresenterModal.tsx — Интерактивная студия презентации планов лечения пациенту у кресла
 * (Wave 19: Chairside Treatment Plan Presenter & Official Appendix #1 Generator).
 *
 * ВОЗМОЖНОСТИ:
 * 1. 3-колоночная презентационная таблица («Вариант А: Эконом / Вариант Б: Оптимум / Вариант В: Премиум»)
 *    с ярким бейджем «Рекомендация врача» на оптимальном варианте.
 * 2. Раскрывающиеся клинические этапы (Этап 1: Терапия/Санация, Этап 2: Хирургия, Этап 3: Ортопедия)
 *    со сроками в неделях, числом визитов и суммами в рублях.
 * 3. Динамическая кнопка фиксации выбора: [Пациент выбрал Вариант Б: Оптимум (184 000 ₽)].
 * 4. 1-клик печать официального Приложения №1 к Договору по Постановлению Правительства РФ № 736
 *    (Смета и план лечения) с перечнем услуг по Номенклатуре 804н, зубами FDI 11–48 и местом для подписей.
 * 5. Точный расчет вычета 13% НДФЛ (Код 01 / Код 02) и рассрочки 0% без переплат (3, 6, 12, 24 мес).
 * 6. Полная поддержка темной/светлой темы на токенах DENTE и сенсорных экранов (Chairside Tablet).
 */

import React, { useMemo, useState, useEffect } from "react";
import {
	Bot,
	Calendar,
	Check,
	CheckCircle2,
	ChevronDown,
	ChevronUp,
	Clock,
	Coins,
	CreditCard,
	Crown,
	FileCheck2,
	FileText,
	Layers,
	Percent,
	Printer,
	RotateCcw,
	Send,
	Shield,
	ShieldCheck,
	Sparkles,
	Star,
	Tablet,
	User,
	Wand2,
	X,
} from "lucide-react";
import {
	type Kopecks,
	parseKopecks,
	sumKopecks,
	calculatePlanTaxDeductionBreakdown,
	calculateStaged304030Schedule,
} from "@dental/shared";
import type {
	NdflDeductionResult,
	TreatmentPlanItem,
	TreatmentPlanStage,
	TreatmentPlanTier,
	TreatmentPlanTierId,
} from "./types";
import type { ToothData } from "../odontogram/ToothChart";
import {
	generate3TierPlanComparison,
	computeTierInstallments,
} from "./treatmentPlanStagesEngine";
import { MissingPriceAlert } from "./MissingPriceAlert";
import {
	applyCopilotCommandToPlan,
	COPILOT_PRESET_ACTIONS,
	type CopilotCommandType,
} from "../../services/ai/treatmentPlanCopilot";
import "./treatmentPlans.css";

export interface TreatmentPlanPresenterModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientName?: string | undefined;
	readonly patientId?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly patientBirthDate?: string | undefined;
	readonly doctorFullName?: string | undefined;
	readonly doctorSpecialty?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly clinicLegalName?: string | undefined;
	readonly clinicInn?: string | undefined;
	readonly clinicOgrn?: string | undefined;
	readonly clinicAddress?: string | undefined;
	readonly clinicLicense?: string | undefined;
	readonly contractNumber?: string | undefined;
	readonly teeth?: readonly ToothData[] | undefined;
	readonly tiers?: readonly TreatmentPlanTier[] | undefined;
	readonly initialSelectedTierId?: TreatmentPlanTierId | undefined;
	readonly onSelectPlan?: ((tier: TreatmentPlanTier) => void) | undefined;
	readonly onConfirmSelection?: ((tier: TreatmentPlanTier) => void) | undefined;
	readonly onPrintContract?: ((tier: TreatmentPlanTier) => void) | undefined;
	readonly onUpdateItemPrice?: ((itemId: string, newPriceRub: number) => void) | undefined;
	readonly className?: string | undefined;
}

const DEFAULT_SAMPLE_TEETH: ToothData[] = [
	{
		id: 16,
		toothNumber: 16,
		state: "Caries",
		systemicNotes: "Глубокий кариес жевательной поверхности",
	} as ToothData,
	{
		id: 36,
		toothNumber: 36,
		state: "Missing",
		systemicNotes: "Отсутствует зуб, показана дентальная имплантация",
	} as ToothData,
	{
		id: 46,
		toothNumber: 46,
		state: "Pulpitis",
		systemicNotes: "Острый очаговый пульпит, показано эндодонтическое лечение",
	} as ToothData,
];

export const TreatmentPlanPresenterModal: React.FC<TreatmentPlanPresenterModalProps> = ({
	isOpen,
	onClose,
	patientName = "Смирнова Екатерина Васильевна",
	patientId = "PAT-2026-0891",
	patientPhone = "+7 (926) 555-12-34",
	patientBirthDate = "14.06.1988",
	doctorFullName = "Д-р Смирнов Алексей Петрович",
	doctorSpecialty = "Врач-стоматолог терапевт-ортопед",
	clinicName = "Стоматологическая клиника «ДЕНТЕ СТОМАТОЛОГИЯ»",
	clinicLegalName = "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
	clinicInn = "7701234567",
	clinicOgrn = "1237700456789",
	clinicAddress = "г. Москва, ул. Клиническая, д. 10, стр. 1",
	clinicLicense = "ЛО41-01137-77/00567890 от 15.01.2023 выдана Департаментом здравоохранения г. Москвы",
	contractNumber,
	teeth,
	tiers: customTiers,
	initialSelectedTierId = "standard",
	onSelectPlan,
	onConfirmSelection,
	onPrintContract,
	onUpdateItemPrice: onUpdateItemPriceProp,
	className = "",
}) => {
	if (!isOpen) return null;

	// Генерация 3-х вариантов при отсутствии явно переданных
	const initialTiers = useMemo(() => {
		if (customTiers && customTiers.length === 3) {
			return customTiers;
		}
		const effectiveTeeth = teeth && teeth.length > 0 ? teeth : DEFAULT_SAMPLE_TEETH;
		return generate3TierPlanComparison(effectiveTeeth);
	}, [customTiers, teeth]);

	const [activeTiers, setActiveTiers] = useState<readonly TreatmentPlanTier[]>(initialTiers);
	const [selectedTierId, setSelectedTierId] = useState<TreatmentPlanTierId>(initialSelectedTierId);
	const [activeTab, setActiveTab] = useState<"comparison" | "stages" | "finance" | "print_appendix">("comparison");
	const [expandedStages, setExpandedStages] = useState<Record<number, boolean>>({
		1: true,
		2: true,
		3: true,
	});
	const [selectionConfirmed, setSelectionConfirmed] = useState<boolean>(false);
	const [confirmedNotice, setConfirmedNotice] = useState<string | null>(null);
	const [installmentMonths, setInstallmentMonths] = useState<3 | 6 | 12 | 24>(12);

	// AI Copilot state
	const [copilotFeedback, setCopilotFeedback] = useState<string | null>(null);
	const [customPrompt, setCustomPrompt] = useState<string>("");
	const [isCopilotExecuting, setIsCopilotExecuting] = useState<boolean>(false);

	useEffect(() => {
		setActiveTiers(initialTiers);
	}, [initialTiers]);

	const allTiers = activeTiers;

	const selectedTier = useMemo<TreatmentPlanTier>(() => {
		return allTiers.find((t) => t.tierId === selectedTierId) ?? allTiers[1] ?? allTiers[0]!;
	}, [allTiers, selectedTierId]);

	const cleanPatCode = patientId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase() || "0891";
	const displayContractNumber = contractNumber || ("ДОГ-2026-" + cleanPatCode);

	const getTierLetter = (tierId: TreatmentPlanTierId): string => {
		switch (tierId) {
			case "economy":
				return "Вариант А: Эконом";
			case "standard":
				return "Вариант Б: Оптимум";
			case "optimum":
				return "Вариант В: Премиум";
			default:
				return "Вариант";
		}
	};

	const formatRubles = (amount: number): string => {
		return amount.toLocaleString("ru-RU") + " ₽";
	};

	const handleSelectTier = (tier: TreatmentPlanTier) => {
		setSelectedTierId(tier.tierId);
		setSelectionConfirmed(false);
		setConfirmedNotice(null);
		onSelectPlan?.(tier);
	};

	const recalculateTierFromStages = (
		tier: TreatmentPlanTier,
		updatedStages: readonly TreatmentPlanStage[],
	): TreatmentPlanTier => {
		const totalKopecks = sumKopecks(updatedStages.map((s) => s.totalKopecks));
		const totalRub = Math.round(totalKopecks / 100);
		const allItems = updatedStages.flatMap((s) => s.items);
		const ndflBreakdown = calculatePlanTaxDeductionBreakdown(allItems);
		const isHighCost = ndflBreakdown.hasCode02ExpensiveServices;
		const ndflDetails: NdflDeductionResult = {
			code: isHighCost ? "02" : "01",
			codeDescription: isHighCost
				? "Код 02 — Дорогостоящее лечение (имплантация, костная пластика, синус-лифтинг) — налоговый вычет 13% со всей суммы без ограничений"
				: "Код 01 — Обычное медицинское лечение (терапия, гигиена, ортопедия) — налоговый вычет 13% с лимитом базы 150 000 ₽ (макс. возврат 19 500 ₽)",
			isHighCostCode02: isHighCost,
			baseKopecks: (isHighCost ? totalKopecks : Math.min(totalKopecks, parseKopecks(150000))) as Kopecks,
			refundKopecks: parseKopecks(ndflBreakdown.grandTotalRefund13Rub),
			refundRub: ndflBreakdown.grandTotalRefund13Rub,
			finalPriceWithRefundRub: ndflBreakdown.netPriceWithRefundRub,
			annualLimitRub: isHighCost ? undefined : 150000,
		};
		const installments = computeTierInstallments(totalKopecks);
		const stagedSchedule = calculateStaged304030Schedule(totalKopecks, true);

		return {
			...tier,
			stages: updatedStages,
			itemsCount: allItems.length,
			totalRub,
			totalKopecks,
			monthlyInstallment12Rub: installments[12].monthlyPaymentRub,
			installments,
			ndflDetails,
			ndflRefundRub: ndflBreakdown.grandTotalRefund13Rub,
			priceWithNdflRefundRub: ndflBreakdown.netPriceWithRefundRub,
			stagedSchedule,
		};
	};

	const handleUpdateItemPrice = (itemId: string, newPriceRub: number) => {
		setActiveTiers((prevTiers) => {
			return prevTiers.map((tier) => {
				let tierModified = false;
				const updatedStages = tier.stages.map((st) => {
					let stageModified = false;
					const updatedItems = st.items.map((it) => {
						if (it.id === itemId) {
							tierModified = true;
							stageModified = true;
							return {
								...it,
								priceRub: newPriceRub,
								unitPriceRub: newPriceRub,
								requiresManualPricing: false,
							};
						}
						return it;
					});

					if (!stageModified) return st;

					const stTotalRub = updatedItems.reduce((acc, it) => acc + it.priceRub, 0);
					const stTotalKopecks = parseKopecks(stTotalRub);
					return {
						...st,
						items: updatedItems,
						totalRub: stTotalRub,
						totalKopecks: stTotalKopecks,
					};
				});

				if (!tierModified) return tier;

				const updatedTier = recalculateTierFromStages(tier, updatedStages);

				if (tier.tierId === selectedTierId) {
					onSelectPlan?.(updatedTier);
				}

				return updatedTier;
			});
		});

		onUpdateItemPriceProp?.(itemId, newPriceRub);
	};

	const handleExecuteCopilot = (cmdOrText: CopilotCommandType | string) => {
		setIsCopilotExecuting(true);
		try {
			const res = applyCopilotCommandToPlan(selectedTier.stages, cmdOrText);
			if (res.success) {
				setActiveTiers((prevTiers) => {
					return prevTiers.map((t) => {
						if (t.tierId !== selectedTierId) return t;
						const updated = recalculateTierFromStages(t, res.stages);
						onSelectPlan?.(updated);
						return updated;
					});
				});
				setCopilotFeedback(res.explanation);
			}
		} finally {
			setIsCopilotExecuting(false);
		}
	};

	const handleConfirmPatientChoice = () => {
		setSelectionConfirmed(true);
		const variantTitle = getTierLetter(selectedTier.tierId);
		const message = "Выбор зафиксирован: Пациент выбрал " + variantTitle + " на сумму " + formatRubles(selectedTier.totalRub);
		setConfirmedNotice(message);
		onConfirmSelection?.(selectedTier);
	};

	const handlePrintAppendix = () => {
		if (activeTab !== "print_appendix") {
			setActiveTab("print_appendix");
		}
		setTimeout(() => {
			window.print();
		}, 100);
		onPrintContract?.(selectedTier);
	};

	const toggleStage = (stageNum: number) => {
		setExpandedStages((prev) => ({
			...prev,
			[stageNum]: !prev[stageNum],
		}));
	};

	const toggleAllStages = (expand: boolean) => {
		setExpandedStages({
			1: expand,
			2: expand,
			3: expand,
		});
	};

	const todayRu = new Date().toLocaleDateString("ru-RU", {
		day: "numeric",
		month: "long",
		year: "numeric",
	});

	const patientChoiceBtnText = "Пациент выбрал " + getTierLetter(selectedTier.tierId) + " (" + selectedTier.totalRub.toLocaleString("ru-RU") + " ₽)";
	const choiceConfirmedBtnText = "Выбор зафиксирован (" + getTierLetter(selectedTier.tierId) + ")";

	return (
		<div
			className={("treatment-presenter-backdrop " + className).trim()}
			data-testid="treatment-plan-presenter-modal"
			role="dialog"
			aria-modal="true"
			aria-labelledby="treatment-presenter-modal-title"
		>
			<div className="treatment-presenter-modal" data-testid="treatment-presenter-modal-card">
				{/* Top Bar Header */}
				<header className="treatment-presenter-header no-print">
					<div className="treatment-presenter-header-main">
						<div className="treatment-presenter-title-group">
							<div className="treatment-presenter-icon-badge">
								<Tablet size={22} />
							</div>
							<div className="treatment-presenter-header-meta">
								<h2 id="treatment-presenter-modal-title" className="treatment-presenter-main-title">
									<span>Презентация планов лечения</span>
									<span className="treatment-presenter-law-badge">
										ПП РФ № 736 & 804н
									</span>
								</h2>
								<p className="treatment-presenter-subtitle">
									Пациент: <strong className="text-[var(--tp-text-main)]">{patientName}</strong> · Врач: {doctorFullName}
								</p>
							</div>
						</div>

						{/* Close Button on Mobile / Desktop */}
						<button
							type="button"
							onClick={onClose}
							className="treatment-presenter-close-btn"
							aria-label="Закрыть модальное окно"
							data-testid="close-treatment-presenter-btn"
						>
							<X size={20} />
						</button>
					</div>

					{/* Navigation Tabs */}
					<nav className="treatment-presenter-tabs" aria-label="Режимы просмотра">
						<button
							type="button"
							onClick={() => setActiveTab("comparison")}
							className={"treatment-presenter-tab-btn " + (activeTab === "comparison" ? "active" : "")}
							data-testid="tab-comparison-btn"
						>
							<Layers size={14} />
							<span>3-Tier Сравнение</span>
						</button>
						<button
							type="button"
							onClick={() => setActiveTab("stages")}
							className={"treatment-presenter-tab-btn " + (activeTab === "stages" ? "active" : "")}
							data-testid="tab-stages-btn"
						>
							<Clock size={14} />
							<span>Этапы (804н)</span>
						</button>
						<button
							type="button"
							onClick={() => setActiveTab("finance")}
							className={"treatment-presenter-tab-btn " + (activeTab === "finance" ? "active" : "")}
							data-testid="tab-finance-btn"
						>
							<Coins size={14} />
							<span>Финансы & НДФЛ</span>
						</button>
						<button
							type="button"
							onClick={() => setActiveTab("print_appendix")}
							className={"treatment-presenter-tab-btn " + (activeTab === "print_appendix" ? "active" : "")}
							data-testid="tab-print-btn"
						>
							<FileText size={14} />
							<span>Приложение №1</span>
						</button>
					</nav>
				</header>

				{/* AI Copilot Chairside Quick Toolbar */}
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-6 py-2.5 bg-[var(--tp-surface)] border-b border-[var(--tp-border)] no-print">
					<div className="flex items-center gap-2 flex-wrap">
						<div className="inline-flex items-center gap-1 text-xs font-bold text-[var(--tp-primary)] mr-1">
							<Sparkles size={14} className="text-amber-500" />
							<span>AI Copilot у кресла:</span>
						</div>
						{COPILOT_PRESET_ACTIONS.map((act) => (
							<button
								key={act.id}
								type="button"
								disabled={isCopilotExecuting}
								onClick={() => handleExecuteCopilot(act.id)}
								className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[var(--tp-surface-soft)] text-[var(--tp-text-main)] hover:bg-[var(--tp-primary-light)] hover:text-[var(--tp-primary)] border border-[var(--tp-border)] cursor-pointer transition-colors disabled:opacity-50"
								title={act.description}
								data-testid={`presenter-copilot-btn-${act.id}`}
							>
								{act.title}
							</button>
						))}
					</div>

					<div className="flex items-center gap-1.5 min-w-[200px] max-w-sm">
						<input
							type="text"
							value={customPrompt}
							onChange={(e) => setCustomPrompt(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter" && customPrompt.trim()) {
									e.preventDefault();
									handleExecuteCopilot(customPrompt.trim());
									setCustomPrompt("");
								}
							}}
							placeholder="Команда ассистенту (напр. 'бюджет 120к')"
							className="flex-1 px-2.5 py-1 text-xs rounded-lg border border-[var(--tp-border)] bg-[var(--tp-bg)] text-[var(--tp-text-main)] outline-none"
							data-testid="presenter-copilot-input"
						/>
						<button
							type="button"
							disabled={!customPrompt.trim() || isCopilotExecuting}
							onClick={() => {
								if (customPrompt.trim()) {
									handleExecuteCopilot(customPrompt.trim());
									setCustomPrompt("");
								}
							}}
							className="p-1.5 rounded-lg bg-[var(--tp-primary)] text-white hover:bg-[var(--tp-primary-hover)] disabled:opacity-40 cursor-pointer"
							title="Отправить команду"
							data-testid="presenter-copilot-send-btn"
						>
							<Send size={12} />
						</button>
					</div>
				</div>

				{/* AI Copilot Feedback Alert */}
				{copilotFeedback && (
					<div
						className="px-6 py-2 bg-indigo-500/10 border-b border-indigo-500/30 text-indigo-950 dark:text-indigo-200 text-xs flex items-center justify-between no-print"
						data-testid="presenter-copilot-feedback-banner"
					>
						<div className="flex items-center gap-2">
							<Bot size={15} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
							<span>{copilotFeedback}</span>
						</div>
						<button
							type="button"
							onClick={() => setCopilotFeedback(null)}
							className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer ml-4 shrink-0"
						>
							Скрыть
						</button>
					</div>
				)}

				{/* Confirmation Notice Banner */}
				{confirmedNotice && (
					<div
						className="px-6 py-2.5 bg-emerald-500/10 border-b border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center justify-between no-print"
						data-testid="choice-confirmed-banner"
					>
						<div className="flex items-center gap-2">
							<CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
							<span>{confirmedNotice}</span>
						</div>
						<span className="text-[11px] font-normal opacity-80">Готово к печати Приложения №1</span>
					</div>
				)}

				{/* Modal Main Body */}
				<main className="treatment-presenter-body">
					{/* TAB 1: 3-Tier Side-by-Side Comparison */}
					{activeTab === "comparison" && (
						<div className="flex flex-col gap-6" data-testid="comparison-view">
							{/* Mobile Tier Tabs (Adaptive switcher for < 768px screens) */}
							<div className="treatment-mobile-tier-bar" data-testid="mobile-tier-tabs">
								{allTiers.map((t) => {
									const isCurrent = selectedTierId === t.tierId;
									return (
										<button
											key={t.tierId}
											type="button"
											onClick={() => handleSelectTier(t)}
											className={"treatment-mobile-tier-btn " + (isCurrent ? "active " : "") + t.tierId}
											data-testid={"mobile-tier-btn-" + t.tierId}
										>
											<span>{t.tierId === "economy" ? "А: Эконом" : t.tierId === "standard" ? "Б: Оптимум" : "В: Премиум"}</span>
											{t.tierId === "standard" && <Sparkles size={11} className="text-amber-500" />}
										</button>
									);
								})}
							</div>

							{/* Chairside Presentation Grid */}
							<div className="treatment-3tier-grid">
								{allTiers.map((tier) => {
									const isSelected = selectedTierId === tier.tierId;
									const isRecommended = tier.tierId === "standard";
									const variantLetter = getTierLetter(tier.tierId);

									return (
										<div
											key={tier.tierId}
											onClick={() => handleSelectTier(tier)}
											className={"treatment-tier-card " + (isSelected ? "selected " : "") + (isRecommended ? "recommended " : "") + "cursor-pointer"}
											data-testid={"tier-card-" + tier.tierId}
										>
											{/* Doctor Recommendation Ribbon */}
											{isRecommended && (
												<div className="treatment-doctor-ribbon" data-testid="doctor-recommendation-badge">
													<Sparkles size={13} />
													<span>Рекомендация врача</span>
												</div>
											)}

											{/* Card Header */}
											<div className="treatment-tier-header">
												<div className="treatment-tier-badge-row">
													<span className={"treatment-tier-badge " + tier.tierId}>{variantLetter}</span>
													{isSelected && (
														<span className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-600 dark:text-teal-400">
															<CheckCircle2 size={14} />
															<span>Выбран</span>
														</span>
													)}
												</div>
												<h3 className="treatment-tier-name">{tier.title}</h3>
												<p className="treatment-tier-desc">{tier.subtitle}</p>

												{/* Price Box */}
												<div className="treatment-tier-price-box">
													<div className="text-[11px] font-bold text-[var(--tp-text-muted)] uppercase tracking-wider">
														Итоговая стоимость
													</div>
													<div className="treatment-tier-total-amount">
														<span>{tier.totalRub.toLocaleString("ru-RU")}</span>
														<span className="treatment-tier-rub-sign">₽</span>
													</div>
													<div className="treatment-tier-finance-chips">
														<div className="treatment-tier-chip-row">
															<span>Рассрочка 0% (12 мес):</span>
															<span className="treatment-tier-chip-highlight">
																{tier.monthlyInstallment12Rub.toLocaleString("ru-RU")} ₽/мес
															</span>
														</div>
														<div className="treatment-tier-chip-row">
															<span>Возврат 13% НДФЛ:</span>
															<span className="font-semibold text-emerald-600 dark:text-emerald-400">
																−{tier.ndflRefundRub.toLocaleString("ru-RU")} ₽
															</span>
														</div>
													</div>
												</div>
											</div>

											{/* Metrics Strip */}
											<div className="treatment-tier-metrics">
												<div className="treatment-metric-item">
													<Clock size={13} />
													<span>Срок:</span>
													<span className="treatment-metric-val">{tier.durationWeeks} нед. ({tier.durationVisits} виз.)</span>
												</div>
												<div className="treatment-metric-item">
													<ShieldCheck size={13} />
													<span>Гарантия:</span>
													<span className="treatment-metric-val">
														{typeof tier.warrantyYears === "number" ? `${tier.warrantyYears} года` : tier.warrantyYears}
													</span>
												</div>
											</div>

											{/* Advantages & Materials */}
											<div className="treatment-tier-advantages">
												<div className="text-[11px] font-bold text-[var(--tp-text-muted)] uppercase tracking-wider">
													Материалы и преимущества:
												</div>
												<p className="text-xs font-semibold text-[var(--tp-text-main)] m-0 leading-snug">
													{tier.materialsHeadline}
												</p>
												<ul className="list-none p-0 m-0 space-y-1.5 mt-1">
													{tier.keyAdvantages.slice(0, 4).map((adv, idx) => (
														<li key={idx} className="treatment-advantage-item">
															<Check size={14} className="treatment-advantage-icon" />
															<span className="text-xs">{adv}</span>
														</li>
													))}
												</ul>
											</div>

											{/* Stages Mini Breakdown */}
											<div className="treatment-tier-stages-strip">
												<div className="text-[10px] font-bold text-[var(--tp-text-muted)] uppercase">
													Смета по этапам лечения:
												</div>
												{tier.stages.map((st) => (
													<div key={st.stageNumber} className="treatment-tier-stage-line">
														<span className="truncate max-w-[170px]">Этап {st.stageNumber}: {st.title.split(":")[1] || st.title}</span>
														<span className="treatment-tier-stage-sum">{st.totalRub.toLocaleString("ru-RU")} ₽</span>
													</div>
												))}
											</div>

											{/* Selection Button */}
											<button
												type="button"
												onClick={(e) => {
													e.stopPropagation();
													handleSelectTier(tier);
												}}
												className="treatment-tier-select-btn cursor-pointer"
												data-testid={"select-tier-btn-" + tier.tierId}
											>
												{isSelected ? (
													<>
														<CheckCircle2 size={16} />
														<span>Вариант выбран</span>
													</>
												) : (
													<span>Выбрать {tier.badge}</span>
												)}
											</button>
										</div>
									);
								})}
							</div>

							{/* Collapsible Stages Accordion for Active Selected Tier */}
							<section className="treatment-stages-accordion-wrap" data-testid="stages-accordion-section">
								<div className="treatment-stages-accordion-header">
									<div className="flex items-center gap-2">
										<Clock className="text-[var(--tp-primary)] w-5 h-5" />
										<div>
											<h4 className="text-sm font-bold text-[var(--tp-text-main)] m-0">
												Клинические этапы плана: {selectedTier.title} ({getTierLetter(selectedTier.tierId)})
											</h4>
											<p className="text-xs text-[var(--tp-text-muted)] m-0">
												Номенклатура медицинских услуг Приказа Минздрава России № 804н и зубы FDI (11–48)
											</p>
										</div>
									</div>

									<div className="flex items-center gap-2">
										<button
											type="button"
											onClick={() => toggleAllStages(true)}
											className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-[var(--tp-surface-soft)] text-[var(--tp-text-muted)] hover:text-[var(--tp-text-main)] border border-[var(--tp-border)] cursor-pointer"
											data-testid="expand-all-stages-btn"
										>
											Развернуть все
										</button>
										<button
											type="button"
											onClick={() => toggleAllStages(false)}
											className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-[var(--tp-surface-soft)] text-[var(--tp-text-muted)] hover:text-[var(--tp-text-main)] border border-[var(--tp-border)] cursor-pointer"
											data-testid="collapse-all-stages-btn"
										>
											Свернуть все
										</button>
									</div>
								</div>

								{/* Stages Accordion List */}
								<div className="flex flex-col gap-3">
									{selectedTier.stages.map((stage) => {
										const isExpanded = Boolean(expandedStages[stage.stageNumber]);

										return (
											<div
												key={stage.stageNumber}
												className="treatment-stage-item"
												data-testid={"stage-item-" + stage.stageNumber}
											>
												{/* Stage Header */}
												<div
													onClick={() => toggleStage(stage.stageNumber)}
													className="treatment-stage-header"
													data-testid={"stage-toggle-" + stage.stageNumber}
												>
													<div className="treatment-stage-title-wrap">
														<div className="treatment-stage-num-badge">{stage.stageNumber}</div>
														<div>
															<h5 className="treatment-stage-name">{stage.title}</h5>
															<p className="treatment-stage-subtitle">{stage.subtitle}</p>
														</div>
													</div>

													<div className="treatment-stage-right-meta">
														<div className="treatment-stage-pill hidden sm:flex">
															<Clock size={13} />
															<span>{stage.estimatedWeeks} нед. ({stage.estimatedVisits} виз.)</span>
														</div>
														<div className="treatment-stage-total-badge">
															{stage.totalRub.toLocaleString("ru-RU")} ₽
														</div>
														<div className="text-[var(--tp-text-muted)]">
															{isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
														</div>
													</div>
												</div>

												{/* Stage Content */}
												{isExpanded && (
													<div className="treatment-stage-table-wrap">
														<table className="treatment-stage-table">
															<thead>
																<tr>
																	<th className="w-10">№</th>
																	<th className="w-28">Код 804н</th>
																	<th className="w-16">Зуб FDI</th>
																	<th>Наименование услуги</th>
																	<th className="w-16 text-center">Кол-во</th>
																	<th className="w-24 text-right">Цена</th>
																	<th className="w-24 text-right">Итого</th>
																</tr>
															</thead>
															<tbody>
																{stage.items.map((item, idx) => (
																	<tr key={item.id || idx}>
																		<td className="text-center font-mono text-[var(--tp-text-muted)]">
																			{idx + 1}
																		</td>
																		<td>
																			<span className="code-804n-badge">{item.code804n}</span>
																		</td>
																		<td className="text-center">
																			{item.toothNumber ? (
																				<span className="tooth-fdi-badge">{item.toothNumber}</span>
																			) : (
																				<span className="text-[var(--tp-text-muted)]">—</span>
																			)}
																		</td>
																		<td>
																			<div className="font-semibold text-[var(--tp-text-main)]">
																				{item.name}
																			</div>
																			{item.clinicalRationale && (
																				<div className="text-[11px] text-[var(--tp-text-muted)] mt-0.5">
																					{item.clinicalRationale}
																				</div>
																			)}
																			{(item.requiresManualPricing || item.priceRub === 0) && (
																				<div className="mt-1">
																					<MissingPriceAlert
																						item={item}
																						onUpdatePrice={handleUpdateItemPrice}
																						variant="inline"
																					/>
																				</div>
																			)}
																		</td>
																		<td className="text-center font-semibold">{item.quantity}</td>
																		<td className="text-right text-[var(--tp-text-muted)]">
																			{item.unitPriceRub.toLocaleString("ru-RU")} ₽
																		</td>
																		<td className={`text-right font-bold ${
																			item.requiresManualPricing || item.priceRub === 0
																				? "text-amber-600 dark:text-amber-400"
																				: "text-[var(--tp-text-main)]"
																		}`}>
																			{item.priceRub.toLocaleString("ru-RU")} ₽
																		</td>
																	</tr>
																))}
															</tbody>
														</table>
													</div>
												)}
											</div>
										);
									})}
								</div>
							</section>
						</div>
					)}

					{/* TAB 2: Detailed Clinical Stages View */}
					{activeTab === "stages" && (
						<div className="flex flex-col gap-4" data-testid="stages-detailed-view">
							<div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--tp-surface)] border border-[var(--tp-border)] flex-wrap gap-3">
								<div>
									<h3 className="text-base font-bold text-[var(--tp-text-main)] m-0">
										Развернутая смета клинических этапов по номенклатуре 804н
									</h3>
									<p className="text-xs text-[var(--tp-text-muted)] m-0">
										Выбранный вариант: <strong>{selectedTier.title}</strong> · Итого по смете:{" "}
										<strong className="text-[var(--tp-primary)]">{selectedTier.totalRub.toLocaleString("ru-RU")} ₽</strong>
									</p>
								</div>
								<div className="flex items-center gap-2">
									{allTiers.map((t) => (
										<button
											key={t.tierId}
											type="button"
											onClick={() => handleSelectTier(t)}
											className={"px-3 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer " + (selectedTierId === t.tierId ? "bg-[var(--tp-primary)] text-white border-[var(--tp-primary)] shadow-sm" : "bg-[var(--tp-bg)] text-[var(--tp-text-muted)] border-[var(--tp-border)] hover:text-[var(--tp-text-main)]")}
										>
											{t.badge}
										</button>
									))}
								</div>
							</div>

							<div className="flex flex-col gap-4">
								{selectedTier.stages.map((st) => (
									<div key={st.stageNumber} className="p-5 rounded-2xl bg-[var(--tp-surface)] border border-[var(--tp-border)]">
										<div className="flex items-center justify-between pb-3 border-b border-[var(--tp-border)] mb-3">
											<div className="flex items-center gap-3">
												<div className="treatment-stage-num-badge">{st.stageNumber}</div>
												<div>
													<h4 className="text-sm font-black text-[var(--tp-text-main)] m-0">{st.title}</h4>
													<p className="text-xs text-[var(--tp-text-muted)] m-0">{st.clinicalGoal}</p>
												</div>
											</div>
											<div className="text-right">
												<div className="text-sm font-black text-[var(--tp-text-main)]">
													{st.totalRub.toLocaleString("ru-RU")} ₽
												</div>
												<div className="text-[11px] text-[var(--tp-text-muted)]">
													{st.estimatedWeeks} нед. · {st.estimatedVisits} визитов
												</div>
											</div>
										</div>

										<div className="treatment-stage-table-wrap p-0">
											<table className="treatment-stage-table">
												<thead>
													<tr>
														<th className="w-10">№</th>
														<th className="w-28">Код 804н</th>
														<th className="w-16">Зуб FDI</th>
														<th>Наименование медицинской услуги</th>
														<th className="w-16 text-center">Кол-во</th>
														<th className="w-24 text-right">Цена</th>
														<th className="w-24 text-right">Стоимость</th>
													</tr>
												</thead>
												<tbody>
													{st.items.map((it, idx) => (
														<tr key={it.id || idx}>
															<td className="text-center font-mono text-[var(--tp-text-muted)]">{idx + 1}</td>
															<td>
																<span className="code-804n-badge">{it.code804n}</span>
															</td>
															<td className="text-center">
																{it.toothNumber ? (
																	<span className="tooth-fdi-badge">{it.toothNumber}</span>
																) : (
																	<span className="text-[var(--tp-text-muted)]">—</span>
																)}</td>
															<td>
																<div className="font-semibold text-[var(--tp-text-main)]">{it.name}</div>
																{it.materials && (
																	<div className="text-[11px] text-teal-700 dark:text-teal-400 mt-0.5">
																		Материал: {it.materials}
																	</div>
																)}
																{(it.requiresManualPricing || it.priceRub === 0) && (
																	<div className="mt-1">
																		<MissingPriceAlert
																			item={it}
																			onUpdatePrice={handleUpdateItemPrice}
																			variant="inline"
																		/>
																	</div>
																)}
															</td>
															<td className="text-center font-semibold">{it.quantity}</td>
															<td className="text-right text-[var(--tp-text-muted)]">
																{it.unitPriceRub.toLocaleString("ru-RU")} ₽
															</td>
															<td className={`text-right font-bold ${
																it.requiresManualPricing || it.priceRub === 0
																	? "text-amber-600 dark:text-amber-400"
																	: "text-[var(--tp-text-main)]"
															}`}>
																{it.priceRub.toLocaleString("ru-RU")} ₽
															</td>
														</tr>
													))}
												</tbody>
											</table>
										</div>
									</div>
								))}
							</div>
						</div>
					)}

					{/* TAB 3: Financial Calculator (Installments 0% & NDFL 13% Refund) */}
					{activeTab === "finance" && (
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6" data-testid="finance-view">
							{/* Installments 0% Box */}
							<div className="p-5 rounded-2xl bg-[var(--tp-surface)] border border-[var(--tp-border)] flex flex-col justify-between gap-4">
								<div>
									<div className="flex items-center gap-2 text-[var(--tp-primary)] mb-2">
										<CreditCard size={20} />
										<h4 className="text-sm font-bold text-[var(--tp-text-main)] m-0">
											Рассрочка 0% без первого взноса и переплат
										</h4>
									</div>
									<p className="text-xs text-[var(--tp-text-muted)] leading-relaxed">
										Оплата лечения равными частями без процентов. Равномерное копеечное распределение.
									</p>

									{/* Months Switcher */}
									<div className="flex items-center gap-2 my-4">
										{([3, 6, 12, 24] as const).map((m) => (
											<button
												key={m}
												type="button"
												onClick={() => setInstallmentMonths(m)}
												className={"flex-1 min-h-[38px] py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer " + (installmentMonths === m ? "bg-[var(--tp-primary)] text-white border-[var(--tp-primary)] shadow-sm" : "bg-[var(--tp-surface-soft)] text-[var(--tp-text-muted)] border-[var(--tp-border)] hover:text-[var(--tp-text-main)]")}
											>
												{m} мес.
											</button>
										))}
									</div>

									<div className="p-4 rounded-xl bg-[var(--tp-bg)] border border-[var(--tp-border)] flex flex-col gap-2">
										<div className="flex items-center justify-between text-xs text-[var(--tp-text-muted)]">
											<span>Сумма плана:</span>
											<span className="font-bold text-[var(--tp-text-main)]">
												{selectedTier.totalRub.toLocaleString("ru-RU")} ₽
											</span>
										</div>
										<div className="flex items-center justify-between text-xs text-[var(--tp-text-muted)]">
											<span>Срок рассрочки:</span>
											<span className="font-bold text-[var(--tp-text-main)]">{installmentMonths} месяцев</span>
										</div>
										<div className="border-t border-[var(--tp-border)] pt-2 flex items-center justify-between">
											<span className="text-xs font-bold text-[var(--tp-text-main)]">Ежемесячный платеж:</span>
											<span className="text-lg font-black text-[var(--tp-primary)]">
												{selectedTier.installments[installmentMonths].monthlyPaymentRub.toLocaleString("ru-RU")} ₽/мес
											</span>
										</div>
									</div>
								</div>

								<div className="text-[11px] text-[var(--tp-text-muted)] bg-[var(--tp-surface-soft)] p-3 rounded-xl border border-[var(--tp-border)]">
									✓ Оформление за 2 минуты у стойки администратора без справок о доходах
								</div>
							</div>

							{/* NDFL 13% Deduction Box */}
							<div className="p-5 rounded-2xl bg-[var(--tp-surface)] border border-[var(--tp-border)] flex flex-col justify-between gap-4">
								<div>
									<div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-2">
										<Percent size={20} />
										<h4 className="text-sm font-bold text-[var(--tp-text-main)] m-0">
											Налоговый вычет 13% НДФЛ (НК РФ)
										</h4>
									</div>
									<p className="text-xs text-[var(--tp-text-muted)] leading-relaxed">
										{selectedTier.ndflDetails.codeDescription}
									</p>

									<div className="p-4 rounded-xl bg-[var(--tp-bg)] border border-[var(--tp-border)] flex flex-col gap-2.5 my-4">
										<div className="flex items-center justify-between text-xs text-[var(--tp-text-muted)]">
											<span>Код услуги в справке:</span>
											<span className="font-mono font-bold text-[var(--tp-text-main)]">
												Код {selectedTier.ndflDetails.code}
											</span>
										</div>
										<div className="flex items-center justify-between text-xs text-[var(--tp-text-muted)]">
											<span>Сумма к возврату 13%:</span>
											<span className="text-base font-black text-emerald-600 dark:text-emerald-400">
												+{selectedTier.ndflRefundRub.toLocaleString("ru-RU")} ₽
											</span>
										</div>
										<div className="border-t border-[var(--tp-border)] pt-2 flex items-center justify-between">
											<span className="text-xs font-bold text-[var(--tp-text-main)]">
												Итоговая стоимость с учетом вычета:
											</span>
											<span className="text-lg font-black text-[var(--tp-text-main)]">
												{selectedTier.priceWithNdflRefundRub.toLocaleString("ru-RU")} ₽
											</span>
										</div>
									</div>
								</div>

								<div className="text-[11px] text-[var(--tp-text-muted)] bg-[var(--tp-surface-soft)] p-3 rounded-xl border border-[var(--tp-border)]">
									✓ Выдаем готовую официальную Справку об оплате медицинских услуг для ФНС (КНД 1151156)
								</div>
							</div>
						</div>
					)}

					{/* TAB 4: Official Contract Appendix #1 Print Sheet (PP RF № 736 & Order 804n) */}
					{activeTab === "print_appendix" && (
						<div className="treatment-appendix-print-doc" data-testid="appendix-print-document">
							{/* Top Print Actions (hidden on print) */}
							<div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-300 no-print">
								<div className="flex items-center gap-2 text-slate-700">
									<FileText size={18} />
									<span className="font-bold text-sm">
										Официальное Приложение №1 к Договору (Постановление Правительства РФ № 736)
									</span>
								</div>
								<button
									type="button"
									onClick={() => window.print()}
									className="btn-treatment-action btn-patient-choice cursor-pointer"
									data-testid="trigger-print-btn"
								>
									<Printer size={16} />
									<span>Распечатать Приложение №1 (A4)</span>
								</button>
							</div>

							{/* Document Header */}
							<div className="treatment-appendix-header">
								<div>Приложение № 1 к Договору № {displayContractNumber}</div>
								<div>на оказание платных медицинских услуг от {todayRu}</div>
								<div className="text-[9pt] text-slate-600 mt-1">
									(В соответствии с Постановлением Правительства РФ от 11.05.2023 № 736)
								</div>
							</div>

							{/* Document Title */}
							<h3 className="treatment-appendix-title">
								СМЕТА И КОМПЛЕКСНЫЙ ПЛАН ЛЕЧЕНИЯ
							</h3>
							<div className="treatment-appendix-subtitle">
								План лечения: <strong>{selectedTier.title} ({getTierLetter(selectedTier.tierId)})</strong>
							</div>

							{/* Parties Grid */}
							<div className="treatment-appendix-parties-grid">
								<div>
									<div className="font-bold border-b border-black pb-1 mb-1">ИСПОЛНИТЕЛЬ (КЛИНИКА):</div>
									<div>{clinicLegalName}</div>
									<div>ИНН: {clinicInn} · ОГРН: {clinicOgrn}</div>
									<div>Адрес: {clinicAddress}</div>
									<div>Лицензия: {clinicLicense}</div>
									<div>Лечащий врач: {doctorFullName} ({doctorSpecialty})</div>
								</div>
								<div>
									<div className="font-bold border-b border-black pb-1 mb-1">ЗАКАЗЧИК (ПАЦИЕНТ):</div>
									<div>ФИО: <strong>{patientName}</strong></div>
									<div>Дата рождения: {patientBirthDate}</div>
									<div>Телефон: {patientPhone}</div>
									<div>Номер медицинской карты: {patientId} (ф. 043/у)</div>
								</div>
							</div>

							{/* Table of Procedures */}
							<table className="treatment-print-table">
								<thead>
									<tr>
										<th style={{ width: "24px" }}>№</th>
										<th style={{ width: "90px" }}>Код по 804н</th>
										<th style={{ width: "45px" }}>Зуб</th>
										<th>Наименование медицинской услуги</th>
										<th style={{ width: "40px" }}>Кол-во</th>
										<th style={{ width: "70px" }}>Цена (руб.)</th>
										<th style={{ width: "70px" }}>Скидка (руб.)</th>
										<th style={{ width: "80px" }}>Стоимость (руб.)</th>
									</tr>
								</thead>
								<tbody>
									{selectedTier.stages.map((stage) => (
										<React.Fragment key={stage.stageNumber}>
											<tr style={{ background: "#e2e8f0", fontWeight: "bold" }}>
												<td colSpan={7}>
													{stage.title} (Срок: {stage.estimatedWeeks} нед., {stage.estimatedVisits} визитов)
												</td>
												<td style={{ textAlign: "right" }}>
													{stage.totalRub.toLocaleString("ru-RU")}
												</td>
											</tr>
											{stage.items.map((it, idx) => (
												<tr key={it.id || idx}>
													<td style={{ textAlign: "center" }}>{idx + 1}</td>
													<td style={{ fontFamily: "monospace", fontSize: "8.5pt" }}>{it.code804n}</td>
													<td style={{ textAlign: "center", fontWeight: "bold" }}>{it.toothNumber || "—"}</td>
													<td>
														<div>{it.name}</div>
														{it.materials && (
															<div style={{ fontSize: "8pt", color: "#475569" }}>
																Материал: {it.materials}
															</div>
														)}
													</td>
													<td style={{ textAlign: "center" }}>{it.quantity}</td>
													<td style={{ textAlign: "right" }}>{it.unitPriceRub.toLocaleString("ru-RU")}</td>
													<td style={{ textAlign: "right" }}>{it.discountRub.toLocaleString("ru-RU")}</td>
													<td style={{ textAlign: "right", fontWeight: "bold" }}>
														{it.priceRub.toLocaleString("ru-RU")}
													</td>
												</tr>
											))}
										</React.Fragment>
									))}
								</tbody>
								<tfoot>
									<tr style={{ fontWeight: "bold", fontSize: "10pt", background: "#f8fafc" }}>
										<td colSpan={7} style={{ textAlign: "right", paddingRight: "8px" }}>
											ИТОГО ПО СМЕТЕ:
										</td>
										<td style={{ textAlign: "right", fontSize: "11pt" }}>
											{selectedTier.totalRub.toLocaleString("ru-RU")} руб. 00 коп.
										</td>
									</tr>
								</tfoot>
							</table>

							{/* Notes & Guarantees */}
							<div style={{ fontSize: "8.5pt", lineHeight: "1.4", marginBottom: "16px" }}>
								<p style={{ margin: "4px 0" }}>
									1. Услуги оказываются в соответствии с клиническими рекомендациями Стоматологической ассоциации России (СтАР) и стандартами медицинской помощи.
								</p>
								<p style={{ margin: "4px 0" }}>
									2. Гарантийный срок на ортопедические конструкции и пломбировочные материалы составляет <strong>{selectedTier.warrantyYears} лет</strong> при условии соблюдения пациентом правил гигиены и прохождения контрольных осмотров каждые 6 месяцев.
								</p>
								<p style={{ margin: "4px 0" }}>
									3. Заказчик уведомлен о праве на получение социального налогового вычета по НДФЛ в размере 13% от стоимости лечения (Код {selectedTier.ndflDetails.code}).
								</p>
							</div>

							{/* Signatures */}
							<div className="treatment-print-signatures">
								<div>
									<div className="font-bold">Исполнитель (Врач):</div>
									<div className="treatment-sig-box">
										<div>_____________________ / {doctorFullName} /</div>
										<div className="text-[8pt] text-slate-500 mt-1">подпись, расшифровка, М.П.</div>
									</div>
								</div>
								<div>
									<div className="font-bold">Заказчик (Пациент):</div>
									<div className="treatment-sig-box">
										<div>_____________________ / {patientName} /</div>
										<div className="text-[8pt] text-slate-500 mt-1">
											С планом лечения, этапами, сроками и сметой ознакомлен и согласен
										</div>
									</div>
								</div>
							</div>
						</div>
					)}
				</main>

				{/* Sticky Bottom Action Footer */}
				<footer className="treatment-presenter-footer no-print">
					<div className="treatment-footer-summary">
						<div className="treatment-footer-price-col">
							<span className="treatment-footer-label">
								Текущий выбор: <strong>{getTierLetter(selectedTier.tierId)}</strong>
							</span>
							<span className="treatment-footer-amount">
								{selectedTier.totalRub.toLocaleString("ru-RU")} ₽
							</span>
						</div>
					</div>

					<div className="treatment-footer-actions">
						{/* Print Appendix 1 Action */}
						<button
							type="button"
							onClick={handlePrintAppendix}
							className="btn-treatment-action btn-treatment-print cursor-pointer"
							data-testid="print-contract-btn"
						>
							<Printer size={16} />
							<span>Печать Приложения №1 (ПП РФ № 736)</span>
						</button>

						{/* Fixate Patient Choice Action */}
						<button
							type="button"
							onClick={handleConfirmPatientChoice}
							className="btn-treatment-action btn-patient-choice cursor-pointer"
							data-testid="confirm-patient-choice-btn"
						>
							{selectionConfirmed ? (
								<>
									<CheckCircle2 size={18} />
									<span>{choiceConfirmedBtnText}</span>
								</>
							) : (
								<>
									<Check size={18} />
									<span>{patientChoiceBtnText}</span>
								</>
							)}
						</button>
					</div>
				</footer>
			</div>
		</div>
	);
};
