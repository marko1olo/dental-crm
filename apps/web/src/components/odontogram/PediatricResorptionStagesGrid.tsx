import React from "react";
import { Check } from "lucide-react";
import {
	RESORPTION_STAGE_DEFINITIONS,
	type ResorptionStagePercent,
} from "./pediatricDentitionEngine";
import { RESORPTION_STAGES } from "./pediatricResorptionConstants";

export interface PediatricResorptionStagesGridProps {
	readonly selectedResorptionStage: ResorptionStagePercent;
	readonly onSelectStage: (stage: ResorptionStagePercent) => void;
}

export const PediatricResorptionStagesGrid: React.FC<PediatricResorptionStagesGridProps> = ({
	selectedResorptionStage,
	onSelectStage,
}) => {
	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
			{RESORPTION_STAGES.map((stage) => {
				const def = RESORPTION_STAGE_DEFINITIONS[stage];
				const isSelected = selectedResorptionStage === stage;
				return (
					<button
						key={stage}
						type="button"
						onClick={() => onSelectStage(stage)}
						className={`min-h-[120px] p-4 rounded-2xl border-2 flex flex-col justify-between text-left transition-all cursor-pointer select-none active:scale-[0.98] ${
							isSelected
								? "border-teal-600 bg-teal-500/15 shadow-lg shadow-teal-500/10 ring-2 ring-teal-500/30"
								: "border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] dark:border-slate-800 bg-[var(--odontogram-surface,var(--paper-soft,#f8fafc))] dark:bg-slate-900 hover:border-teal-400 hover:bg-[var(--odontogram-surface-hover,var(--paper-strong,#f1f5f9))] dark:hover:bg-slate-800/80"
						}`}
					>
						<div className="flex items-center justify-between w-full">
							<span
								className="min-h-[28px] min-w-[44px] inline-flex items-center justify-center px-3 py-1 rounded-xl text-xs sm:text-sm font-black"
								style={{ backgroundColor: def.badgeBg, color: def.badgeColor }}
							>
								{stage}%
							</span>
							<span className="text-xs sm:text-sm font-bold text-[var(--odontogram-ink-muted,var(--muted,#64748b))] dark:text-slate-400">
								{def.expectedMobilityDegree} ст.
							</span>
						</div>

						<div className="my-2 space-y-1">
							<div className="text-sm font-black text-[var(--odontogram-ink,var(--ink,#0f172a))] dark:text-slate-100 leading-snug">
								{def.nameRu}
							</div>
							<div className="text-xs sm:text-sm text-[var(--odontogram-ink-muted,var(--muted,#64748b))] dark:text-slate-400 line-clamp-2 font-medium">
								{def.clinicalSignRu}
							</div>
						</div>

						<div className="text-xs sm:text-sm font-mono font-bold text-teal-600 dark:text-teal-400 flex items-center gap-1.5 pt-1">
							{isSelected ? <Check className="w-4 h-4 shrink-0" /> : null}
							<span>{isSelected ? "Выбрано" : "Выбрать"}</span>
						</div>
					</button>
				);
			})}
		</div>
	);
};
