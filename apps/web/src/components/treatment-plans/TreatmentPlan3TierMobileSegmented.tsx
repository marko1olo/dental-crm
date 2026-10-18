import React from "react";
import { Star } from "lucide-react";
import type { TreatmentPlanTier, TreatmentPlanTierId } from "./types";

export interface TreatmentPlan3TierMobileSegmentedProps {
	readonly tiers: readonly TreatmentPlanTier[];
	readonly activeTierId: TreatmentPlanTierId;
	readonly onSelectTier: (tier: TreatmentPlanTier) => void;
	readonly getTierShortLabel: (tier: TreatmentPlanTier) => string;
}

export const TreatmentPlan3TierMobileSegmented: React.FC<TreatmentPlan3TierMobileSegmentedProps> = ({
	tiers,
	activeTierId,
	onSelectTier,
	getTierShortLabel,
}) => {
	return (
		<div
			className="treatment-mobile-tier-bar sm:hidden w-full p-1.5 rounded-2xl bg-[var(--paper-soft,#f1f5f9)] dark:bg-[#0d1615] border border-[var(--line,var(--border,#cbd5e1))] dark:border-white/10 shadow-inner flex items-stretch gap-1.5"
			data-testid="treatment-3tier-segmented-control"
		>
			{tiers.map((tier) => {
				const isCurrent = activeTierId === tier.tierId;
				const shortLabel = getTierShortLabel(tier);
				const hasExplicitRecommendation = tiers.some((t) => t.isRecommended);
				const isRecommended = hasExplicitRecommendation
					? Boolean(tier.isRecommended)
					: tier.tierId === "standard";
				return (
					<button
						key={tier.tierId}
						type="button"
						onClick={() => onSelectTier(tier)}
						className={`treatment-mobile-tier-btn ${isCurrent ? "active " : ""}${tier.tierId} flex-1 min-h-[50px] py-1 px-2 rounded-xl text-center transition-all duration-200 cursor-pointer flex flex-col items-center justify-center min-w-0 touch-manipulation ${
							isCurrent
								? "bg-[var(--paper-strong,#ffffff)] dark:bg-[#15211f] text-[var(--ink,#0f172a)] dark:text-[#f8fafc] shadow-md font-extrabold ring-1 ring-[var(--teal,var(--brand-primary))]/40"
								: "bg-[var(--paper-soft,#f8fafc)] dark:bg-[#1e293b] text-[var(--ink,#1e293b)] dark:text-[#f8fafc] border border-[var(--line,#e2e8f0)] dark:border-white/10 hover:text-[var(--ink,#0f172a)] font-medium"
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
						<span
							className={`text-[11px] font-mono font-bold whitespace-nowrap mt-0.5 tier-price ${
								isCurrent ? "text-[var(--teal,var(--brand-primary))]" : "opacity-90 text-[var(--ink-secondary,#475569)] dark:text-[#cbd5e1]"
							}`}
						>
							{tier.totalRub.toLocaleString("ru-RU")} ₽
						</span>
					</button>
				);
			})}
		</div>
	);
};
