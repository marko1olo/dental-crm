import React from "react";
import { AlertTriangle } from "lucide-react";
import type { LabOrderStageKey } from "./labMath";
import { checkFittingAppointmentCollision } from "./dentalLabOrderEngine";
import { StagesTrialDatesBox } from "./stagesTabModules/StagesTrialDatesBox";
import { Stages5StageTracker } from "./stagesTabModules/Stages5StageTracker";
import { StagesDetailedList } from "./stagesTabModules/StagesDetailedList";

export interface DentalLabStagesTabProps {
	dueDate: string;
	setDueDate: (date: string) => void;
	frameworkTrialDate: string;
	setFrameworkTrialDate: (date: string) => void;
	ceramicTrialDate: string;
	setCeramicTrialDate: (date: string) => void;
	currentStage: LabOrderStageKey;
	setCurrentStage: (stage: LabOrderStageKey) => void;
	scheduledVisitDate?: string;
}

export function DentalLabStagesTab({
	dueDate, setDueDate, frameworkTrialDate, setFrameworkTrialDate,
	ceramicTrialDate, setCeramicTrialDate, currentStage, setCurrentStage, scheduledVisitDate,
}: DentalLabStagesTabProps) {
	const collision = checkFittingAppointmentCollision(dueDate, scheduledVisitDate);

	return (
		<div className="space-y-6">
			{collision.hasCollision && (
				<div
					className="p-3.5 rounded-xl bg-amber-500/15 border-2 border-amber-500/50 flex items-start gap-3 text-xs text-amber-950 dark:text-amber-100"
					data-testid="lab-order-fitting-collision-banner"
				>
					<AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
					<div className="space-y-1">
						<div className="font-extrabold text-amber-900 dark:text-amber-100">
							Внимание: прием на примерку назначен раньше готовности лаборатории!
						</div>
						<div className="text-[11px] text-amber-800 dark:text-amber-200">
							{collision.warningRu || "Прием на примерку назначен раньше расчетного срока готовности лаборатории."}
						</div>
					</div>
				</div>
			)}
			<div>
				<h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 m-0">
					Жизненный цикл, трекинг ЗТЛ и даты примерок
				</h3>
				<p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
					Пошаговый трекер технологических этапов от передачи оттисков до фиксации в полости рта.
				</p>
			</div>

			<StagesTrialDatesBox
				dueDate={dueDate} setDueDate={setDueDate}
				frameworkTrialDate={frameworkTrialDate} setFrameworkTrialDate={setFrameworkTrialDate}
				ceramicTrialDate={ceramicTrialDate} setCeramicTrialDate={setCeramicTrialDate}
			/>

			<Stages5StageTracker currentStage={currentStage} setCurrentStage={setCurrentStage} />

			<StagesDetailedList currentStage={currentStage} setCurrentStage={setCurrentStage} />
		</div>
	);
}
