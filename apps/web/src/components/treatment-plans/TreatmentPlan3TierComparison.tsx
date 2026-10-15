/**
 * TreatmentPlan3TierComparison.tsx — Apple HIG презентация 3 вариантов плана (Эконом, Оптимум, Премиум).
 * Декомпозирован строго по Мандату 8b (лимит <= 120 строк).
 */

import React, { useEffect, useState } from "react";
import { formatWarrantyYearsText, type TreatmentPlanTier, type TreatmentPlanTierId } from "./types";
import { formatPlanPriceRub } from "./planPricing";
import { formatServiceLifeYearsText, TreatmentPlanTierCard } from "./TreatmentPlanTierCard";
import { TreatmentPlan3TierToolbar } from "./TreatmentPlan3TierToolbar";
import { TreatmentPlanRoadmapGrid } from "./TreatmentPlanRoadmapGrid";
import { TreatmentPlan3TierAgeWarning } from "./TreatmentPlan3TierAgeWarning";
import { TreatmentPlan3TierMobileSegmented } from "./TreatmentPlan3TierMobileSegmented";
import { TreatmentPlan3TierMobileThumbBar } from "./TreatmentPlan3TierMobileThumbBar";
import { TreatmentPlan3TierEmptyState } from "./TreatmentPlan3TierEmptyState";

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

export function getTierShortLabel(tier: TreatmentPlanTier): string {
	if (tier.tierId === "economy") return "Эконом";
	if (tier.tierId === "standard") return "Оптимум";
	if (tier.tierId === "optimum") return "Премиум";
	const lower = (tier.title || "").toLowerCase();
	if (lower.includes("эконом") || lower.includes("базов")) return "Эконом";
	if (lower.includes("стандарт") || lower.includes("оптимал")) return "Оптимум";
	if (lower.includes("премиум") || lower.includes("vip")) return "Премиум";
	return tier.badge || tier.title || "Тариф";
}

export const TreatmentPlan3TierComparison: React.FC<TreatmentPlan3TierComparisonProps> = (props) => {
	const { tiers, selectedTierId = "optimum", planAgeDays, planCreatedAtIso, onSelectTier, onApproveAndSign, onOpenComparatorStudio, onOpenStagePaymentStudio, onOpenPriceValidatorStudio, onOpenInstallment, onPrintContract, className = "" } = props;
	const [activeTierId, setActiveTierId] = useState<TreatmentPlanTierId>(selectedTierId);
	const [installmentMonths, setInstallmentMonths] = useState<3 | 6 | 12 | 24>(12);
	const [showNdflBreakdown, setShowNdflBreakdown] = useState<boolean>(true);
	const [expandedStagesTierId, setExpandedStagesTierId] = useState<TreatmentPlanTierId | null>(selectedTierId);
	const [activePaymentMode, setActivePaymentMode] = useState<"installment" | "staged" | "discount">("installment");
	const [copiedMessengerTierId, setCopiedMessengerTierId] = useState<TreatmentPlanTierId | null>(null);

	const effectivePlanAgeDays = typeof planAgeDays === "number" ? planAgeDays : planCreatedAtIso ? Math.floor((Date.now() - new Date(planCreatedAtIso).getTime()) / (1000 * 60 * 60 * 24)) : 0;

	useEffect(() => {
		if (selectedTierId && selectedTierId !== activeTierId) setActiveTierId(selectedTierId);
	}, [selectedTierId, activeTierId]);

	const handleCardClick = (t: TreatmentPlanTier) => { setActiveTierId(t.tierId); onSelectTier?.(t); };
	const handleSignClick = (e: React.MouseEvent, t: TreatmentPlanTier) => { e.stopPropagation(); setActiveTierId(t.tierId); onApproveAndSign?.(t); };
	const handleInstallmentClick = (e: React.MouseEvent, t: TreatmentPlanTier) => { e.stopPropagation(); setActiveTierId(t.tierId); onOpenInstallment ? onOpenInstallment(t) : setActivePaymentMode("installment"); };
	const handlePrintClick = (e: React.MouseEvent, t: TreatmentPlanTier) => { e.stopPropagation(); setActiveTierId(t.tierId); onPrintContract?.(t); };
	const toggleStagesExpand = (e: React.MouseEvent, id: TreatmentPlanTierId) => { e.stopPropagation(); setExpandedStagesTierId((p) => (p === id ? null : id)); };

	const handleCopyEstimateToMessenger = (e: React.MouseEvent, t: TreatmentPlanTier) => {
		e.stopPropagation();
		const lines = [`[План лечения] «${t.title}»`, `[Стоимость]: ${formatPlanPriceRub(t.totalRub)}`, `[Рассрочка 0% клиники]: от ${formatPlanPriceRub(t.installments?.[12]?.monthlyPaymentRub ?? Math.round(t.totalRub / 12))}/мес на 12 мес.`, `[Гарантия]: ${formatWarrantyYearsText(t.warrantyYears)} | [Срок службы]: ${formatServiceLifeYearsText(t.serviceLifeYears, t.tierId)}`, `[Сроки]: ~${t.durationWeeks} нед. (${t.durationVisits} виз.)`, t.materialsHeadline ? `[Материалы]: ${t.materialsHeadline}` : "", t.ndflRefundRub ? `[Налоговый вычет 13%]: до +${formatPlanPriceRub(t.ndflRefundRub)} к возврату` : "", `Подготовлено в DENTE CRM. Соответствует клиническим протоколам СтАР.`].filter(Boolean).join("\n");
		if (typeof navigator !== "undefined" && navigator.clipboard) navigator.clipboard.writeText(lines).catch(() => {});
		setCopiedMessengerTierId(t.tierId);
		setTimeout(() => setCopiedMessengerTierId(null), 2500);
	};

	if (!tiers || tiers.length === 0) return null;
	if (tiers.every((t) => (t.itemsCount ?? 0) === 0 && (t.totalRub ?? 0) === 0)) return <TreatmentPlan3TierEmptyState className={className} />;

	const activeTier = tiers.find((t) => t.tierId === activeTierId) ?? tiers[0]!;
	const renderSingleTierCard = (tier: TreatmentPlanTier, isMobile: boolean) => (
		<TreatmentPlanTierCard key={tier.tierId} tier={tier} isSelected={activeTierId === tier.tierId} isMobile={isMobile} activePaymentMode={activePaymentMode} installmentMonths={installmentMonths} showNdflBreakdown={showNdflBreakdown} isExpandedStages={expandedStagesTierId === tier.tierId} copiedMessengerTierId={copiedMessengerTierId} onCardClick={handleCardClick} onSignClick={handleSignClick} onInstallmentClick={handleInstallmentClick} onCopyMessengerClick={handleCopyEstimateToMessenger} onPrintClick={onPrintContract ? handlePrintClick : undefined} onToggleStagesExpand={toggleStagesExpand} />
	);

	return (
		<div className={`treatment-3tier-comparison flex flex-col gap-3 w-full pb-44 sm:pb-2 ${className}`.trim()} data-testid="treatment-3tier-comparison">
			<TreatmentPlan3TierAgeWarning effectivePlanAgeDays={effectivePlanAgeDays} />
			<TreatmentPlan3TierToolbar activePaymentMode={activePaymentMode} onPaymentModeChange={setActivePaymentMode} installmentMonths={installmentMonths} onInstallmentMonthsChange={setInstallmentMonths} showNdflBreakdown={showNdflBreakdown} onToggleNdflBreakdown={() => setShowNdflBreakdown((p) => !p)} activeTier={activeTier} copiedMessengerTierId={copiedMessengerTierId} onCopyEstimateToMessenger={handleCopyEstimateToMessenger} onOpenComparatorStudio={onOpenComparatorStudio} onOpenStagePaymentStudio={onOpenStagePaymentStudio} onOpenPriceValidatorStudio={onOpenPriceValidatorStudio} />
			<TreatmentPlan3TierMobileSegmented tiers={tiers} activeTierId={activeTierId} onSelectTier={handleCardClick} getTierShortLabel={getTierShortLabel} />
			<div className="sm:hidden flex flex-col w-full min-w-0">{renderSingleTierCard(activeTier, true)}</div>
			<div className="hidden sm:grid sm:grid-cols-3 gap-3 sm:gap-4 items-stretch h-[calc(100vh-250px)] min-h-[500px] max-h-[620px] overflow-hidden">{tiers.map((t) => renderSingleTierCard(t, false))}</div>
			<TreatmentPlanRoadmapGrid activeTier={activeTier} />
			<TreatmentPlan3TierMobileThumbBar activeTier={activeTier} activePaymentMode={activePaymentMode} installmentMonths={installmentMonths} getTierShortLabel={getTierShortLabel} onSignClick={handleSignClick} />
		</div>
	);
};

export default TreatmentPlan3TierComparison;
