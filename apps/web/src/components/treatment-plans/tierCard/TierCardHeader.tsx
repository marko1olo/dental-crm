import React from "react";
import { Clock, Crown } from "lucide-react";
import type { TreatmentPlanTier } from "../types";

export interface TierCardHeaderProps {
	readonly tier: TreatmentPlanTier;
}

export const TierCardHeader: React.FC<TierCardHeaderProps> = ({ tier }) => {
	const shortTitle = tier.title.split("(")[0]?.trim();

	return (
		<>
			{tier.isRecommended && (
				<div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal-dark,var(--teal))] border border-[var(--teal,var(--brand-primary))]/20 text-[11px] font-bold shadow-xs uppercase tracking-wider whitespace-nowrap z-30 self-center mb-1 -mt-0.5">
					<Crown size={12} className="text-[var(--teal,var(--brand-primary))]" />
					<span>{tier.badge}</span>
				</div>
			)}

			<div className="space-y-1.5 pt-1 min-w-0">
				<div className="flex items-center justify-between gap-2 min-w-0">
					<span
						className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border truncate max-w-[160px] whitespace-nowrap ${tier.badgeClass}`}
						title={shortTitle}
					>
						{shortTitle}
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
		</>
	);
};
