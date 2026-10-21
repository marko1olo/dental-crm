import { StaffActionAuditService } from "../../../../services/audit/staffActionAuditService.js";
import { pushDestructiveActionWithRollback } from "../../../../services/undo/globalUndoRollbackStack.js";
import { showToast } from "../../../GlobalToast.js";
import {
	addItemToPlanStages,
	assignDoctorToItemInStages,
	assignDoctorToStageInStages,
	removeItemFromStages,
	updateItemInStages,
	updateItemPriceInStages,
	updateItemQuantityInStages,
} from "../../treatmentPlanStageMutations.js";
import type { PlanStageMutationContext, TreatmentPlanItem, TreatmentPlanStage } from "../types.js";

export function createPlanItemHandlers(ctx: PlanStageMutationContext) {
	const { patientId, stages, currentPlanId, discountPercent, setCustomStages } = ctx;

	const handleUpdateItemQuantity = (itemId: string, newQty: number) => {
		setCustomStages(updateItemQuantityInStages(stages, itemId, newQty, discountPercent));
	};

	const handleUpdateItemPrice = (itemId: string, newPriceRub: number) => {
		setCustomStages(updateItemPriceInStages(stages, itemId, newPriceRub, discountPercent));
		showToast(`Цена услуги обновлена: ${newPriceRub.toLocaleString("ru-RU")} ₽`, "success");
	};

	const handleUpdateItem = (updatedItem: TreatmentPlanItem) => {
		setCustomStages(updateItemInStages(stages, updatedItem, discountPercent));
		showToast(`Процедура «${updatedItem.name}» обновлена`, "success");
	};

	const handleRemoveItem = (itemId: string) => {
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
	};

	const handleAssignDoctorToStage = (
		stage: TreatmentPlanStage,
		doctorId: string | null,
		doctorName: string | null,
		doctorSpecialty: string | null,
	) => {
		setCustomStages(assignDoctorToStageInStages(stages, stage.stageNumber, doctorId, doctorName, doctorSpecialty));
		if (doctorName) showToast(`Врач ${doctorName} назначен на этап ${stage.stageNumber}`, "success");
		else showToast(`Назначение врача с этапа ${stage.stageNumber} снято`, "info");
	};

	const handleAssignDoctorToItem = (
		itemId: string,
		doctorId: string | null,
		doctorName: string | null,
		doctorSpecialty: string | null,
	) => {
		setCustomStages(assignDoctorToItemInStages(stages, itemId, doctorId, doctorName, doctorSpecialty));
		if (doctorName) showToast(`Врач ${doctorName} назначен на процедуру`, "success");
		else showToast("Назначение врача на процедуру снято", "info");
	};

	const handleAddItemToStage = (targetStageNumber: number, newItemData: Partial<TreatmentPlanItem>) => {
		const nextStages = addItemToPlanStages(stages, targetStageNumber, newItemData);
		setCustomStages(nextStages);
		StaffActionAuditService.logServiceAdd({
			patientId,
			planId: currentPlanId || "default_plan",
			serviceCode: newItemData.code804n || "804n_service",
			serviceName: newItemData.name || "Услуга",
			amountKopecks: newItemData.priceRub ? Math.round(newItemData.priceRub * 100) : 0,
			...(newItemData.toothNumber ? { toothNumber: newItemData.toothNumber } : {}),
		});
		showToast(`Услуга «${newItemData.name || "Услуга"}» добавлена в этап №${targetStageNumber}`, "success");
	};

	return {
		handleUpdateItemQuantity,
		handleUpdateItemPrice,
		handleUpdateItem,
		handleRemoveItem,
		handleAssignDoctorToStage,
		handleAssignDoctorToItem,
		handleAddItemToStage,
	};
}
