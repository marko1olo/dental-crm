/**
 * TreatmentPlan3TierComparison.tsx — Side-by-side сравнительная презентация 3 вариантов плана лечения (Эконом, Оптимум, Премиум).
 *
 * ВОЗМОЖНОСТИ:
 * 1. Интерактивное визуальное сравнение 3 вариантов для пациента с разбивкой по этапам, материалам и срокам.
 * 2. Калькулятор поэтапной оплаты (30/40/30) и рассрочки 0% без переплат (3, 6, 12, 24 мес).
 * 3. Расчет налогового вычета 13% НДФЛ (Код 01 / Код 02) и скидки 5% при единовременной оплате.
 * 4. Дифференциальный анализ долговечности, гарантий и стоимости за 1 год службы.
 * 5. Жестко зафиксированный подвал (sticky bottom-0 bg-[var(--paper-soft)] border-t) с кнопками «Утвердить план», «Рассрочка», «Печать договора».
 * 6. Изолированный скроллинг номенклатуры 804н и этапов внутри контейнера карточки.
 */

import React, { useState } from "react";
import {
	Calendar,
	CheckCircle2,
	ChevronDown,
	ChevronUp,
	Clock,
	Coins,
	CreditCard,
	Crown,
	FileCheck,
	FileText,
	Layers,
	PenTool,
	Percent,
	Printer,
	Shield,
	ShieldCheck,
	Sparkles,
	Star,
} from "lucide-react";
import type { TreatmentPlanStage, TreatmentPlanTier, TreatmentPlanTierId } from "./types";

export interface TreatmentPlan3TierComparisonProps {
	readonly tiers: readonly TreatmentPlanTier[];
	readonly selectedTierId?: TreatmentPlanTierId;
	readonly onSelectTier?: (tier: TreatmentPlanTier) => void;
	readonly onApproveAndSign?: (tier: TreatmentPlanTier) => void;
	readonly onOpenComparatorStudio?: () => void;
	readonly onOpenStagePaymentStudio?: () => void;
	readonly onOpenPriceValidatorStudio?: () => void;
	readonly onOpenInstallment?: (tier: TreatmentPlanTier) => void;
	readonly onPrintContract?: (tier: TreatmentPlanTier) => void;
	readonly className?: string;
}

export const TreatmentPlan3TierComparison: React.FC<TreatmentPlan3TierComparisonProps> = ({
	tiers,
	selectedTierId = "optimum",
	onSelectTier,
	onApproveAndSign,
	onOpenComparatorStudio,
	onOpenStagePaymentStudio,
	onOpenPriceValidatorStudio,
	onOpenInstallment,
	onPrintContract,
	className = "",
}) => {
	const [activeTierId, setActiveTierId] = useState<TreatmentPlanTierId>(selectedTierId);
	const [installmentMonths, setInstallmentMonths] = useState<3 | 6 | 12 | 24>(12);
	const [showNdflBreakdown, setShowNdflBreakdown] = useState<boolean>(true);
	const [expandedStagesTierId, setExpandedStagesTierId] = useState<TreatmentPlanTierId | null>("optimum");
	const [activePaymentMode, setActivePaymentMode] = useState<"installment" | "staged" | "discount">("installment");

	const handleCardClick = (tier: TreatmentPlanTier) => {
		setActiveTierId(tier.tierId);
		onSelectTier?.(tier);
	};

	const handleSignClick = (e: React.MouseEvent, tier: TreatmentPlanTier) => {
		e.stopPropagation();
		setActiveTierId(tier.tierId);
		onApproveAndSign?.(tier);
	};

	const handleInstallmentClick = (e: React.MouseEvent, tier: TreatmentPlanTier) => {
		e.stopPropagation();
		setActiveTierId(tier.tierId);
		if (onOpenInstallment) {
			onOpenInstallment(tier);
		} else {
			setActivePaymentMode("installment");
		}
	};

	const handlePrintClick = (e: React.MouseEvent, tier: TreatmentPlanTier) => {
		e.stopPropagation();
		setActiveTierId(tier.tierId);
		onPrintContract?.(tier);
	};

	const toggleStagesExpand = (e: React.MouseEvent, tierId: TreatmentPlanTierId) => {
		e.stopPropagation();
		setExpandedStagesTierId((prev) => (prev === tierId ? null : tierId));
	};

	return (
		<div
			className={`treatment-3tier-comparison flex flex-col gap-4 sm:gap-6 w-full ${className}`.trim()}
			data-testid="treatment-3tier-comparison"
		>
			{/* Top Control Bar: Installments, Modes & Studio Triggers */}
			<div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-3xl bg-[var(--paper-soft,var(--paper,#ffffff))] border border-[var(--border,#cbd5e1)] text-xs text-[var(--ink,#0f172a)] shadow-xs">
				<div className="flex items-center gap-3 min-w-0">
					<div className="p-2 sm:p-2.5 rounded-2xl bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal,var(--brand-primary))] border border-[var(--teal,var(--brand-primary))]/20 shrink-0">
						<Sparkles size={18} />
					</div>
					<div className="min-w-0">
						<div className="flex items-center gap-2 flex-wrap">
							<span className="font-black text-xs sm:text-sm text-[var(--ink,#0f172a)] truncate">
								3-Tier Сравнение планов (Эконом / Оптимум / Премиум)
							</span>
							<span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/20 whitespace-nowrap">
								СтАР & 804н
							</span>
						</div>
						<p className="text-[11px] text-[var(--muted,#64748b)] m-0 mt-0.5 truncate max-w-xl">
							Интерактивное сравнение клинических этапов, сроков, гарантий и программ оплаты 0%
						</p>
					</div>
				</div>

				<div className="flex flex-wrap items-center gap-2">
					{/* Payment Mode Selector with 32px height buttons */}
					<div className="inline-flex items-center p-0.5 rounded-xl bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--border,#cbd5e1)]">
						<button
							type="button"
							onClick={() => setActivePaymentMode("installment")}
							className={`min-h-[32px] h-8 px-2.5 sm:px-3 rounded-lg font-bold text-xs transition-all cursor-pointer ${
								activePaymentMode === "installment"
									? "bg-[var(--teal,var(--brand-primary))] text-white shadow-xs"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
							}`}
						>
							Рассрочка 0%
						</button>
						<button
							type="button"
							onClick={() => setActivePaymentMode("staged")}
							className={`min-h-[32px] h-8 px-2.5 sm:px-3 rounded-lg font-bold text-xs transition-all cursor-pointer ${
								activePaymentMode === "staged"
									? "bg-[var(--teal,var(--brand-primary))] text-white shadow-xs"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
							}`}
						>
							Этапы (30/40/30)
						</button>
						<button
							type="button"
							onClick={() => setActivePaymentMode("discount")}
							className={`min-h-[32px] h-8 px-2.5 sm:px-3 rounded-lg font-bold text-xs transition-all cursor-pointer ${
								activePaymentMode === "discount"
									? "bg-[var(--teal,var(--brand-primary))] text-white shadow-xs"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
							}`}
						>
							Скидка 5% (100%)
						</button>
					</div>

					{/* Term Selector (when in installment mode) */}
					{activePaymentMode === "installment" && (
						<div className="flex items-center gap-1 bg-[var(--paper-strong,var(--paper,#ffffff))] p-0.5 rounded-xl border border-[var(--border,#cbd5e1)]">
							{[3, 6, 12, 24].map((m) => (
								<button
									key={m}
									type="button"
									onClick={() => setInstallmentMonths(m as 3 | 6 | 12 | 24)}
									className={`min-h-[32px] h-8 px-2.5 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer ${
										installmentMonths === m
											? "bg-[var(--teal,var(--brand-primary))] text-white shadow-xs"
											: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
									}`}
								>
									{m}м
								</button>
							))}
						</div>
					)}

					{/* NDFL Toggle - 32px height */}
					<button
						type="button"
						onClick={() => setShowNdflBreakdown((prev) => !prev)}
						className={`min-h-[32px] h-8 flex items-center gap-1.5 px-2.5 sm:px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
							showNdflBreakdown
								? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
								: "bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--muted,#64748b)] border-[var(--border,#cbd5e1)]"
						}`}
						title="Показать расчет налогового вычета 13% по НК РФ"
					>
						<ShieldCheck size={14} />
						<span>Вычет 13% НДФЛ</span>
					</button>

					{/* Comparator Studio Modal Button - 32px height */}
					{onOpenComparatorStudio && (
						<button
							type="button"
							onClick={onOpenComparatorStudio}
							className="min-h-[32px] h-8 flex items-center gap-1 px-2.5 sm:px-3 rounded-xl text-xs font-bold text-[var(--ink,#0f172a)] bg-[var(--paper-strong,var(--paper,#ffffff))] hover:bg-slate-100 dark:hover:bg-slate-800 border border-[var(--border,#cbd5e1)] cursor-pointer transition-colors"
							title="Открыть полноэкранную презентационную студию сравнения"
						>
							<Sparkles size={13} className="text-[var(--teal,var(--brand-primary))]" />
							<span>Студия 3-Tier</span>
						</button>
					)}

					{/* Stage Payment Modal Button - 32px height */}
					{onOpenStagePaymentStudio && (
						<button
							type="button"
							onClick={onOpenStagePaymentStudio}
							className="min-h-[32px] h-8 flex items-center gap-1 px-2.5 sm:px-3 rounded-xl text-xs font-bold text-[var(--ink,#0f172a)] bg-[var(--paper-strong,var(--paper,#ffffff))] hover:bg-slate-100 dark:hover:bg-slate-800 border border-[var(--border,#cbd5e1)] cursor-pointer transition-colors"
							title="Открыть студию поэтапной оплаты и эскроу-депозитов"
						>
							<Coins size={13} className="text-amber-500" />
							<span>Эскроу & Этапы</span>
						</button>
					)}

					{/* Price Validator Modal Button - 32px height */}
					{onOpenPriceValidatorStudio && (
						<button
							type="button"
							onClick={onOpenPriceValidatorStudio}
							className="min-h-[32px] h-8 flex items-center gap-1 px-2.5 sm:px-3 rounded-xl text-xs font-bold text-[var(--ink,#0f172a)] bg-[var(--paper-strong,var(--paper,#ffffff))] hover:bg-slate-100 dark:hover:bg-slate-800 border border-[var(--border,#cbd5e1)] cursor-pointer transition-colors"
							title="Проверить цены по прайсу и протоколам СтАР"
						>
							<FileCheck size={13} className="text-emerald-600" />
							<span>Валидация СтАР</span>
						</button>
					)}
				</div>
			</div>

			{/* 3-Tier Grid Layout - Optimized for 1440px desktop and 390px mobile */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 items-stretch">
				{tiers.map((tier) => {
					const isSelected = activeTierId === tier.tierId;
					const isExpandedStages = expandedStagesTierId === tier.tierId;

					// Financial Calculations in whole rubles
					const monthlyPayment =
						tier.installments?.[installmentMonths]?.monthlyPaymentRub ??
						Math.round(tier.totalRub / installmentMonths || 0);

					const discount5PctAmount = Math.round(tier.totalRub * 0.05);
					const priceWith5PctDiscount = Math.max(0, tier.totalRub - discount5PctAmount);

					// Staged 30/40/30
					const stage1Rub = Math.round(tier.totalRub * 0.3);
					const stage2Rub = Math.round(tier.totalRub * 0.4);
					const stage3Rub = tier.totalRub - stage1Rub - stage2Rub;

					return (
						<div
							key={tier.tierId}
							onClick={() => handleCardClick(tier)}
							className={`relative flex flex-col justify-between rounded-3xl p-4 sm:p-5 border transition-all duration-200 cursor-pointer bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] h-full flex-1 overflow-hidden ${
								isSelected
									? `${tier.borderClass} shadow-xl ring-2 ring-[var(--teal,var(--brand-primary))]/20 z-10`
									: "border-[var(--border,#cbd5e1)] opacity-95 hover:opacity-100 hover:border-slate-400 shadow-md"
							}`}
							data-testid={`tier-card-${tier.tierId}`}
						>
							{/* Recommended Pill */}
							{tier.isRecommended && (
								<div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 px-3.5 py-0.5 rounded-full bg-gradient-to-r from-teal-600 to-emerald-600 text-white text-[11px] font-black shadow-md uppercase tracking-wider whitespace-nowrap z-20">
									<Crown size={12} />
									<span>{tier.badge}</span>
								</div>
							)}

							{/* Card Header */}
							<div className="space-y-1.5 pt-1">
								<div className="flex items-center justify-between gap-2">
									<span
										className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border whitespace-nowrap ${tier.badgeClass}`}
									>
										{tier.title.split("(")[0]?.trim()}
									</span>

									<span className="text-xs font-semibold text-[var(--muted,#64748b)] flex items-center gap-1 whitespace-nowrap">
										<Clock size={12} /> {tier.durationWeeks} нед. · {tier.durationVisits} виз.
									</span>
								</div>

								<h3 className="text-base font-extrabold text-[var(--ink,#0f172a)] leading-snug m-0">
									{tier.title}
								</h3>
								<p className="text-xs text-[var(--muted,#64748b)] line-clamp-2 m-0">
									{tier.subtitle}
								</p>
							</div>

							{/* Scrollable Card Body: isolated scrolling for stages and materials */}
							<div className="flex-1 overflow-y-auto min-h-0 pr-1 space-y-2.5 my-3 overscroll-contain max-h-[500px] sm:max-h-[560px]">
								{/* Flat Pricing Section */}
								<div className="p-3 rounded-xl bg-[var(--paper-soft,#f8fafc)] space-y-1.5 border border-[var(--border,#cbd5e1)]/50">
									<div className="flex items-baseline justify-between gap-2">
										<span className="text-xs text-[var(--muted,#64748b)] font-medium">
											Полная стоимость:
										</span>
										<span className="text-lg sm:text-xl font-black text-[var(--ink,#0f172a)] font-mono whitespace-nowrap">
											{tier.totalRub.toLocaleString("ru-RU")} ₽
										</span>
									</div>

									{/* Mode 1: Installment 0% */}
									{activePaymentMode === "installment" && (
										<div className="flex items-center justify-between text-xs pt-1.5 border-t border-[var(--border,#cbd5e1)]/50 gap-2">
											<span className="text-[var(--muted,#64748b)] flex items-center gap-1">
												<Percent size={12} className="text-[var(--teal,var(--brand-primary))]" />
												Рассрочка {installmentMonths} мес:
											</span>
											<span className="font-bold text-[var(--teal,var(--brand-primary))] font-mono whitespace-nowrap">
												{monthlyPayment.toLocaleString("ru-RU")} ₽/мес
											</span>
										</div>
									)}

									{/* Mode 2: Staged Payment (30/40/30) */}
									{activePaymentMode === "staged" && (
										<div className="space-y-1 text-[11px] pt-1.5 border-t border-[var(--border,#cbd5e1)]/50">
											<div className="flex justify-between text-[var(--muted,#64748b)] gap-2">
												<span>1. Аванс/Санация (30%):</span>
												<strong className="font-mono text-[var(--ink,#0f172a)] whitespace-nowrap">
													{stage1Rub.toLocaleString("ru-RU")} ₽
												</strong>
											</div>
											<div className="flex justify-between text-[var(--muted,#64748b)] gap-2">
												<span>2. Хирургия/Имплант (40%):</span>
												<strong className="font-mono text-[var(--ink,#0f172a)] whitespace-nowrap">
													{stage2Rub.toLocaleString("ru-RU")} ₽
												</strong>
											</div>
											<div className="flex justify-between text-[var(--muted,#64748b)] gap-2">
												<span>3. Ортопедия (30%):</span>
												<strong className="font-mono text-[var(--ink,#0f172a)] whitespace-nowrap">
													{stage3Rub.toLocaleString("ru-RU")} ₽
												</strong>
											</div>
										</div>
									)}

									{/* Mode 3: 5% Single Payment Discount */}
									{activePaymentMode === "discount" && (
										<div className="space-y-1 text-[11px] pt-1.5 border-t border-[var(--border,#cbd5e1)]/50">
											<div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold gap-2">
												<span>Скидка 5% за 100% оплату:</span>
												<span className="font-mono whitespace-nowrap">
													-{discount5PctAmount.toLocaleString("ru-RU")} ₽
												</span>
											</div>
											<div className="flex justify-between text-slate-800 dark:text-slate-200 font-bold gap-2">
												<span>Итого со скидкой:</span>
												<span className="font-mono text-[var(--teal,var(--brand-primary))] whitespace-nowrap">
													{priceWith5PctDiscount.toLocaleString("ru-RU")} ₽
												</span>
											</div>
										</div>
									)}

									{/* NDFL Deduction box */}
									{showNdflBreakdown && tier.ndflRefundRub > 0 && (
										<div
											className="pt-1.5 border-t border-[var(--border,#cbd5e1)]/50 text-[11px] text-emerald-800 dark:text-emerald-300 space-y-0.5"
											title={tier.ndflDetails?.codeDescription || "Налоговый вычет по НК РФ"}
										>
											<div className="flex items-center justify-between font-semibold gap-2">
												<span className="flex items-center gap-1">
													<span>Возврат 13% НДФЛ:</span>
													<span className="text-[9px] px-1 py-0.2 rounded bg-emerald-600 text-white font-mono font-bold">
														{tier.ndflDetails?.code === "02" ? "Код 02" : "Код 01"}
													</span>
												</span>
												<span className="font-mono font-bold whitespace-nowrap">
													+{tier.ndflRefundRub.toLocaleString("ru-RU")} ₽
												</span>
											</div>
											<div className="flex justify-between text-[10px] text-emerald-700 dark:text-emerald-400 gap-2">
												<span>С учетом возврата:</span>
												<span className="font-bold font-mono whitespace-nowrap">
													{tier.priceWithNdflRefundRub.toLocaleString("ru-RU")} ₽
												</span>
											</div>
										</div>
									)}
								</div>

								{/* Flat Warranty & Visits Strip */}
								<div className="grid grid-cols-2 gap-2 text-xs py-1">
									<div className="flex flex-col justify-between">
										<span className="text-[10px] text-[var(--muted,#64748b)] flex items-center gap-1">
											<Shield size={11} /> Гарантия клиники
										</span>
										<strong className="text-[11px] text-[var(--ink,#0f172a)] truncate mt-0.5">
											{typeof tier.warrantyYears === "number"
												? `${tier.warrantyYears} года`
												: tier.warrantyYears}
										</strong>
									</div>

									<div className="flex flex-col justify-between">
										<span className="text-[10px] text-[var(--muted,#64748b)] flex items-center gap-1">
											<Calendar size={11} /> Сроки & Визиты
										</span>
										<strong className="text-[11px] text-[var(--ink,#0f172a)] mt-0.5">
											{tier.durationVisits} виз. ({tier.durationWeeks} нед.)
										</strong>
									</div>
								</div>

								{/* Stages Breakdown Accordion Toggle */}
								<div className="pt-1.5 border-t border-[var(--border,#cbd5e1)]/60">
									<button
										type="button"
										onClick={(e) => toggleStagesExpand(e, tier.tierId)}
										className="w-full min-h-[32px] flex items-center justify-between text-xs font-bold text-[var(--ink,#0f172a)] hover:text-[var(--teal,var(--brand-primary))] cursor-pointer py-1"
									>
										<span className="flex items-center gap-1.5">
											<Layers size={13} className="text-[var(--teal,var(--brand-primary))]" />
											<span>Клинические этапы I, II, III ({tier.stages.length})</span>
										</span>
										{isExpandedStages ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
									</button>

									{/* Expanded Stages Content - Flat List without nested card box */}
									{isExpandedStages && (
										<div className="mt-1.5 max-h-56 overflow-y-auto min-h-0 divide-y divide-[var(--border,#cbd5e1)]/50 text-[11px] bg-[var(--paper-soft,#f8fafc)] p-2 rounded-xl">
											{tier.stages.map((stg) => (
												<div
													key={stg.stageNumber}
													className="py-1.5 first:pt-0 last:pb-0 space-y-0.5"
												>
													<div className="flex justify-between items-center font-bold gap-2">
														<span className="text-[var(--teal-dark,var(--teal))] truncate">
															Этап {stg.stageNumber}: {stg.title.split(":")[1]?.trim() || stg.title}
														</span>
														<span className="font-mono text-slate-900 dark:text-slate-100 whitespace-nowrap">
															{stg.totalRub.toLocaleString("ru-RU")} ₽
														</span>
													</div>
													<p className="text-[10px] text-[var(--muted,#64748b)] m-0">
														{stg.clinicalGoal} · ~{stg.estimatedWeeks} нед. ({stg.estimatedVisits} виз.)
													</p>
													{stg.items.length > 0 && (
														<ul className="max-h-24 overflow-y-auto min-h-0 text-[9px] text-[var(--muted,#64748b)] space-y-0.5 pl-1.5 border-l border-[var(--teal,var(--brand-primary))]/30 m-0 list-none mt-1">
															{stg.items.slice(0, 4).map((it) => (
																<li key={it.id} className="truncate">
																	• {it.toothNumber ? `Зуб ${it.toothNumber}: ` : ""}{it.name}
																</li>
															))}
															{stg.items.length > 4 && (
																<li className="italic text-[var(--teal,var(--brand-primary))]">
																	+ еще {stg.items.length - 4} процедур
																</li>
															)}
														</ul>
													)}
												</div>
											))}
										</div>
									)}
								</div>

								{/* Materials & Technologies Highlights */}
								<div className="space-y-1.5 pt-1.5 border-t border-[var(--border,#cbd5e1)]/60">
									<h4 className="text-xs font-bold text-[var(--ink,#0f172a)] flex items-center gap-1.5 m-0">
										<Sparkles size={13} className="text-[var(--teal,var(--brand-primary))]" />
										<span>Материалы и технологии</span>
									</h4>
									<ul className="space-y-1 text-xs text-[var(--muted,#64748b)] m-0 list-none p-0">
										{tier.materialsList.map((mat, i) => (
											<li key={i} className="flex items-start gap-2 text-[11px] leading-tight">
												<CheckCircle2
													size={13}
													className="text-emerald-500 shrink-0 mt-0.5"
												/>
												<span className="text-[var(--ink,#0f172a)]">{mat}</span>
											</li>
										))}
									</ul>
								</div>

								{/* Key Patient Advantages */}
								<div className="space-y-1 pt-1.5 border-t border-[var(--border,#cbd5e1)]/60">
									<h4 className="text-xs font-bold text-[var(--ink,#0f172a)] flex items-center gap-1.5 m-0">
										<Star size={13} className="text-amber-500" />
										<span>Преимущества для пациента</span>
									</h4>
									<ul className="space-y-0.5 text-[11px] text-[var(--muted,#64748b)] m-0 list-none p-0">
										{tier.keyAdvantages.map((adv, idx) => (
											<li key={idx} className="flex items-start gap-1.5">
												<span className="text-amber-500 font-bold">•</span>
												<span>{adv}</span>
											</li>
										))}
									</ul>
								</div>
							</div>

							{/* Actions Bottom: Sticky Fixed Footer at Card Bottom */}
							<div className="sticky bottom-0 bg-[var(--paper-soft,var(--paper,#ffffff))] border-t border-[var(--border,#cbd5e1)] p-3 -mx-4 sm:-mx-5 -mb-4 sm:-mb-5 rounded-b-3xl mt-auto z-10 space-y-1.5 shadow-xs shrink-0 max-h-[30vh] overflow-y-auto">
								<button
									type="button"
									onClick={(e) => handleSignClick(e, tier)}
									className={`w-full min-h-[34px] h-[34px] flex items-center justify-center gap-1.5 px-3 rounded-xl text-xs font-extrabold shadow-sm cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 active:scale-98 ${
										isSelected
											? "bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-emerald-600/20"
											: "bg-[var(--paper-strong,#ffffff)] hover:bg-[var(--paper-soft)] text-[var(--ink,#0f172a)] border border-[var(--border,#cbd5e1)]"
									}`}
									data-testid={`approve-tier-btn-${tier.tierId}`}
								>
									<PenTool size={14} />
									<span>Утвердить и подписать план</span>
								</button>

								{/* Secondary Action Strip with 32px Buttons */}
								<div className="grid grid-cols-2 gap-1.5">
									<button
										type="button"
										onClick={(e) => handleInstallmentClick(e, tier)}
										className="min-h-[32px] h-8 flex items-center justify-center gap-1 px-2 rounded-lg text-[11px] font-bold bg-[var(--paper-strong,#ffffff)] hover:bg-[var(--paper-soft)] text-[var(--ink,#0f172a)] border border-[var(--border,#cbd5e1)] cursor-pointer transition-colors"
										title="Оформить рассрочку 0% по данному варианту"
									>
										<CreditCard size={12} className="text-[var(--teal,var(--brand-primary))]" />
										<span className="truncate">Рассрочка 0%</span>
									</button>

									{onPrintContract ? (
										<button
											type="button"
											onClick={(e) => handlePrintClick(e, tier)}
											className="min-h-[32px] h-8 flex items-center justify-center gap-1 px-2 rounded-lg text-[11px] font-bold bg-[var(--paper-strong,#ffffff)] hover:bg-[var(--paper-soft)] text-[var(--ink,#0f172a)] border border-[var(--border,#cbd5e1)] cursor-pointer transition-colors"
											title="Распечатать договор и смету"
										>
											<Printer size={12} />
											<span className="truncate">Договор (QR)</span>
										</button>
									) : (
										<button
											type="button"
											onClick={() => handleCardClick(tier)}
											className="min-h-[32px] h-8 flex items-center justify-center gap-1 px-2 rounded-lg text-[11px] font-bold bg-[var(--paper-strong,#ffffff)] hover:bg-[var(--paper-soft)] text-[var(--ink,#0f172a)] border border-[var(--border,#cbd5e1)] cursor-pointer transition-colors"
											title="Выбрать данный вариант"
										>
											<CheckCircle2 size={12} className="text-emerald-500" />
											<span className="truncate">{isSelected ? "Выбран" : "Выбрать"}</span>
										</button>
									)}
								</div>
							</div>
						</div>
					);
				})}
			</div>

			{/* Bottom Block: Clinical Treatment Roadmap (Anti-Matryoshka Seamless Flat 4-Column Grid) */}
			{(() => {
				const activeTier = tiers.find((t) => t.tierId === activeTierId) ?? tiers[1] ?? tiers[0];
				if (!activeTier || !activeTier.stages || activeTier.stages.length === 0) return null;

				return (
					<section className="p-4 sm:p-5 rounded-3xl bg-[var(--paper-soft,var(--paper,#ffffff))] border border-[var(--border,#cbd5e1)] text-[var(--ink,#0f172a)] shadow-xs space-y-3">
						<div className="flex items-center justify-between gap-3 flex-wrap">
							<h4 className="text-xs sm:text-sm font-extrabold text-[var(--ink,#0f172a)] flex items-center gap-2 m-0">
								<Clock size={16} className="text-[var(--teal,var(--brand-primary))]" />
								<span>
									Клинический маршрут лечения: {activeTier.title} ({activeTier.durationWeeks} нед. · {activeTier.durationVisits} виз.)
								</span>
							</h4>
							<span className="text-xs font-mono font-bold text-[var(--teal,var(--brand-primary))]">
								Итого по маршруту: {activeTier.totalRub.toLocaleString("ru-RU")} ₽
							</span>
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-700 bg-[var(--paper-strong,var(--paper,#ffffff))] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
							{activeTier.stages.map((stg) => (
								<div key={stg.stageNumber} className="p-3 sm:p-3.5 space-y-2">
									<div className="flex items-center justify-between gap-2">
										<span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal-dark,var(--teal))] border border-[var(--teal,var(--brand-primary))]/20">
											Этап {stg.stageNumber}
										</span>
										<span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
											{stg.totalRub.toLocaleString("ru-RU")} ₽
										</span>
									</div>

									<div>
										<h5 className="font-bold text-xs text-[var(--ink,#0f172a)] m-0 leading-snug">
											{stg.title.split(":")[1]?.trim() || stg.title}
										</h5>
										<p className="text-[10px] text-[var(--muted,#64748b)] m-0 mt-0.5">
											{stg.clinicalGoal} · ~{stg.estimatedWeeks} нед. ({stg.estimatedVisits} виз.)
										</p>
									</div>

									{stg.items && stg.items.length > 0 && (
										<ul className="max-h-28 overflow-y-auto min-h-0 text-[10px] text-[var(--muted,#64748b)] space-y-1 pl-1.5 border-l-2 border-[var(--teal,var(--brand-primary))]/30 m-0 list-none">
											{stg.items.map((it) => (
												<li key={it.id} className="truncate">
													• {it.toothNumber ? `Зуб ${it.toothNumber}: ` : ""}{it.name}
												</li>
											))}
										</ul>
									)}
								</div>
							))}
						</div>
					</section>
				);
			})()}
		</div>
	);
};

export default TreatmentPlan3TierComparison;
