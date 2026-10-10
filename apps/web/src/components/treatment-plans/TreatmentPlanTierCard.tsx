/**
 * TreatmentPlanTierCard.tsx — Карточка тарифа плана лечения (Эконом / Оптимум / Премиум) (DENTE CRM).
 *
 * Содержит:
 * 1. Индикатор рекомендации (Crown badge).
 * 2. Заголовок, подзаголовок, длительность и количество визитов.
 * 3. Расчет стоимости с копеечной точностью (полная цена, рассрочка 0%, этапы 30/40/30, скидка 5%, вычет 13% НДФЛ).
 * 4. Гарантию, расчетный срок службы и сроки лечения.
 * 5. Раскрывающийся аккордеон клинических этапов I, II, III (плоский список).
 * 6. Список клинических материалов и преимуществ для пациента.
 * 7. Зафиксированный подвал (Miller's Law: до 2 первичных кнопок действий).
 */

import React from "react";
import {
	Calendar,
	Check,
	CheckCircle2,
	ChevronDown,
	ChevronUp,
	Clock,
	CreditCard,
	Crown,
	Layers,
	PenTool,
	Percent,
	Printer,
	Share2,
	Shield,
	ShieldCheck,
	Sparkles,
	Star,
} from "lucide-react";
import { parseKopecks } from "@dental/shared";
import {
	formatWarrantyYearsText,
	type TreatmentPlanTier,
	type TreatmentPlanTierId,
} from "./types";
import { isMicroConsumable } from "./TreatmentPlanPresenterModal";
import {
	calculateInstallmentScheduleKopecks,
	calculateStagedPaymentScheduleKopecks,
	formatPlanPriceRub,
	isPlanPriceImmutable,
} from "./planPricing";

export function formatServiceLifeYearsText(
	serviceLifeYears: string | number | undefined,
	tierId: TreatmentPlanTierId,
): string {
	if (serviceLifeYears !== undefined && serviceLifeYears !== null && serviceLifeYears !== "") {
		if (typeof serviceLifeYears === "number") return `${serviceLifeYears} лет`;
		return String(serviceLifeYears);
	}
	if (tierId === "economy") return "до 5–7 лет";
	if (tierId === "standard") return "15–20 лет";
	if (tierId === "optimum") return "25+ лет (пожизненно)";
	return "10–15 лет";
}

export interface TreatmentPlanTierCardProps {
	readonly tier: TreatmentPlanTier;
	readonly isSelected: boolean;
	readonly isMobile: boolean;
	readonly activePaymentMode: "installment" | "staged" | "discount";
	readonly installmentMonths: 3 | 6 | 12 | 24;
	readonly showNdflBreakdown: boolean;
	readonly isExpandedStages: boolean;
	readonly copiedMessengerTierId: TreatmentPlanTierId | null;
	readonly onCardClick: (tier: TreatmentPlanTier) => void;
	readonly onSignClick: (e: React.MouseEvent, tier: TreatmentPlanTier) => void;
	readonly onInstallmentClick: (e: React.MouseEvent, tier: TreatmentPlanTier) => void;
	readonly onCopyMessengerClick: (e: React.MouseEvent, tier: TreatmentPlanTier) => void;
	readonly onPrintClick?: ((e: React.MouseEvent, tier: TreatmentPlanTier) => void) | undefined;
	readonly onToggleStagesExpand: (e: React.MouseEvent, tierId: TreatmentPlanTierId) => void;
}

export const TreatmentPlanTierCard: React.FC<TreatmentPlanTierCardProps> = ({
	tier,
	isSelected,
	isMobile,
	activePaymentMode,
	installmentMonths,
	showNdflBreakdown,
	isExpandedStages,
	copiedMessengerTierId,
	onCardClick,
	onSignClick,
	onInstallmentClick,
	onCopyMessengerClick,
	onPrintClick,
	onToggleStagesExpand,
}) => {
	// Financial Calculations in whole rubles with kopeck-exact precision (Mandates 8b, 8e, 8n)
	const safeTotalRub = Number.isFinite(tier.totalRub) ? tier.totalRub : 0;
	const effectiveTotalKopecks =
		tier.totalKopecks || (safeTotalRub > 0 ? parseKopecks(safeTotalRub) : 0);

	// Kopeck-exact installment 0% calculation
	const exactInstallment = calculateInstallmentScheduleKopecks(
		effectiveTotalKopecks,
		installmentMonths,
	);
	const monthlyPayment =
		tier.installments?.[installmentMonths]?.monthlyPaymentRub ??
		exactInstallment.monthlyPaymentRub;

	const discount5PctKopecks = Math.round(effectiveTotalKopecks * 0.05);
	const discount5PctAmount = Math.round(discount5PctKopecks / 100);
	const priceWith5PctDiscount = Math.max(
		0,
		Math.round((effectiveTotalKopecks - discount5PctKopecks) / 100),
	);

	// Staged 30/40/30 from exact kopeck schedule
	const exactStaged = calculateStagedPaymentScheduleKopecks(effectiveTotalKopecks, [30, 40, 30]);
	const stage1Rub = tier.stagedSchedule?.stage1AdvanceTherapyRub ?? exactStaged.stage1Rub;
	const stage2Rub = tier.stagedSchedule?.stage2SurgeryImplantRub ?? exactStaged.stage2Rub;
	const stage3Rub =
		tier.stagedSchedule?.stage3OrthopedicsRub ?? (safeTotalRub - stage1Rub - stage2Rub);

	const isTierImmutable =
		isPlanPriceImmutable(tier.workflowStatus) || Boolean(tier.isPriceLocked);
	const hasPriceDrift = Boolean(
		tier.hasPriceDrift || (tier.catalogDriftRub && Math.abs(tier.catalogDriftRub) > 0),
	);

	return (
		<div
			onClick={() => onCardClick(tier)}
			className={`relative flex flex-col justify-between rounded-2xl p-3.5 sm:p-4 border transition-all duration-200 cursor-pointer bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] ${
				isMobile
					? "w-full min-w-0 shadow-md"
					: "h-full max-h-[620px] min-h-0 overflow-hidden flex-1 min-w-0"
			} ${
				isSelected
					? `${tier.borderClass} shadow-xl ring-2 ring-[var(--teal,var(--brand-primary))]/20 z-10`
					: "border-[var(--line,var(--border,#cbd5e1))] opacity-95 hover:opacity-100 hover:border-[var(--line-strong)] shadow-md"
			}`}
			data-testid={isMobile ? `tier-card-mobile-${tier.tierId}` : `tier-card-${tier.tierId}`}
		>
			{/* Recommended Pill with Elevation */}
			{tier.isRecommended && (
				<div
					className="flex items-center gap-1.5 px-4 py-1 rounded-full bg-gradient-to-r from-teal-600 to-emerald-600 text-white text-[11px] font-black shadow-lg uppercase tracking-wider whitespace-nowrap z-30 self-center mb-1 -mt-0.5"
				>
					<Crown size={13} />
					<span>{tier.badge}</span>
				</div>
			)}

			{/* Card Header */}
			<div className="space-y-1.5 pt-1 min-w-0">
				<div className="flex items-center justify-between gap-2 min-w-0">
					<span
						className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border truncate max-w-[160px] whitespace-nowrap ${tier.badgeClass}`}
						title={tier.title.split("(")[0]?.trim()}
					>
						{tier.title.split("(")[0]?.trim()}
					</span>

					<span className="text-xs font-semibold text-[var(--muted,#64748b)] flex items-center gap-1 whitespace-nowrap shrink-0">
						<Clock size={12} /> {tier.durationWeeks} нед. · {tier.durationVisits} виз.
					</span>
				</div>

				<h3 className="text-sm sm:text-base font-extrabold text-[var(--ink,#0f172a)] leading-snug m-0 break-words" title={tier.title}>
					{tier.title}
				</h3>
				<p className="text-xs text-[var(--muted,#64748b)] line-clamp-2 m-0">
					{tier.subtitle}
				</p>
			</div>

			{/* Scrollable Card Body: flat stages and materials */}
			<div
				className={
					isMobile
						? "space-y-2.5 my-2"
						: "flex-1 overflow-y-auto min-h-0 pr-1 space-y-2 sm:space-y-2.5 my-2 overscroll-contain"
				}
			>
				{/* Pricing Section: Flat tonal underlay (Anti-Matryoshka Law) */}
				<div className="p-3 sm:p-3 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,var(--border,#cbd5e1))]/50 space-y-1 sm:space-y-1.5">
					<div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 sm:gap-2">
						<span className="text-xs text-[var(--muted,#64748b)] font-semibold uppercase tracking-wider">
							Полная стоимость:
						</span>
						<span className="text-2xl sm:text-xl font-black text-[var(--ink,#0f172a)] font-mono tracking-tight whitespace-nowrap">
							{formatPlanPriceRub(tier.totalRub)}
						</span>
					</div>

					{/* Price lock guarantee badge when tier is approved/in_progress (Mandates 8e, 8n) */}
					{isTierImmutable && (
						<div
							className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20"
							data-testid={`tier-locked-badge-${tier.tierId}`}
							title="Смета тарифа утверждена: цены и график платежей заморожены"
						>
							<ShieldCheck size={11} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
							<span>Смета зафиксирована по гарантии</span>
						</div>
					)}

					{/* Price drift badge if catalog updated */}
					{hasPriceDrift && tier.catalogDriftRub !== undefined && (
						<div
							className="text-[10px] text-slate-600 dark:text-slate-400 font-medium bg-slate-200/50 dark:bg-slate-800/50 px-2 py-0.5 rounded border border-slate-300/50 dark:border-slate-700/50"
							data-testid={`tier-drift-badge-${tier.tierId}`}
							title="Цены в действующем каталоге изменились, смета тарифа сохранена неизменной"
						>
							В прайсе: {formatPlanPriceRub(safeTotalRub + tier.catalogDriftRub)} · В плане зафиксировано: {formatPlanPriceRub(safeTotalRub)}
						</div>
					)}

					{/* Mode 1: Installment 0% */}
					{activePaymentMode === "installment" && (
						<div className="flex items-center justify-between text-xs pt-1.5 border-t border-[var(--line,var(--border,#cbd5e1))]/30 gap-2">
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
						<div className="space-y-1 text-[11px] pt-1.5 border-t border-[var(--line,var(--border,#cbd5e1))]/30">
							<div className="flex justify-between text-[var(--muted,#64748b)] gap-2">
								<span>1. Аванс/Санация (30%):</span>
								<strong className="font-mono text-[var(--ink,#0f172a)] whitespace-nowrap">
									{formatPlanPriceRub(stage1Rub)}
								</strong>
							</div>
							<div className="flex justify-between text-[var(--muted,#64748b)] gap-2">
								<span>2. Хирургия/Имплант (40%):</span>
								<strong className="font-mono text-[var(--ink,#0f172a)] whitespace-nowrap">
									{formatPlanPriceRub(stage2Rub)}
								</strong>
							</div>
							<div className="flex justify-between text-[var(--muted,#64748b)] gap-2">
								<span>3. Ортопедия (30%):</span>
								<strong className="font-mono text-[var(--ink,#0f172a)] whitespace-nowrap">
									{formatPlanPriceRub(stage3Rub)}
								</strong>
							</div>
						</div>
					)}

					{/* Mode 3: 5% Single Payment Discount */}
					{activePaymentMode === "discount" && (
						<div className="space-y-1 text-[11px] pt-1.5 border-t border-[var(--line,var(--border,#cbd5e1))]/30">
							<div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold gap-2">
								<span>Скидка 5% за 100% оплату:</span>
								<span className="font-mono whitespace-nowrap">
									-{formatPlanPriceRub(discount5PctAmount)}
								</span>
							</div>
							<div className="flex justify-between text-slate-800 dark:text-slate-200 font-bold gap-2">
								<span>Итого со скидкой:</span>
								<span className="font-mono text-[var(--teal,var(--brand-primary))] whitespace-nowrap">
									{formatPlanPriceRub(priceWith5PctDiscount)}
								</span>
							</div>
						</div>
					)}

					{/* NDFL Deduction box */}
					{showNdflBreakdown && (tier.ndflRefundRub ?? 0) > 0 && (
						<div
							className="pt-1.5 border-t border-[var(--line,var(--border,#cbd5e1))]/30 text-[11px] text-emerald-800 dark:text-emerald-300 space-y-0.5"
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
									+{formatPlanPriceRub(tier.ndflRefundRub)}
								</span>
							</div>
							<div className="flex justify-between text-[10px] text-emerald-700 dark:text-emerald-400 gap-2">
								<span>С учетом возврата:</span>
								<span className="font-bold font-mono whitespace-nowrap">
									{formatPlanPriceRub(tier.priceWithNdflRefundRub)}
								</span>
							</div>
						</div>
					)}
				</div>

				{/* Flat Warranty, Service Life and Visits Strip */}
				<div className="grid grid-cols-3 gap-1.5 text-xs py-1 border-y border-[var(--line,var(--border,#cbd5e1))]/40 my-1">
					<div className="flex flex-col justify-between">
						<span className="text-[10px] text-[var(--muted,#64748b)] flex items-center gap-1">
							<Shield size={11} /> Гарантия
						</span>
						<strong className="text-[11px] text-[var(--ink,#0f172a)] truncate mt-0.5" title={formatWarrantyYearsText(tier.warrantyYears)}>
							{formatWarrantyYearsText(tier.warrantyYears)}
						</strong>
					</div>

					<div className="flex flex-col justify-between">
						<span className="text-[10px] text-[var(--muted,#64748b)] flex items-center gap-1">
							<Clock size={11} /> Срок службы
						</span>
						<strong className="text-[11px] text-[var(--ink,#0f172a)] truncate mt-0.5" title={formatServiceLifeYearsText(tier.serviceLifeYears, tier.tierId)}>
							{formatServiceLifeYearsText(tier.serviceLifeYears, tier.tierId)}
						</strong>
					</div>

					<div className="flex flex-col justify-between">
						<span className="text-[10px] text-[var(--muted,#64748b)] flex items-center gap-1">
							<Calendar size={11} /> Сроки
						</span>
						<strong className="text-[11px] text-[var(--ink,#0f172a)] mt-0.5">
							{tier.durationVisits} виз. ({tier.durationWeeks} нед.)
						</strong>
					</div>
				</div>

				{/* Key Materials Headline Pill */}
				{tier.materialsHeadline && (
					<div className="p-2 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,var(--border,#cbd5e1))]/60 text-[11px] text-[var(--ink,#0f172a)] leading-snug">
						<div className="text-[10px] font-bold text-[var(--teal,var(--brand-primary))] uppercase tracking-wider mb-0.5">
							Клинические материалы
						</div>
						<div className="font-semibold">{tier.materialsHeadline}</div>
					</div>
				)}

				{/* Stages Breakdown Accordion Toggle */}
				<div className="pt-1.5 border-t border-[var(--line,var(--border,#cbd5e1))]/60">
					<button
						type="button"
						onClick={(e) => onToggleStagesExpand(e, tier.tierId)}
						className="w-full min-h-[44px] sm:min-h-[32px] sm:h-8 flex items-center justify-between text-xs font-bold text-[var(--ink,#0f172a)] hover:text-[var(--teal,var(--brand-primary))] cursor-pointer py-1.5"
					>
						<span className="flex items-center gap-1.5 min-w-0">
							<Layers size={14} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
							<span className="truncate">Клинические этапы I, II, III ({tier.stages.length})</span>
						</span>
						{isExpandedStages ? <ChevronUp size={14} className="shrink-0" /> : <ChevronDown size={14} className="shrink-0" />}
					</button>

					{/* Expanded Stages Content */}
					{isExpandedStages && (
						<div
							className={
								isMobile
									? "mt-2 space-y-2 text-[11px]"
									: "mt-1.5 max-h-56 overflow-y-auto min-h-0 divide-y divide-[var(--line,var(--border,#cbd5e1))]/40 text-[11px] px-1 py-1"
							}
						>
							{tier.stages.map((stg) => (
								<div
									key={stg.stageNumber}
									className={
										isMobile
											? "p-2.5 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,var(--border,#cbd5e1))]/60 space-y-1 min-w-0 shadow-2xs"
											: "py-1.5 first:pt-0 last:pb-0 space-y-0.5 min-w-0"
									}
								>
									<div className="flex justify-between items-center font-bold gap-2 min-w-0">
										<span className="text-[var(--teal-dark,var(--teal))] truncate min-w-0" title={stg.title}>
											Этап {stg.stageNumber}: {stg.title.split(":")[1]?.trim() || stg.title}
										</span>
										<span className="font-mono text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0">
											{formatPlanPriceRub(stg.totalRub)}
										</span>
									</div>
									<p className="text-[10px] text-[var(--muted,#64748b)] m-0 truncate" title={stg.clinicalGoal}>
										{stg.clinicalGoal} · ~{stg.estimatedWeeks} нед. ({stg.estimatedVisits} виз.)
									</p>
									{(() => {
										const displayItems = stg.items.filter((it) => !isMicroConsumable(it));
										return displayItems.length > 0 ? (
											<ul
												className={
													isMobile
														? "text-[10px] text-[var(--muted,#64748b)] space-y-1 pl-1.5 border-l-2 border-[var(--teal,var(--brand-primary))]/40 m-0 list-none mt-1.5 min-w-0"
														: "max-h-24 overflow-y-auto min-h-0 text-[9px] text-[var(--muted,#64748b)] space-y-0.5 pl-1.5 border-l border-[var(--teal,var(--brand-primary))]/30 m-0 list-none mt-1 min-w-0"
												}
											>
												{displayItems.slice(0, isMobile ? 6 : 4).map((it) => (
													<li key={it.id} className="truncate min-w-0 flex items-center gap-1.5" title={it.name}>
														<Check size={11} className="text-teal-600 dark:text-teal-400 shrink-0" />
														<span className="truncate">
															{it.toothNumber ? `Зуб ${it.toothNumber}: ` : ""}{it.name}
														</span>
													</li>
												))}
												{displayItems.length > (isMobile ? 6 : 4) && (
													<li className="italic text-[var(--teal,var(--brand-primary))] truncate min-w-0 pl-4">
														+ еще {displayItems.length - (isMobile ? 6 : 4)} процедур
													</li>
												)}
											</ul>
										) : null;
									})()}
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
						{(tier.materialsList ?? []).map((mat, i) => (
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

			{/* Actions Bottom: Sticky Footer on Desktop; in-flow Secondary Actions on Mobile */}
			<div
				className={
					isMobile
						? "mt-3 pt-2.5 border-t border-[var(--line-subtle)] space-y-1.5 shrink-0"
						: "sticky bottom-0 bg-[var(--paper-soft,var(--paper,#ffffff))] border-t border-[var(--line,var(--border,#cbd5e1))] p-3 -mx-3.5 sm:-mx-4 -mb-3.5 sm:-mb-4 rounded-b-2xl mt-auto z-10 space-y-1.5 shadow-xs shrink-0"
				}
			>
				{!isMobile && (
					<button
						type="button"
						onClick={(e) => onSignClick(e, tier)}
						className={`w-full min-h-[44px] sm:min-h-[32px] sm:h-8 flex items-center justify-center gap-1.5 px-3 rounded-lg text-[13px] font-semibold shadow-xs cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 active:scale-[0.99] ${
							isSelected
								? "bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-emerald-600/20"
								: "bg-[var(--paper-strong,#ffffff)] hover:bg-[var(--paper-soft)] text-[var(--ink,#0f172a)] border border-[var(--line,var(--border,#cbd5e1))]"
						}`}
						data-testid={`approve-tier-btn-${tier.tierId}`}
					>
						<PenTool size={14} />
						<span>Утвердить и подписать план</span>
					</button>
				)}

				{/* Secondary Action Strip */}
				<div className="flex flex-wrap items-center gap-2">
					<button
						type="button"
						onClick={(e) => onInstallmentClick(e, tier)}
						className="flex-1 min-h-[44px] sm:min-h-[32px] sm:h-8 flex items-center justify-center gap-1.5 px-3 rounded-lg text-[13px] font-medium bg-[var(--paper-strong,#ffffff)] hover:bg-[var(--paper-soft)] text-[var(--ink,#0f172a)] border border-[var(--line,var(--border,#cbd5e1))] cursor-pointer transition-colors whitespace-nowrap min-w-0"
						title="Оформить рассрочку 0% по данному варианту"
					>
						<CreditCard size={13} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
						<span className="truncate">Рассрочка 0%</span>
					</button>

					<button
						type="button"
						onClick={(e) => onCopyMessengerClick(e, tier)}
						className="min-h-[44px] sm:min-h-[32px] sm:h-8 px-2.5 rounded-lg text-[13px] font-medium bg-[var(--paper-strong,#ffffff)] hover:bg-[var(--paper-soft)] text-[var(--ink,#0f172a)] border border-[var(--line,var(--border,#cbd5e1))] cursor-pointer transition-colors shrink-0 inline-flex items-center gap-1.5 whitespace-nowrap"
						title="Скопировать смету для WhatsApp / Telegram (понятный пациенту формат)"
						aria-label="Скопировать смету"
						data-testid={`copy-estimate-messenger-btn-${tier.tierId}`}
					>
						{copiedMessengerTierId === tier.tierId ? (
							<>
								<Check size={13} className="text-emerald-600 shrink-0" />
								<span className="text-[12.5px] text-emerald-600 font-semibold">Скопировано</span>
							</>
						) : (
							<>
								<Share2 size={13} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
								<span className="hidden sm:inline text-[13px]">Смета</span>
							</>
						)}
					</button>

					{onPrintClick && (
						<button
							type="button"
							onClick={(e) => onPrintClick(e, tier)}
							className="min-h-[44px] sm:min-h-[32px] sm:h-8 px-3 rounded-lg text-[13px] font-medium bg-[var(--paper-strong,#ffffff)] hover:bg-[var(--paper-soft)] text-[var(--ink,#0f172a)] border border-[var(--line,var(--border,#cbd5e1))] cursor-pointer transition-colors shrink-0 inline-flex items-center gap-1.5 whitespace-nowrap"
							title="Распечатать договор и смету"
							aria-label="Договор и смета (QR)"
						>
							<Printer size={13} className="shrink-0" />
							<span className="hidden sm:inline text-[13px]">Договор</span>
						</button>
					)}
				</div>
			</div>
		</div>
	);
};

export default TreatmentPlanTierCard;
