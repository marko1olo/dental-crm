/**
 * TreatmentPlan3TierComparison.tsx — Apple HIG сравнительная презентация 3 вариантов плана лечения (Эконом, Оптимум, Премиум).
 *
 * ВОЗМОЖНОСТИ:
 * 1. Apple HIG Segmented Control для мобильных устройств (<= 640px / sm:hidden):
 *    - Заменяет 2500px вертикальный скролл-туннель на элегантный нативный Segmented Control:
 *      [ Эконом (сумма ₽) | Оптимум (сумма ₽) | Премиум (сумма ₽) ]
 *    - Мгновенное и плавное переключение тарифа на одном компактном экране с нулевым паразитным скроллом (CLS = 0).
 * 2. Роскошная трехколоночная сетка для десктопа (>= 640px / hidden sm:grid sm:grid-cols-3):
 *    - Полноценное side-by-side сравнение клинических этапов, материалов, сроков и гарантий.
 * 3. Калькулятор гибких сценариев оплаты:
 *    - Рассрочка 0% без переплат (3, 6, 12, 24 мес).
 *    - Поэтапная оплата 30/40/30 (Аванс -> Хирургия -> Ортопедия).
 *    - Скидка 5% при 100% единовременной оплате.
 * 4. Налоговый вычет 13% НДФЛ по НК РФ.
 * 5. Жестко зафиксированный подвал (sticky bottom-0) с кнопками утверждения плана и рассрочки.
 * 6. Анти-матрешка: плоские клинические этапы и номенклатура 804н без вложенных коробок.
 *
 * Архитектурно декомпозирован согласно Engineering Rule 2 (< 300 строк):
 * - TreatmentPlanTierCard: карточка отдельного тарифа со всеми расчетами и действиями.
 * - TreatmentPlan3TierToolbar: верхняя компактная панель переключения режимов.
 * - TreatmentPlanRoadmapGrid: бесшовная плоская сетка клинического маршрута.
 */

import React, { useEffect, useState } from "react";
import { Clock, PenTool, Star } from "lucide-react";
import {
	formatWarrantyYearsText,
	type TreatmentPlanTier,
	type TreatmentPlanTierId,
} from "./types";
import { formatPlanPriceRub } from "./planPricing";
import {
	formatServiceLifeYearsText,
	TreatmentPlanTierCard,
} from "./TreatmentPlanTierCard";
import { TreatmentPlan3TierToolbar } from "./TreatmentPlan3TierToolbar";
import { TreatmentPlanRoadmapGrid } from "./TreatmentPlanRoadmapGrid";

export { formatServiceLifeYearsText } from "./TreatmentPlanTierCard";

export interface TreatmentPlan3TierComparisonProps {
	readonly tiers: readonly TreatmentPlanTier[];
	readonly selectedTierId?: TreatmentPlanTierId | undefined;
	readonly planAgeDays?: number | undefined;
	readonly planCreatedAtIso?: string | undefined;
	readonly onSelectTier?: ((tier: TreatmentPlanTier) => void) | undefined;
	readonly onApproveAndSign?: ((tier: TreatmentPlanTier) => void) | undefined;
	readonly onOpenComparatorStudio?: (() => void) | undefined;
	readonly onOpenStagePaymentStudio?: (() => void) | undefined;
	readonly onOpenPriceValidatorStudio?: (() => void) | undefined;
	readonly onOpenInstallment?: ((tier: TreatmentPlanTier) => void) | undefined;
	readonly onPrintContract?: ((tier: TreatmentPlanTier) => void) | undefined;
	readonly className?: string | undefined;
}

function getTierShortLabel(tier: TreatmentPlanTier): string {
	if (tier.tierId === "economy") return "Эконом";
	if (tier.tierId === "standard") return "Оптимум";
	if (tier.tierId === "optimum") return "Премиум";
	const lowerTitle = (tier.title || "").toLowerCase();
	if (lowerTitle.includes("эконом") || lowerTitle.includes("базов")) return "Эконом";
	if (lowerTitle.includes("стандарт") || lowerTitle.includes("оптимал")) return "Оптимум";
	if (lowerTitle.includes("премиум") || lowerTitle.includes("vip")) return "Премиум";
	return tier.badge || tier.title || "Тариф";
}

export const TreatmentPlan3TierComparison: React.FC<TreatmentPlan3TierComparisonProps> = ({
	tiers,
	selectedTierId = "optimum",
	planAgeDays,
	planCreatedAtIso,
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
	const [expandedStagesTierId, setExpandedStagesTierId] = useState<TreatmentPlanTierId | null>(selectedTierId);
	const [activePaymentMode, setActivePaymentMode] = useState<"installment" | "staged" | "discount">("installment");
	const [copiedMessengerTierId, setCopiedMessengerTierId] = useState<TreatmentPlanTierId | null>(null);

	const effectivePlanAgeDays =
		typeof planAgeDays === "number"
			? planAgeDays
			: planCreatedAtIso
				? Math.floor((Date.now() - new Date(planCreatedAtIso).getTime()) / (1000 * 60 * 60 * 24))
				: 0;

	// Синхронизация внешнего выбранного тарифа
	useEffect(() => {
		if (selectedTierId && selectedTierId !== activeTierId) {
			setActiveTierId(selectedTierId);
		}
	}, [selectedTierId, activeTierId]);

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

	const handleCopyEstimateToMessenger = (e: React.MouseEvent, tierToCopy: TreatmentPlanTier) => {
		e.stopPropagation();
		const lines = [
			`[План лечения] «${tierToCopy.title}»`,
			`[Стоимость]: ${formatPlanPriceRub(tierToCopy.totalRub)}`,
			`[Рассрочка 0% клиники]: от ${formatPlanPriceRub(tierToCopy.installments?.[12]?.monthlyPaymentRub ?? Math.round(tierToCopy.totalRub / 12))}/мес на 12 мес.`,
			`[Гарантия]: ${formatWarrantyYearsText(tierToCopy.warrantyYears)} | [Срок службы]: ${formatServiceLifeYearsText(tierToCopy.serviceLifeYears, tierToCopy.tierId)}`,
			`[Сроки]: ~${tierToCopy.durationWeeks} нед. (${tierToCopy.durationVisits} виз.)`,
			tierToCopy.materialsHeadline ? `[Материалы]: ${tierToCopy.materialsHeadline}` : "",
			tierToCopy.ndflRefundRub ? `[Налоговый вычет 13%]: до +${formatPlanPriceRub(tierToCopy.ndflRefundRub)} к возврату` : "",
			`Подготовлено в DENTE CRM. Соответствует клиническим протоколам СтАР.`,
		].filter(Boolean).join("\n");

		if (typeof navigator !== "undefined" && navigator.clipboard) {
			navigator.clipboard.writeText(lines).catch(() => {});
		}
		setCopiedMessengerTierId(tierToCopy.tierId);
		setTimeout(() => setCopiedMessengerTierId(null), 2500);
	};

	if (!tiers || tiers.length === 0) {
		return null;
	}

	const activeTier = tiers.find((t) => t.tierId === activeTierId) ?? tiers[0]!;

	const renderSingleTierCard = (tier: TreatmentPlanTier, isMobile: boolean) => (
		<TreatmentPlanTierCard
			key={tier.tierId}
			tier={tier}
			isSelected={activeTierId === tier.tierId}
			isMobile={isMobile}
			activePaymentMode={activePaymentMode}
			installmentMonths={installmentMonths}
			showNdflBreakdown={showNdflBreakdown}
			isExpandedStages={expandedStagesTierId === tier.tierId}
			copiedMessengerTierId={copiedMessengerTierId}
			onCardClick={handleCardClick}
			onSignClick={handleSignClick}
			onInstallmentClick={handleInstallmentClick}
			onCopyMessengerClick={handleCopyEstimateToMessenger}
			onPrintClick={onPrintContract ? handlePrintClick : undefined}
			onToggleStagesExpand={toggleStagesExpand}
		/>
	);

	return (
		<div
			className={`treatment-3tier-comparison flex flex-col gap-3 w-full pb-44 sm:pb-2 ${className}`.trim()}
			data-testid="treatment-3tier-comparison"
		>
			{/* 30-Day Plan Age Unblocked Notice (Mandate 8e) */}
			{effectivePlanAgeDays > 30 && (
				<div
					className="flex items-center gap-2.5 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-950 dark:text-amber-200 text-xs font-semibold shadow-2xs"
					data-testid="comparison-expired-unblocked-badge"
				>
					<Clock size={15} className="text-amber-600 dark:text-amber-400 shrink-0" />
					<span>
						План составлен более 30 дней назад ({effectivePlanAgeDays} дн.), цены могут быть скорректированы. Стоимость зафиксирована по согласованию с врачом. Оказание услуг, оформление нарядов ЗТЛ и оплата производятся без ограничений (Мандат 8e).
					</span>
				</div>
			)}

			{/* Top Control Bar: Installments, Modes & Studio Triggers */}
			<TreatmentPlan3TierToolbar
				activePaymentMode={activePaymentMode}
				onPaymentModeChange={setActivePaymentMode}
				installmentMonths={installmentMonths}
				onInstallmentMonthsChange={setInstallmentMonths}
				showNdflBreakdown={showNdflBreakdown}
				onToggleNdflBreakdown={() => setShowNdflBreakdown((prev) => !prev)}
				activeTier={activeTier}
				copiedMessengerTierId={copiedMessengerTierId}
				onCopyEstimateToMessenger={handleCopyEstimateToMessenger}
				onOpenComparatorStudio={onOpenComparatorStudio}
				onOpenStagePaymentStudio={onOpenStagePaymentStudio}
				onOpenPriceValidatorStudio={onOpenPriceValidatorStudio}
			/>

			{/* Apple HIG Segmented Control for Mobile Viewports (<= 640px / sm:hidden) */}
			<div
				className="sm:hidden w-full p-1.5 rounded-2xl bg-[var(--paper-soft,#f1f5f9)] dark:bg-slate-800/80 border border-[var(--line,var(--border,#cbd5e1))] shadow-inner flex items-stretch gap-1.5"
				data-testid="treatment-3tier-segmented-control"
			>
				{tiers.map((tier) => {
					const isCurrent = activeTierId === tier.tierId;
					const shortLabel = getTierShortLabel(tier);
					const isRecommended = Boolean(tier.isRecommended || tier.tierId === "standard");
					return (
						<button
							key={tier.tierId}
							type="button"
							onClick={() => handleCardClick(tier)}
							className={`flex-1 min-h-[50px] py-1 px-2 rounded-xl text-center transition-all duration-200 cursor-pointer flex flex-col items-center justify-center min-w-0 touch-manipulation ${
								isCurrent
									? "bg-[var(--paper-strong,#ffffff)] text-[var(--ink,#0f172a)] shadow-md font-extrabold ring-1 ring-[var(--teal,var(--brand-primary))]/40"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] font-medium"
							}`}
							data-testid={`segmented-tab-${tier.tierId}`}
							aria-pressed={isCurrent}
						>
							<span className="text-xs truncate flex items-center justify-center gap-1 max-w-full min-w-0 font-bold">
								{isRecommended && (
									<Star size={11} className="text-amber-500 fill-amber-500 shrink-0" />
								)}
								<span className="truncate min-w-0">{shortLabel}</span>
							</span>
							<span className={`text-[11px] font-mono font-bold whitespace-nowrap mt-0.5 ${
								isCurrent ? "text-[var(--teal,var(--brand-primary))]" : "opacity-85"
							}`}>
								{tier.totalRub.toLocaleString("ru-RU")} ₽
							</span>
						</button>
					);
				})}
			</div>

			{/* Mobile Single Card View (<= 640px / sm:hidden) */}
			<div className="sm:hidden flex flex-col w-full min-w-0">
				{renderSingleTierCard(activeTier, true)}
			</div>

			{/* Desktop 3-Tier Grid Layout (>= 640px / hidden sm:grid) */}
			<div className="hidden sm:grid sm:grid-cols-3 gap-3 sm:gap-4 items-stretch h-[calc(100vh-250px)] min-h-[500px] max-h-[620px] overflow-hidden">
				{tiers.map((tier) => renderSingleTierCard(tier, false))}
			</div>

			{/* Bottom Block: Clinical Treatment Roadmap */}
			<TreatmentPlanRoadmapGrid activeTier={activeTier} />

			{/* Floating Bottom Bar in Natural Thumb Zone for Mobile (<= 640px / sm:hidden) */}
			<div
				className="sm:hidden fixed left-0 right-0 z-40 px-4 py-2.5 bg-[var(--paper-strong,var(--paper,#ffffff))]/95 backdrop-blur-xl border-t border-[var(--line,var(--border,#cbd5e1))] shadow-2xl flex items-center justify-between gap-3"
				style={{ bottom: "calc(56px + env(safe-area-inset-bottom, 0px))" }}
				data-testid="treatment-mobile-floating-thumb-bar"
			>
				<div className="flex flex-col min-w-0 flex-1">
					<div className="flex items-center gap-1 text-xs text-[var(--muted,#64748b)] font-medium truncate">
						<span>Выбран:</span>
						<span className="font-extrabold text-[var(--ink,#0f172a)] truncate">
							{getTierShortLabel(activeTier)}
						</span>
					</div>
					<div className="text-lg font-black font-mono text-[var(--teal,var(--brand-primary))] whitespace-nowrap">
						{formatPlanPriceRub(activeTier.totalRub)}
					</div>
					{activePaymentMode === "installment" && (
						<div className="text-[10px] text-[var(--muted,#64748b)] font-mono whitespace-nowrap truncate">
							Рассрочка 0%: {(activeTier.installments?.[installmentMonths]?.monthlyPaymentRub ?? Math.round(activeTier.totalRub / installmentMonths)).toLocaleString("ru-RU")} ₽/мес
						</div>
					)}
				</div>

				<button
					type="button"
					onClick={(e) => handleSignClick(e, activeTier)}
					className="min-h-[48px] px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-extrabold text-sm shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer shrink-0 transition-all touch-manipulation focus:outline-none focus:ring-2 focus:ring-emerald-500"
					data-testid="mobile-primary-sign-btn"
				>
					<PenTool size={16} className="shrink-0" />
					<span className="whitespace-nowrap">Согласовать план</span>
				</button>
			</div>
		</div>
	);
};

export default TreatmentPlan3TierComparison;
