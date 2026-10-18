import React from "react";
import { Check } from "lucide-react";
import type { TreatmentPlanTier } from "../../types";

export interface TierCardAdvantagesAndStagesProps {
	readonly tier: TreatmentPlanTier;
}

export const TierCardAdvantagesAndStages: React.FC<TierCardAdvantagesAndStagesProps> = ({ tier }) => {
	return (
		<>
			<div className="treatment-tier-advantages">
				<div className="text-[11px] font-extrabold text-[var(--tp-text-muted)] uppercase tracking-wider">
					Материалы и технологии:
				</div>
				<div className="text-xs font-bold text-[var(--tp-text-main)] p-2 rounded-lg bg-[var(--tp-surface-soft)] border border-[var(--tp-border)] leading-snug line-clamp-2">
					{tier.materialsHeadline}
				</div>
				<ul className="list-none p-0 m-0 space-y-1.5 mt-1">
					{tier.keyAdvantages.slice(0, 4).map((adv, idx) => (
						<li key={idx} className="treatment-advantage-item">
							<Check size={14} className="treatment-advantage-icon shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
							<span className="text-xs sm:text-[12.5px] leading-snug">{adv}</span>
						</li>
					))}
				</ul>
			</div>

			<div className="treatment-tier-stages-strip">
				<div className="text-[10px] font-extrabold text-[var(--tp-text-muted)] uppercase">
					Смета по этапам лечения:
				</div>
				{tier.stages.map((st) => (
					<div key={st.stageNumber} className="treatment-tier-stage-line">
						<span className="truncate max-w-[170px] text-xs font-medium">
							Этап {st.stageNumber}: {st.title.split(":")[1] || st.title}
						</span>
						<span className="treatment-tier-stage-sum text-xs sm:text-sm font-bold font-mono text-[var(--tp-text-main)]">
							{(st.totalRub || 0).toLocaleString("ru-RU")} ₽
						</span>
					</div>
				))}
			</div>
		</>
	);
};
