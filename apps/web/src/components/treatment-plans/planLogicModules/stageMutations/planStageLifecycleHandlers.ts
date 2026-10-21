import { pushDestructiveActionWithRollback } from "../../../../services/undo/globalUndoRollbackStack.js";
import { showToast } from "../../../GlobalToast.js";
import { dispatchStageStartEvents } from "../../treatmentPlanNetworkSync.js";
import { createNewStageInPlan } from "../../treatmentPlanStageMutations.js";
import type {
	PlanStageMutationContext,
	TreatmentPlanCreateStagePresetKind,
	TreatmentPlanStage,
	TreatmentPlanStageStatus,
} from "../types.js";

export function createPlanStageLifecycleHandlers(ctx: PlanStageMutationContext) {
	const { patientId, patientName, stages, currentPlanId, setCustomStages } = ctx;

	const handleCreateNewStage = (presetKind: TreatmentPlanCreateStagePresetKind, customTitle?: string) => {
		const { nextStages, createdTitle } = createNewStageInPlan(stages, presetKind, customTitle);
		setCustomStages(nextStages);
		showToast(`Создан новый этап: «${createdTitle}»`, "success");
	};

	const handleDeleteStage = (stageToDelete: TreatmentPlanStage) => {
		const targetIndex = stages.findIndex((s) => s.stageNumber === stageToDelete.stageNumber);
		if (targetIndex === -1) return;

		const updated = stages.filter((s) => s.stageNumber !== stageToDelete.stageNumber);
		setCustomStages(updated);

		pushDestructiveActionWithRollback({
			entityType: "treatment_plan_stage",
			description: `Этап №${stageToDelete.stageNumber} («${stageToDelete.title}») удален`,
			item: stageToDelete,
			index: targetIndex,
			parentId: currentPlanId || "default_plan",
			onRollback: (item, index) => {
				setCustomStages((prev) => {
					const next = prev ? [...prev] : [];
					next.splice(index, 0, item as TreatmentPlanStage);
					return next;
				});
			},
		});
	};

	const handleStartStage = (stageToStart: TreatmentPlanStage) => {
		const updated = stages.map((s) =>
			s.stageNumber === stageToStart.stageNumber ? { ...s, status: "in_progress" as const } : s,
		);
		setCustomStages(updated);
		showToast(
			`Этап №${stageToStart.stageNumber} («${stageToStart.title}») активирован и передан в работу визита (${stageToStart.items.length} услуг)`,
			"success",
			4000,
		);
		dispatchStageStartEvents(patientId, patientName, stageToStart);
	};

	const handleChangeStageStatus = (stageToChange: TreatmentPlanStage, newStatus: TreatmentPlanStageStatus) => {
		const updated = stages.map((s) =>
			s.stageNumber === stageToChange.stageNumber ? { ...s, status: newStatus } : s,
		);
		setCustomStages(updated);
		showToast(`Статус этапа №${stageToChange.stageNumber} изменен на «${newStatus}»`, "info");
	};

	return {
		handleCreateNewStage,
		handleDeleteStage,
		handleStartStage,
		handleChangeStageStatus,
	};
}
