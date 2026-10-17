import React from "react";
import { ShieldCheck } from "lucide-react";
import { parseKopecks } from "@dental/shared";
import type { TreatmentPlanTier } from "../types";
import {
	calculateInstallmentScheduleKopecks,
	calculatePrepaymentDiscountKopecks,
	calculateStagedPaymentScheduleKopecks,
	formatPlanPriceRub,
	isPlanPriceImmutable,
} from "../planPricing";
import { TierCardPaymentModes } from "./TierCardPaymentModes";

export interface TierCardPricingProps {
	readonly tier: TreatmentPlanTier;
	readonly activePaymentMode: "installment" | "staged" | "discount";
	readonly installmentMonths: 3 | 6 | 12 | 24;
	readonly showNdflBreakdown: boolean;
}

export const TierCardPricing: React.FC<TierCardPricingProps> = ({
	tier, activePaymentMode, installmentMonths, showNdflBreakdown,
}) => {
	const safeTotalRub = Number.isFinite(tier.totalRub) ? tier.totalRub : 0;
	const effectiveTotalKopecks = tier.totalKopecks || (safeTotalRub > 0 ? parseKopecks(safeTotalRub) : 0);

	const exactInstallment = calculateInstallmentScheduleKopecks(effectiveTotalKopecks, installmentMonths);
	const monthlyPayment = tier.installments?.[installmentMonths]?.monthlyPaymentRub ?? exactInstallment.monthlyPaymentRub;

	const prepaymentDiscount = calculatePrepaymentDiscountKopecks(effectiveTotalKopecks, 5, true);
	const discount5PctAmount = prepaymentDiscount.discountRub;
	const priceWith5PctDiscount = prepaymentDiscount.finalPriceRub;

	const exactStaged = calculateStagedPaymentScheduleKopecks(effectiveTotalKopecks, [30, 40, 30]);
	const stage1Rub = tier.stagedSchedule?.stage1AdvanceTherapyRub ?? exactStaged.stage1Rub;
	const stage2Rub = tier.stagedSchedule?.stage2SurgeryImplantRub ?? exactStaged.stage2Rub;
	const stage3Rub = tier.stagedSchedule?.stage3OrthopedicsRub ?? (safeTotalRub - stage1Rub - stage2Rub);

	const isTierImmutable = isPlanPriceImmutable(tier.workflowStatus) || Boolean(tier.isPriceLocked);
	const hasPriceDrift = Boolean(tier.hasPriceDrift || (tier.catalogDriftRub && Math.abs(tier.catalogDriftRub) > 0));

	return (
		<div className="p-3 sm:p-3 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,var(--border,#cbd5e1))]/50 space-y-1 sm:space-y-1.5">
			<div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 sm:gap-2">
				<span className="text-xs text-[var(--muted,#64748b)] font-semibold uppercase tracking-wider">
					Полная стоимость:
				</span>
				<span className="text-2xl sm:text-xl font-black text-[var(--ink,#0f172a)] font-mono tracking-tight whitespace-nowrap">
					{formatPlanPriceRub(tier.totalRub)}
				</span>
			</div>

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

			{hasPriceDrift && tier.catalogDriftRub !== undefined && (
				<div
					className="text-[10px] text-slate-600 dark:text-slate-400 font-medium bg-slate-200/50 dark:bg-slate-800/50 px-2 py-0.5 rounded border border-slate-300/50 dark:border-slate-700/50"
					data-testid={`tier-drift-badge-${tier.tierId}`}
					title="Цены в действующем каталоге изменились, смета тарифа сохранена неизменной"
				>
					В прайсе: {formatPlanPriceRub(safeTotalRub + tier.catalogDriftRub)} · В плане зафиксировано: {formatPlanPriceRub(safeTotalRub)}
				</div>
			)}

			<TierCardPaymentModes
				tier={tier}
				activePaymentMode={activePaymentMode}
				installmentMonths={installmentMonths}
				monthlyPayment={monthlyPayment}
				stage1Rub={stage1Rub}
				stage2Rub={stage2Rub}
				stage3Rub={stage3Rub}
				discount5PctAmount={discount5PctAmount}
				priceWith5PctDiscount={priceWith5PctDiscount}
				showNdflBreakdown={showNdflBreakdown}
			/>
		</div>
	);
};
