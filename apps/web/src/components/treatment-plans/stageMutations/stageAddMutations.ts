import { type Kopecks, parseKopecks } from "@dental/shared";
import type { TreatmentPlanItem, TreatmentPlanStage, TreatmentPlanStageKind } from "../types.js";
import { romanizeStageNumber } from "../types.js";
import { computeStageItemsTotalKopecks } from "./common.js";

export function addItemToPlanStages(
	stages: readonly TreatmentPlanStage[],
	targetStageNumber: number,
	newItemData: Partial<TreatmentPlanItem>,
): TreatmentPlanStage[] {
	const unitPriceRub = newItemData.unitPriceRub || 0;
	const qty = newItemData.quantity || 1;
	const discRub = newItemData.discountRub || 0;
	const unitPriceKop = parseKopecks(unitPriceRub);
	const grossKopecks = (unitPriceKop * qty) as Kopecks;
	const discKopecks = parseKopecks(discRub);
	const netKopecks = Math.max(0, grossKopecks - discKopecks) as Kopecks;
	const netRub = netKopecks / 100;

	const stageKind: TreatmentPlanStageKind =
		newItemData.stageKind ||
		(targetStageNumber === 2
			? "stage_2_surgery"
			: targetStageNumber === 3
				? "stage_3_orthopedics"
				: targetStageNumber === 4
					? "stage_4_orthodontics"
					: targetStageNumber === 5
						? "stage_5_periodontics"
						: "stage_1_therapy");

	const existingStage = stages.find((s) => s.stageNumber === targetStageNumber);
	const stageItemIndex = (existingStage?.items.length ?? 0) + 1;
	const serviceCodeClean = (newItemData.code804n || "A16_07_002").replace(/[^\w-]/g, "_");
	const toothPart = newItemData.toothNumber !== undefined ? `_tooth_${newItemData.toothNumber}` : "";
	const deterministicId =
		newItemData.id ||
		`stage_item_${targetStageNumber}_${serviceCodeClean}${toothPart}_seq_${stageItemIndex}_ts_${Date.now()}`;

	const newItem: TreatmentPlanItem = {
		id: deterministicId,
		toothNumber: newItemData.toothNumber,
		code804n: newItemData.code804n || "A16.07.002",
		name: newItemData.name || "Медицинская услуга",
		category: newItemData.category || "Общее",
		priceRub: netRub,
		unitPriceRub,
		discountRub: discRub,
		quantity: qty,
		phase: targetStageNumber,
		stageKind,
		priceId: newItemData.code804n || "A16.07.002",
		fromCatalog: true,
		isAuto: false,
	};

	if (existingStage) {
		return stages.map((s) => {
			if (s.stageNumber !== targetStageNumber) return s;
			const updatedItems = [...s.items, newItem];
			const totalKopecks = computeStageItemsTotalKopecks(updatedItems);
			return {
				...s,
				items: updatedItems,
				totalKopecks,
				totalRub: totalKopecks / 100,
				serviceCatalogCodes: Array.from(new Set(updatedItems.map((i) => i.code804n))),
				order804nCodes: Array.from(new Set(updatedItems.map((i) => i.code804n))),
			};
		});
	}

	const newStage: TreatmentPlanStage = {
		stageNumber: targetStageNumber,
		stageKind,
		title: `Этап ${romanizeStageNumber(targetStageNumber)}: Клинический этап`,
		subtitle: "Процедуры по назначению врача",
		clinicalGoal: "Достижение согласованного клинического результата",
		items: [newItem],
		totalRub: netRub,
		totalKopecks: netKopecks as Kopecks,
		estimatedVisits: 1,
		estimatedWeeks: 2,
		serviceCatalogCodes: [newItem.code804n],
		order804nCodes: [newItem.code804n],
		status: "agreed",
	};
	return [...stages, newStage].sort((a, b) => a.stageNumber - b.stageNumber);
}
