import React from "react";
import { PenTool } from "lucide-react";
import type { TreatmentPlanTier } from "./types";
import { formatPlanPriceRub } from "./planPricing";

export interface TreatmentPlan3TierMobileThumbBarProps {
	readonly activeTier: TreatmentPlanTier;
	readonly activePaymentMode: "installment" | "staged" | "discount";
	readonly installmentMonths: 3 | 6 | 12 | 24;
	readonly getTierShortLabel: (tier: TreatmentPlanTier) => string;
	readonly onSignClick: (e: React.MouseEvent, tier: TreatmentPlanTier) => void;
}

export const TreatmentPlan3TierMobileThumbBar: React.FC<TreatmentPlan3TierMobileThumbBarProps> = ({
	activeTier,
	activePaymentMode,
	installmentMonths,
	getTierShortLabel,
	onSignClick,
}) => {
	return (
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
				onClick={(e) => onSignClick(e, activeTier)}
				className="min-h-[52px] h-[52px] px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer shrink-0 transition-all touch-manipulation focus:outline-none focus:ring-2 focus:ring-emerald-500"
				data-testid="mobile-primary-sign-btn"
			>
				<PenTool size={16} className="shrink-0" />
				<span className="whitespace-nowrap">Утвердить план</span>
			</button>
		</div>
	);
};
