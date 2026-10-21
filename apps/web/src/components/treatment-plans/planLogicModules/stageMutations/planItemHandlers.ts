import { StaffActionAuditService } from "../../../../services/audit/staffActionAuditService.js";
import { showToast } from "../../../GlobalToast.js";
import {
	addItemToPlanStages,
	assignDoctorToItemInStages,
	assignDoctorToStageInStages,
	updateItemInStages,
	updateItemPriceInStages,
	updateItemQuantityInStages,
} from "../../treatmentPlanStageMutations.js";
import type { PlanStageMutationContext, TreatmentPlanItem, TreatmentPlanStage } from "../types.js";
import { executeRemovePlanItem } from "./planItemRemoveHelper.js";

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
		executeRemovePlanItem(ctx, itemId);
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
