import React from "react";
import { Calculator } from "lucide-react";
import { formatChairsidePrice } from "../treatmentPlanPricingEngine.js";

export interface DiscountsSummaryBoxProps {
	readonly summary: {
		grossKopecks: number;
		discountKopecks: number;
		appliedBonusRub: number;
		netPayableRub: number;
	};
	readonly discountPercent: number;
}

export const DiscountsSummaryBox: React.FC<DiscountsSummaryBoxProps> = ({
	summary,
	discountPercent,
}) => {
	return (
		<div className="p-3 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,var(--border,#cbd5e1))] space-y-1.5 text-xs font-mono">
			<div className="flex items-center justify-between text-[var(--muted)]">
				<span>Базовая смета плана:</span>
				<span className="font-bold">{formatChairsidePrice(Math.round(summary.grossKopecks / 100))}</span>
			</div>
			{summary.discountKopecks > 0 && (
				<div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
					<span>Скидка врача ({discountPercent}%):</span>
					<span className="font-bold">−{formatChairsidePrice(Math.round(summary.discountKopecks / 100))}</span>
				</div>
			)}
			{summary.appliedBonusRub > 0 && (
				<div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
					<span>Оплата бонусами/депозитом:</span>
					<span className="font-bold">−{formatChairsidePrice(summary.appliedBonusRub)}</span>
				</div>
			)}
			<div className="pt-1.5 border-t border-[var(--line)] flex items-center justify-between font-bold text-sm text-[var(--ink)]">
				<span className="flex items-center gap-1 font-sans">
					<Calculator size={14} className="text-[var(--teal)]" />
					Итого к оплате пациентом:
				</span>
				<span className="text-[var(--teal)]">{formatChairsidePrice(summary.netPayableRub)}</span>
			</div>
		</div>
	);
};
