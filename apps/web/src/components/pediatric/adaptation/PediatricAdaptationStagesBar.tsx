import React from "react";
import { Check } from "lucide-react";
import { ADAPTATION_STAGES, type AdaptationStageItem } from "./adaptationStagesConstants";

interface PediatricAdaptationStagesBarProps {
	readonly currentStep: number;
	readonly completedSteps: readonly number[];
	readonly onSelectStep: (stepNumber: number) => void;
}

export const PediatricAdaptationStagesBar: React.FC<PediatricAdaptationStagesBarProps> = ({
	currentStep,
	completedSteps,
	onSelectStep,
}) => {
	return (
		<div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 sm:gap-2 mb-3" data-testid="adaptation-stages-bar">
			{ADAPTATION_STAGES.map((st: AdaptationStageItem) => {
				const isCurrent = currentStep === st.stepNumber;
				const isCompleted = completedSteps.includes(st.stepNumber);
				const StageIcon = st.icon;

				return (
					<button
						key={st.id}
						type="button"
						onClick={() => onSelectStep(st.stepNumber)}
						className={`min-h-[44px] sm:min-h-[48px] p-2 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer select-none active:scale-[0.98] ${
							isCurrent
								? "bg-teal-600 text-white border-teal-600 shadow-xs ring-2 ring-teal-500/20"
								: isCompleted
									? "bg-emerald-50 text-emerald-950 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800"
									: "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border-[var(--line,#e2e8f0)] hover:bg-[var(--paper-soft,#f8fafc)]"
						}`}
						data-testid={`adaptation-stage-btn-${st.stepNumber}`}
					>
						<div className="flex items-center justify-between gap-1 w-full">
							<span className={`text-[10px] font-black uppercase font-mono ${isCurrent ? "text-white/90" : "text-[var(--muted,#64748b)]"}`}>
								{st.shortLabelRu}
							</span>
							{isCompleted && !isCurrent && <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
							<StageIcon className={`h-4 w-4 shrink-0 ${isCurrent ? "text-white" : "text-[var(--muted,#64748b)]"}`} />
						</div>
						<div className="text-xs font-extrabold truncate mt-1">{st.titleRu}</div>
					</button>
				);
			})}
		</div>
	);
};
