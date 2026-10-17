import React from "react";
import { Percent } from "lucide-react";
import type { TreatmentPlanTier } from "../types";
import { formatPlanPriceRub } from "../planPricing";

export interface TierCardPaymentModesProps {
	readonly tier: TreatmentPlanTier;
	readonly activePaymentMode: "installment" | "staged" | "discount";
	readonly installmentMonths: 3 | 6 | 12 | 24;
	readonly monthlyPayment: number;
	readonly stage1Rub: number;
	readonly stage2Rub: number;
	readonly stage3Rub: number;
	readonly discount5PctAmount: number;
	readonly priceWith5PctDiscount: number;
	readonly showNdflBreakdown: boolean;
}

export const TierCardPaymentModes: React.FC<TierCardPaymentModesProps> = ({
	tier, activePaymentMode, installmentMonths, monthlyPayment,
	stage1Rub, stage2Rub, stage3Rub, discount5PctAmount,
	priceWith5PctDiscount, showNdflBreakdown,
}) => (
	<>
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

		{activePaymentMode === "staged" && (
			<div className="space-y-1 text-[11px] pt-1.5 border-t border-[var(--line,var(--border,#cbd5e1))]/30">
				<div className="flex justify-between text-[var(--muted,#64748b)] gap-2">
					<span>1. Аванс/Санация (30%):</span>
					<strong className="font-mono text-[var(--ink,#0f172a)] whitespace-nowrap">{formatPlanPriceRub(stage1Rub)}</strong>
				</div>
				<div className="flex justify-between text-[var(--muted,#64748b)] gap-2">
					<span>2. Хирургия/Имплант (40%):</span>
					<strong className="font-mono text-[var(--ink,#0f172a)] whitespace-nowrap">{formatPlanPriceRub(stage2Rub)}</strong>
				</div>
				<div className="flex justify-between text-[var(--muted,#64748b)] gap-2">
					<span>3. Ортопедия (30%):</span>
					<strong className="font-mono text-[var(--ink,#0f172a)] whitespace-nowrap">{formatPlanPriceRub(stage3Rub)}</strong>
				</div>
			</div>
		)}

		{activePaymentMode === "discount" && (
			<div className="space-y-1 text-[11px] pt-1.5 border-t border-[var(--line,var(--border,#cbd5e1))]/30">
				<div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold gap-2">
					<span>Скидка 5% за 100% оплату:</span>
					<span className="font-mono whitespace-nowrap">-{formatPlanPriceRub(discount5PctAmount)}</span>
				</div>
				<div className="flex justify-between text-slate-800 dark:text-slate-200 font-bold gap-2">
					<span>Итого со скидкой:</span>
					<span className="font-mono text-[var(--teal,var(--brand-primary))] whitespace-nowrap">{formatPlanPriceRub(priceWith5PctDiscount)}</span>
				</div>
			</div>
		)}

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
					<span className="font-mono font-bold whitespace-nowrap">+{formatPlanPriceRub(tier.ndflRefundRub)}</span>
				</div>
				<div className="flex justify-between text-[10px] text-emerald-700 dark:text-emerald-400 gap-2">
					<span>С учетом возврата:</span>
					<span className="font-bold font-mono whitespace-nowrap">{formatPlanPriceRub(tier.priceWithNdflRefundRub)}</span>
				</div>
			</div>
		)}
	</>
);
