import { StaffActionAuditService } from "../../../../services/audit/staffActionAuditService.js";
import { pushDestructiveActionWithRollback } from "../../../../services/undo/globalUndoRollbackStack.js";
import { removeItemFromStages } from "../../treatmentPlanStageMutations.js";
import type { PlanStageMutationContext, TreatmentPlanItem } from "../types.js";

export function executeRemovePlanItem(
	ctx: PlanStageMutationContext,
	itemId: string,
) {
	const { patientId, stages, currentPlanId, setCustomStages } = ctx;
	let targetItem: TreatmentPlanItem | undefined;
	let targetStageIndex = -1;
	let targetItemIndex = -1;

	for (let sIdx = 0; sIdx < stages.length; sIdx++) {
		const stg = stages[sIdx];
		if (!stg) continue;
		const itIdx = stg.items.findIndex((it) => it.id === itemId);
		if (itIdx !== -1) {
			targetItem = stg.items[itIdx];
			targetStageIndex = sIdx;
			targetItemIndex = itIdx;
			break;
		}
	}

	if (!targetItem || targetStageIndex === -1) return;
	setCustomStages(removeItemFromStages(stages, itemId));

	StaffActionAuditService.logServiceRemove({
		patientId,
		planId: currentPlanId || "default_plan",
		serviceCode: targetItem.code804n,
		serviceName: targetItem.name,
		amountKopecks: Math.round((targetItem.priceRub || 0) * 100),
	});

	pushDestructiveActionWithRollback({
		entityType: "treatment_plan_item",
		description: `«${targetItem.name}» удалена из плана лечения`,
		item: targetItem,
		index: targetItemIndex,
		parentId: String(stages[targetStageIndex]?.stageNumber ?? targetStageIndex),
		onRollback: (item, index) => {
			setCustomStages((prev) => {
				if (!prev) return [];
				return prev.map((stg, sIdx) => {
					if (sIdx !== targetStageIndex) return stg;
					const nextItems = [...stg.items];
					nextItems.splice(index, 0, item as TreatmentPlanItem);
					return { ...stg, items: nextItems };
				});
			});
		},
	});
}
