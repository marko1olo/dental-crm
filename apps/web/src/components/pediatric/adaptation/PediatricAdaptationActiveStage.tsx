import React from "react";
import { ChevronRight, Award } from "lucide-react";
import { ADAPTATION_STAGES } from "./adaptationStagesConstants";

interface PediatricAdaptationActiveStageProps {
	readonly currentStep: number;
	readonly onNextStep: () => void;
	readonly onOpenDiploma: () => void;
}

export const PediatricAdaptationActiveStage: React.FC<PediatricAdaptationActiveStageProps> = ({
	currentStep,
	onNextStep,
	onOpenDiploma,
}) => {
	const activeStage = ADAPTATION_STAGES.find((s) => s.stepNumber === currentStep) ?? ADAPTATION_STAGES[0]!;
	const StageIcon = activeStage.icon;
	const isLastStep = currentStep === 5;

	return (
		<div className="rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] p-3 mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xs">
			<div className="flex items-start gap-2.5 min-w-0">
				<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 shrink-0">
					<StageIcon className="h-5 w-5" />
				</div>
				<div className="min-w-0">
					<div className="flex items-center gap-2">
						<span className="text-[10px] font-black uppercase text-teal-700 dark:text-teal-300 font-mono">
							Шаг {currentStep} из 5
						</span>
						<h4 className="text-xs sm:text-sm font-black text-[var(--ink,#0f172a)] truncate">
							{activeStage.titleRu}
						</h4>
					</div>
					<p className="text-xs text-[var(--muted,#64748b)] mt-0.5 leading-relaxed font-medium">
						{activeStage.descriptionRu}
					</p>
				</div>
			</div>

			<div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
				{isLastStep ? (
					<button
						type="button"
						onClick={onOpenDiploma}
						className="min-h-[44px] sm:min-h-[36px] px-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition cursor-pointer select-none"
						data-testid="btn-open-bravery-diploma-from-step5"
					>
						<Award className="h-4 w-4" />
						<span>Вручить диплом</span>
					</button>
				) : (
					<button
						type="button"
						onClick={onNextStep}
						className="min-h-[44px] sm:min-h-[36px] px-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition cursor-pointer select-none"
						data-testid="btn-next-adaptation-stage"
					>
						<span>Следующий шаг</span>
						<ChevronRight className="h-4 w-4" />
					</button>
				)}
			</div>
		</div>
	);
};
