/**
 * apps/web/src/components/visit/billing/VisitBillingTotalsSummary.tsx
 * Gross totals, doctor discount summary, and final total due.
 * Compliant with Mandate 8b (<= 120 lines).
 */

import React from "react";
import type { VisitBillingTotals } from "../visitBillingTypes.js";
import { VisitBillingDiscountPopover } from "./VisitBillingDiscountPopover.js";

export interface VisitBillingTotalsSummaryProps {
	totals: VisitBillingTotals;
	isGlobalWarranty100: boolean;
	globalDiscountPercent: number;
	globalDiscountReason: string;
	onApplyGlobalDiscount: (percent: number, reason: string) => void;
}

export const VisitBillingTotalsSummary: React.FC<VisitBillingTotalsSummaryProps> = ({
	totals,
	isGlobalWarranty100,
	globalDiscountPercent,
	globalDiscountReason,
	onApplyGlobalDiscount,
}) => {
	return (
		<div className="flex items-center justify-between flex-wrap gap-2 text-xs">
			<div className="space-y-0.5">
				<div className="text-[var(--muted,#64748b)]">
					Сумма по прейскуранту:{" "}
					<strong className="text-[var(--ink,#0f172a)] font-mono">
						{totals.rawTotalRub.toLocaleString("ru-RU")} ₽
					</strong>
				</div>
				{totals.discountRub > 0 && (
					<div className="text-amber-700 dark:text-amber-300 font-medium">
						Скидка врача:{" "}
						<strong className="font-mono">
							-{totals.discountRub.toLocaleString("ru-RU")} ₽ ({totals.effectiveDiscountPercent}%)
						</strong>
					</div>
				)}
				{totals.totalLabCostRub && totals.totalLabCostRub > 0 ? (
					<div className="text-amber-800 dark:text-amber-300 font-medium" data-testid="badge-total-lab-cost">
						Себестоимость ЗТЛ:{" "}
						<strong className="font-mono">
							{totals.totalLabCostRub.toLocaleString("ru-RU")} ₽
						</strong>
					</div>
				) : null}
			</div>

			<div className="flex items-center gap-3 flex-wrap">
				<VisitBillingDiscountPopover
					isGlobalWarranty100={isGlobalWarranty100}
					globalDiscountPercent={globalDiscountPercent}
					globalDiscountReason={globalDiscountReason}
					onApplyGlobalDiscount={onApplyGlobalDiscount}
				/>

				<div className="text-right">
					<div className="text-xs text-[var(--muted,#64748b)] uppercase tracking-wider font-semibold">
						Итого к оплате:
					</div>
					<div
						className={`text-lg font-black font-mono ${
							totals.isWarranty100
								? "text-emerald-600 dark:text-emerald-400"
								: "text-[var(--ink,#0f172a)]"
						}`}
						data-testid="visit-billing-total-due"
					>
						{totals.isWarranty100 ? "0 ₽ (Гарантия)" : `${totals.totalDueRub.toLocaleString("ru-RU")} ₽`}
					</div>
				</div>
			</div>
		</div>
	);
};
