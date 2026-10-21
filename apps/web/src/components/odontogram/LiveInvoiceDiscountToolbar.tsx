import { Percent } from "lucide-react";
import type React from "react";

export interface LiveInvoiceDiscountToolbarProps {
	readonly discountPercent: number;
	readonly isDiscountCustom: boolean;
	readonly onSetQuickDiscount: (pct: number) => void;
}

const QUICK_DISCOUNTS = [0, 5, 10, 15, 20, 50, 100] as const;

export const LiveInvoiceDiscountToolbar: React.FC<
	LiveInvoiceDiscountToolbarProps
> = ({ discountPercent, isDiscountCustom, onSetQuickDiscount }) => {
	return (
		<div className="px-3.5 py-2 bg-[var(--paper-strong,var(--paper,#ffffff))] border-b border-[var(--border,#cbd5e1)] flex items-center justify-between gap-2 text-xs">
			<span className="text-xs font-semibold text-[var(--muted,#64748b)] flex items-center gap-1">
				<Percent size={12} /> Скидка:
			</span>
			<div className="flex items-center gap-1 overflow-x-auto pb-0.5">
				{QUICK_DISCOUNTS.map((pct) => (
					<button
						key={pct}
						type="button"
						onClick={() => onSetQuickDiscount(pct)}
						className={`min-h-[44px] sm:min-h-[32px] px-2.5 py-1 rounded-md font-mono text-xs font-bold border transition-all cursor-pointer ${
							!isDiscountCustom && discountPercent === pct
								? pct === 100
									? "bg-emerald-600 text-white border-emerald-700 shadow-xs ring-2 ring-emerald-400"
									: "bg-teal-600 text-white border-teal-700 shadow-xs"
								: "bg-[var(--paper-soft,#f8fafc)] text-[var(--muted,#64748b)] border-[var(--border,#cbd5e1)] hover:text-[var(--ink,#0f172a)]"
						}`}
						title={
							pct === 100
								? "100% скидка на гарантийную переделку или персонал"
								: `Скидка ${pct}%`
						}
					>
						{pct === 0 ? "0%" : pct === 100 ? "100% (Гарантия)" : `${pct}%`}
					</button>
				))}
			</div>
		</div>
	);
};
