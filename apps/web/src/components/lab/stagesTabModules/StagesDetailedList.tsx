import React from "react";
import { Check } from "lucide-react";
import { LAB_ORDER_STAGES, type LabOrderStageKey } from "../labMath";

export interface StagesDetailedListProps {
	currentStage: LabOrderStageKey;
	setCurrentStage: (stage: LabOrderStageKey) => void;
}

export function StagesDetailedList({
	currentStage, setCurrentStage,
}: StagesDetailedListProps): React.JSX.Element {
	return (
		<div className="space-y-3">
			{LAB_ORDER_STAGES.map((stage, idx) => {
				const isCurrent = currentStage === stage.id;
				const isPassed = LAB_ORDER_STAGES.findIndex((s) => s.id === currentStage) > idx;

				return (
					<div
						key={stage.id}
						onClick={() => setCurrentStage(stage.id)}
						className={`min-h-[52px] p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
							isCurrent
								? `${stage.color} ring-2 ring-[var(--teal-soft)] shadow-md font-bold`
								: isPassed
								? "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 opacity-85"
								: "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-50 hover:opacity-100"
						}`}
					>
						<div className="flex items-center gap-3">
							<div
								className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
									isPassed || isCurrent
										? "bg-[var(--teal)] text-white"
										: "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
								}`}
							>
								{isPassed ? <Check className="w-4 h-4" /> : stage.step}
							</div>
							<div>
								<div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
									{stage.name}
								</div>
								<div className="text-xs text-slate-500 dark:text-slate-400">
									{stage.desc}
								</div>
							</div>
						</div>

						{isCurrent && (
							<span className="px-3 py-1 text-xs font-bold rounded-lg bg-[var(--teal)] text-white shadow-sm flex-shrink-0">
								Текущий этап
							</span>
						)}
					</div>
				);
			})}
		</div>
	);
}
