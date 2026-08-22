/**
 * TreatmentPlan3TierComparison.tsx — Side-by-side сравнительная презентация 3 вариантов плана лечения (Эконом, Оптимум, Премиум).
 *
 * ВОЗМОЖНОСТИ:
 * 1. Интерактивное визуальное сравнение 3 вариантов для пациента с разбивкой по этапам, материалам и срокам.
 * 2. Калькулятор поэтапной оплаты (30/40/30) и рассрочки 0% без переплат (3, 6, 12, 24 мес).
 * 3. Расчет налогового вычета 13% НДФЛ (Код 01 / Код 02) и скидки 5% при единовременной оплате.
 * 4. Дифференциальный анализ долговечности, гарантий и стоимости за 1 год службы.
 */

import React, { useState, useMemo } from "react";
import {
	Award,
	Calendar,
	Check,
	CheckCircle2,
	ChevronDown,
	ChevronUp,
	Clock,
	Coins,
	CreditCard,
	Crown,
	FileCheck,
	FileText,
	HeartPulse,
	HelpCircle,
	Info,
	Layers,
	Lock,
	Percent,
	PenTool,
	Shield,
	ShieldCheck,
	Sparkles,
	Star,
	TrendingUp,
	Wallet,
	Zap,
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

	const toggleStagesExpand = (e: React.MouseEvent, tierId: TreatmentPlanTierId) => {
		e.stopPropagation();
		setExpandedStagesTierId((prev) => (prev === tierId ? null : tierId));
	};

	return (
		<div
			className={`treatment-3tier-comparison flex flex-col gap-6 w-full ${className}`.trim()}
			data-testid="treatment-3tier-comparison"
		>
			{/* Top Control Bar: Installments, Modes & Studio Triggers */}
			<div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-4 rounded-3xl bg-[var(--paper-soft,var(--paper,#ffffff))] border border-[var(--border,#cbd5e1)] text-xs text-[var(--ink,#0f172a)] shadow-xs">
				<div className="flex items-center gap-3">
					<div className="p-2.5 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
						<Sparkles size={18} />
					</div>
					<div>
						<div className="flex items-center gap-2">
							<span className="font-black text-sm text-[var(--ink,#0f172a)]">
								3-Tier Компаратор планов (Эконом / Оптимум / Премиум)
							</span>
							<span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/20">
								СтАР & 804н
							</span>
						</div>
						<p className="text-[11px] text-[var(--muted,#64748b)]">
							Интерактивное сравнение клинических этапов, сроков, гарантий и программ оплаты 0%
						</p>
					</div>
				</div>

				<div className="flex flex-wrap items-center gap-2">
					{/* Payment Mode Selector */}
					<div className="inline-flex items-center p-1 rounded-xl bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--border,#cbd5e1)]">
						<button
							type="button"
							onClick={() => setActivePaymentMode("installment")}
							className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
								activePaymentMode === "installment"
									? "bg-teal-600 text-white shadow-xs"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
							}`}
						>
							Рассрочка 0%
						</button>
						<button
							type="button"
							onClick={() => setActivePaymentMode("staged")}
							className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
								activePaymentMode === "staged"
									? "bg-teal-600 text-white shadow-xs"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
							}`}
						>
							Поэтапная (30/40/30)
						</button>
						<button
							type="button"
							onClick={() => setActivePaymentMode("discount")}
							className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
								activePaymentMode === "discount"
									? "bg-teal-600 text-white shadow-xs"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
							}`}
						>
							Скидка 5% (100%)
						</button>
					</div>

					{/* Term Selector (when in installment mode) */}
					{activePaymentMode === "installment" && (
						<div className="flex items-center gap-1 bg-[var(--paper-strong,var(--paper,#ffffff))] px-2 py-1 rounded-xl border border-[var(--border,#cbd5e1)]">
							{[3, 6, 12, 24].map((m) => (
								<button
									key={m}
									type="button"
									onClick={() => setInstallmentMonths(m as 3 | 6 | 12 | 24)}
									className={`px-2 py-0.5 rounded-md font-mono text-xs font-bold transition-all cursor-pointer ${
										installmentMonths === m
											? "bg-teal-600 text-white shadow-xs"
											: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
									}`}
								>
									{m}м
								</button>
							))}
						</div>
					)}

					{/* NDFL Toggle */}
					<button
						type="button"
						onClick={() => setShowNdflBreakdown((prev) => !prev)}
						className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-semibold transition-all cursor-pointer ${
							showNdflBreakdown
								? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
								: "bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--muted,#64748b)] border-[var(--border,#cbd5e1)]"
						}`}
						title="Показать расчет налогового вычета 13% по НК РФ"
					>
						<ShieldCheck size={14} />
						<span>Вычет 13% НДФЛ</span>
					</button>

					{/* Comparator Studio Modal Button */}
					{onOpenComparatorStudio && (
						<button
							type="button"
							onClick={onOpenComparatorStudio}
							className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-[var(--ink,#0f172a)] bg-[var(--paper-strong,var(--paper,#ffffff))] hover:bg-slate-100 dark:hover:bg-slate-800 border border-[var(--border,#cbd5e1)] cursor-pointer transition-colors"
							title="Открыть полноэкранную презентационную студию сравнения"
						>
							<Sparkles size={13} className="text-teal-600" />
							<span>Студия 3-Tier</span>
						</button>
					)}

					{/* Stage Payment Modal Button */}
					{onOpenStagePaymentStudio && (
						<button
							type="button"
							onClick={onOpenStagePaymentStudio}
							className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-[var(--ink,#0f172a)] bg-[var(--paper-strong,var(--paper,#ffffff))] hover:bg-slate-100 dark:hover:bg-slate-800 border border-[var(--border,#cbd5e1)] cursor-pointer transition-colors"
							title="Открыть студию поэтапной оплаты и эскроу-депозитов"
						>
							<Coins size={13} className="text-amber-500" />
							<span>Эскроу & Этапы</span>
						</button>
					)}

					{/* Price Validator Modal Button */}
					{onOpenPriceValidatorStudio && (
						<button
							type="button"
							onClick={onOpenPriceValidatorStudio}
							className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-[var(--ink,#0f172a)] bg-[var(--paper-strong,var(--paper,#ffffff))] hover:bg-slate-100 dark:hover:bg-slate-800 border border-[var(--border,#cbd5e1)] cursor-pointer transition-colors"
							title="Проверить цены по прайсу и протоколам СтАР"
						>
							<FileCheck size={13} className="text-emerald-600" />
							<span>Валидация СтАР/Цены</span>
						</button>
					)}
				</div>
			</div>

			{/* 3-Tier Grid Layout */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
				{tiers.map((tier) => {
					const isSelected = activeTierId === tier.tierId;
					const isExpandedStages = expandedStagesTierId === tier.tierId;

					// Financial Calculations
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
							className={`relative flex flex-col justify-between rounded-3xl p-5 border transition-all duration-300 cursor-pointer bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] ${
								isSelected
									? `${tier.borderClass} shadow-xl ring-2 ring-teal-500/20 scale-[1.01] z-10`
									: "border-[var(--border,#cbd5e1)] opacity-95 hover:opacity-100 hover:border-slate-400 shadow-md"
							}`}
							data-testid={`tier-card-${tier.tierId}`}
						>
							{/* Recommended Pill */}
							{tier.isRecommended && (
								<div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 px-3.5 py-0.5 rounded-full bg-gradient-to-r from-teal-600 to-emerald-600 text-white text-[11px] font-black shadow-md uppercase tracking-wider">
									<Crown size={12} />
									<span>{tier.badge}</span>
								</div>
							)}

							<div className="space-y-4">
								{/* Header & Badges */}
								<div className="space-y-1.5 pt-1">
									<div className="flex items-center justify-between">
										<span
											className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${tier.badgeClass}`}
										>
											{tier.title.split("(")[0]?.trim()}
										</span>

										<span className="text-xs font-semibold text-[var(--muted,#64748b)] flex items-center gap-1">
											<Clock size={12} /> {tier.durationWeeks} нед. · {tier.durationVisits} виз.
										</span>
									</div>

									<h3 className="text-base font-extrabold text-[var(--ink,#0f172a)] leading-snug">
										{tier.title}
									</h3>
									<p className="text-xs text-[var(--muted,#64748b)] line-clamp-2">
										{tier.subtitle}
									</p>
								</div>

								{/* Dynamic Pricing Box depending on Payment Mode */}
								<div className="p-3.5 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] space-y-2">
									<div className="flex items-baseline justify-between">
										<span className="text-xs text-[var(--muted,#64748b)] font-medium">
											Полная стоимость:
										</span>
										<span className="text-xl font-black text-[var(--ink,#0f172a)] font-mono">
											{tier.totalRub.toLocaleString("ru-RU")} ₽
										</span>
									</div>

									{/* Mode 1: Installment 0% */}
									{activePaymentMode === "installment" && (
										<div className="flex items-center justify-between text-xs pt-1.5 border-t border-[var(--border,#cbd5e1)]">
											<span className="text-[var(--muted,#64748b)] flex items-center gap-1">
												<Percent size={12} className="text-teal-600" />
												Рассрочка {installmentMonths} мес:
											</span>
											<span className="font-bold text-teal-600 dark:text-teal-400 font-mono">
												{monthlyPayment.toLocaleString("ru-RU")} ₽/мес
											</span>
										</div>
									)}

									{/* Mode 2: Staged Payment (30/40/30) */}
									{activePaymentMode === "staged" && (
										<div className="space-y-1 text-[11px] pt-1.5 border-t border-[var(--border,#cbd5e1)]">
											<div className="flex justify-between text-[var(--muted,#64748b)]">
												<span>1. Аванс/Санация (30%):</span>
												<strong className="font-mono text-[var(--ink,#0f172a)]">
													{stage1Rub.toLocaleString("ru-RU")} ₽
												</strong>
											</div>
											<div className="flex justify-between text-[var(--muted,#64748b)]">
												<span>2. Хирургия/Имплант (40%):</span>
												<strong className="font-mono text-[var(--ink,#0f172a)]">
													{stage2Rub.toLocaleString("ru-RU")} ₽
												</strong>
											</div>
											<div className="flex justify-between text-[var(--muted,#64748b)]">
												<span>3. Ортопедия (30%):</span>
												<strong className="font-mono text-[var(--ink,#0f172a)]">
													{stage3Rub.toLocaleString("ru-RU")} ₽
												</strong>
											</div>
										</div>
									)}

									{/* Mode 3: 5% Single Payment Discount */}
									{activePaymentMode === "discount" && (
										<div className="space-y-1 text-[11px] pt-1.5 border-t border-[var(--border,#cbd5e1)]">
											<div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
												<span>Скидка 5% за 100% оплату:</span>
												<span className="font-mono">
													-{discount5PctAmount.toLocaleString("ru-RU")} ₽
												</span>
											</div>
											<div className="flex justify-between text-slate-800 dark:text-slate-200 font-bold">
												<span>Итого со скидкой:</span>
												<span className="font-mono text-teal-600 dark:text-teal-400">
													{priceWith5PctDiscount.toLocaleString("ru-RU")} ₽
												</span>
											</div>
										</div>
									)}

									{/* NDFL Deduction box */}
									{showNdflBreakdown && tier.ndflRefundRub > 0 && (
										<div
											className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-800 dark:text-emerald-300 space-y-0.5"
											title={tier.ndflDetails?.codeDescription || "Налоговый вычет по НК РФ"}
										>
											<div className="flex items-center justify-between font-semibold">
												<span className="flex items-center gap-1">
													<span>Возврат 13% НДФЛ:</span>
													<span className="text-[9px] px-1 py-0.2 rounded bg-emerald-600 text-white font-mono font-bold">
														{tier.ndflDetails?.code === "02" ? "Код 02" : "Код 01"}
													</span>
												</span>
												<span className="font-mono font-bold">
													+{tier.ndflRefundRub.toLocaleString("ru-RU")} ₽
												</span>
											</div>
											<div className="flex justify-between text-[10px] text-emerald-700 dark:text-emerald-400">
												<span>С учетом возврата:</span>
												<span className="font-bold font-mono">
													{tier.priceWithNdflRefundRub.toLocaleString("ru-RU")} ₽
												</span>
											</div>
										</div>
									)}
								</div>

								{/* Warranty & Visits Cards */}
								<div className="grid grid-cols-2 gap-2 text-xs">
									<div className="p-2 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] flex flex-col">
										<span className="text-[10px] text-[var(--muted,#64748b)] flex items-center gap-1">
											<Shield size={11} /> Гарантия клиники
										</span>
										<strong className="text-[11px] text-[var(--ink,#0f172a)] truncate">
											{typeof tier.warrantyYears === "number"
												? `${tier.warrantyYears} года`
												: tier.warrantyYears}
										</strong>
									</div>

									<div className="p-2 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] flex flex-col">
										<span className="text-[10px] text-[var(--muted,#64748b)] flex items-center gap-1">
											<Calendar size={11} /> Сроки & Визиты
										</span>
										<strong className="text-[11px] text-[var(--ink,#0f172a)]">
											{tier.durationVisits} визитов ({tier.durationWeeks} нед.)
										</strong>
									</div>
								</div>

								{/* Stages Breakdown Accordion Toggle */}
								<div className="pt-2 border-t border-[var(--border,#cbd5e1)]">
									<button
										type="button"
										onClick={(e) => toggleStagesExpand(e, tier.tierId)}
										className="w-full flex items-center justify-between text-xs font-bold text-[var(--ink,#0f172a)] hover:text-teal-600 cursor-pointer py-1"
									>
										<span className="flex items-center gap-1.5">
											<Layers size={13} className="text-teal-600" />
											<span>Клинические этапы I, II, III ({tier.stages.length})</span>
										</span>
										{isExpandedStages ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
									</button>

									{/* Expanded Stages Content */}
									{isExpandedStages && (
										<div className="mt-2 space-y-2 text-[11px] bg-[var(--paper-soft,#f8fafc)] p-2.5 rounded-xl border border-[var(--border,#cbd5e1)]">
											{tier.stages.map((stg) => (
												<div
													key={stg.stageNumber}
													className="p-1.5 rounded-lg bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--border,#cbd5e1)] space-y-1"
												>
													<div className="flex justify-between items-center font-bold">
														<span className="text-teal-700 dark:text-teal-300">
															Этап {stg.stageNumber}: {stg.title.split(":")[1]?.trim() || stg.title}
														</span>
														<span className="font-mono text-slate-900 dark:text-slate-100">
															{stg.totalRub.toLocaleString("ru-RU")} ₽
														</span>
													</div>
													<p className="text-[10px] text-[var(--muted,#64748b)]">
														{stg.clinicalGoal} · ~{stg.estimatedWeeks} нед. ({stg.estimatedVisits} виз.)
													</p>
													{stg.items.length > 0 && (
														<ul className="text-[9px] text-[var(--muted,#64748b)] space-y-0.5 pl-1.5 border-l border-teal-500/30">
															{stg.items.slice(0, 3).map((it) => (
																<li key={it.id} className="truncate">
																	• {it.toothNumber ? `Зуб ${it.toothNumber}: ` : ""}{it.name}
																</li>
															))}
															{stg.items.length > 3 && (
																<li className="italic text-teal-600">
																	+ еще {stg.items.length - 3} процедур
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
								<div className="space-y-2 pt-2 border-t border-[var(--border,#cbd5e1)]">
									<h4 className="text-xs font-bold text-[var(--ink,#0f172a)] flex items-center gap-1.5">
										<Sparkles size={13} className="text-teal-600 dark:text-teal-400" />
										<span>Материалы и технологии</span>
									</h4>
									<ul className="space-y-1 text-xs text-[var(--muted,#64748b)]">
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
								<div className="space-y-1.5 pt-2 border-t border-[var(--border,#cbd5e1)]">
									<h4 className="text-xs font-bold text-[var(--ink,#0f172a)] flex items-center gap-1.5">
										<Star size={13} className="text-amber-500" />
										<span>Преимущества для пациента</span>
									</h4>
									<ul className="space-y-1 text-[11px] text-[var(--muted,#64748b)]">
										{tier.keyAdvantages.map((adv, idx) => (
											<li key={idx} className="flex items-start gap-1.5">
												<span className="text-amber-500 font-bold">•</span>
												<span>{adv}</span>
											</li>
										))}
									</ul>
								</div>
							</div>

							{/* Actions Bottom */}
							<div className="pt-4 mt-4 border-t border-[var(--border,#cbd5e1)] space-y-2">
								<button
									type="button"
									onClick={(e) => handleSignClick(e, tier)}
									className={`w-full min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold shadow-md cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 active:scale-98 ${
										isSelected
											? "bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-emerald-600/20"
											: "bg-[var(--paper-soft,#f8fafc)] hover:bg-[var(--paper-strong)] text-[var(--ink,#0f172a)] border border-[var(--border,#cbd5e1)]"
									}`}
								>
									<PenTool size={14} />
									<span>Утвердить и подписать план</span>
								</button>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
};

export default TreatmentPlan3TierComparison;
