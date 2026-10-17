import React from "react";
import { Check, ChevronDown, ChevronUp, Layers } from "lucide-react";
import type { TreatmentPlanTier, TreatmentPlanTierId } from "../types";
import { formatPlanPriceRub } from "../planPricing";
import { isMicroConsumable } from "../treatmentPlanConsumables";

export interface TierCardStagesAccordionProps {
	readonly tier: TreatmentPlanTier;
	readonly isMobile: boolean;
	readonly isExpandedStages: boolean;
	readonly onToggleStagesExpand: (e: React.MouseEvent, tierId: TreatmentPlanTierId) => void;
}

export const TierCardStagesAccordion: React.FC<TierCardStagesAccordionProps> = ({
	tier,
	isMobile,
	isExpandedStages,
	onToggleStagesExpand,
}) => {
	return (
		<div className="pt-1.5 border-t border-[var(--line,var(--border,#cbd5e1))]/60">
			<button
				type="button"
				onClick={(e) => onToggleStagesExpand(e, tier.tierId)}
				className="w-full min-h-[44px] sm:min-h-[32px] sm:h-8 flex items-center justify-between text-xs font-bold text-[var(--ink,#0f172a)] hover:text-[var(--teal,var(--brand-primary))] cursor-pointer py-1.5"
			>
				<span className="flex items-center gap-1.5 min-w-0">
					<Layers size={14} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
					<span className="truncate">Клинические этапы I, II, III ({tier.stages.length})</span>
				</span>
				{isExpandedStages ? <ChevronUp size={14} className="shrink-0" /> : <ChevronDown size={14} className="shrink-0" />}
			</button>

			{isExpandedStages && (
				<div
					className={
						isMobile
							? "mt-2 space-y-2 text-[11px]"
							: "mt-1.5 max-h-56 overflow-y-auto min-h-0 divide-y divide-[var(--line,var(--border,#cbd5e1))]/40 text-[11px] px-1 py-1"
					}
				>
					{tier.stages.map((stg) => {
						const displayItems = stg.items.filter((it) => !isMicroConsumable(it));
						const limit = isMobile ? 6 : 4;

						return (
							<div
								key={stg.stageNumber}
								className={
									isMobile
										? "p-2.5 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,var(--border,#cbd5e1))]/60 space-y-1 min-w-0 shadow-2xs"
										: "py-1.5 first:pt-0 last:pb-0 space-y-0.5 min-w-0"
								}
							>
								<div className="flex justify-between items-center font-bold gap-2 min-w-0">
									<span className="text-[var(--teal-dark,var(--teal))] truncate min-w-0" title={stg.title}>
										Этап {stg.stageNumber}: {stg.title.split(":")[1]?.trim() || stg.title}
									</span>
									<span className="font-mono text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0">
										{formatPlanPriceRub(stg.totalRub)}
									</span>
								</div>
								<p className="text-[10px] text-[var(--muted,#64748b)] m-0 truncate" title={stg.clinicalGoal}>
									{stg.clinicalGoal} · ~{stg.estimatedWeeks} нед. ({stg.estimatedVisits} виз.)
								</p>
								{displayItems.length > 0 && (
									<ul
										className={
											isMobile
												? "text-[10px] text-[var(--muted,#64748b)] space-y-1 pl-1.5 border-l-2 border-[var(--teal,var(--brand-primary))]/40 m-0 list-none mt-1.5 min-w-0"
												: "max-h-24 overflow-y-auto min-h-0 text-[9px] text-[var(--muted,#64748b)] space-y-0.5 pl-1.5 border-l border-[var(--teal,var(--brand-primary))]/30 m-0 list-none mt-1 min-w-0"
										}
									>
										{displayItems.slice(0, limit).map((it) => (
											<li key={it.id} className="truncate min-w-0 flex items-center gap-1.5" title={it.name}>
												<Check size={11} className="text-teal-600 dark:text-teal-400 shrink-0" />
												<span className="truncate">{it.toothNumber ? `Зуб ${it.toothNumber}: ` : ""}{it.name}</span>
											</li>
										))}
										{displayItems.length > limit && (
											<li className="italic text-[var(--teal,var(--brand-primary))] truncate min-w-0 pl-4">
												+ еще {displayItems.length - limit} процедур
											</li>
										)}
									</ul>
								)}
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
};
