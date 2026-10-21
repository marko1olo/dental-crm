import React from "react";
import { Sparkles } from "lucide-react";
import {
	CANONICAL_5_CLINICAL_LAB_STATUSES,
	mapTo5StageLabStatus,
	type LabOrderStageKey,
} from "../labMath";

export interface Stages5StageTrackerProps {
	currentStage: LabOrderStageKey;
	setCurrentStage: (stage: LabOrderStageKey) => void;
}

export function Stages5StageTracker({
	currentStage, setCurrentStage,
}: Stages5StageTrackerProps): React.JSX.Element {
	const mappedCurrent = mapTo5StageLabStatus(currentStage);

	const handleStageClick = (id: string) => {
		if (id === "sent") setCurrentStage("sent_to_lab");
		else if (id === "in_progress") setCurrentStage("in_progress");
		else if (id === "fitting") setCurrentStage("fitting_scheduled");
		else if (id === "ready") setCurrentStage("delivered_to_clinic");
		else if (id === "completed") setCurrentStage("completed");
	};

	return (
		<div
			className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-3"
			data-testid="lab-order-5stage-pipeline-tracker"
		>
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Sparkles className="w-4 h-4 text-[var(--teal)]" />
					<span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
						Этапы изготовления конструкции
					</span>
				</div>
				<span className="text-xs text-slate-500 font-medium">Клинический статус</span>
			</div>

			<div className="grid grid-cols-5 gap-2">
				{CANONICAL_5_CLINICAL_LAB_STATUSES.map((item) => {
					const isCurrent = mappedCurrent === item.id;
					const currentStep = CANONICAL_5_CLINICAL_LAB_STATUSES.find((s) => s.id === mappedCurrent)?.step ?? 1;
					const isPassed = currentStep >= item.step;

					return (
						<button
							key={item.id}
							type="button"
							onClick={() => handleStageClick(item.id)}
							className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer min-h-[44px] ${
								isCurrent
									? "bg-[var(--teal)] text-white border-[var(--teal)] font-bold shadow-md ring-2 ring-[var(--teal)]/40"
									: isPassed
									? "bg-teal-50 dark:bg-teal-950/40 border-teal-300 dark:border-teal-700 text-teal-900 dark:text-teal-200 font-semibold"
									: "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-400"
							}`}
							data-testid={`lab-order-5stage-btn-${item.id}`}
							title={item.descRu}
						>
							<div className="text-[10px] uppercase font-bold tracking-wider opacity-85">
								Этап {item.step}
							</div>
							<div className="text-xs font-bold truncate mt-0.5">{item.shortLabelRu}</div>
							<div className="text-[10px] mt-0.5 opacity-80">
								{isCurrent ? "Текущий" : isPassed ? "Пройден" : "Ожидание"}
							</div>
						</button>
					);
				})}
			</div>
		</div>
	);
}
