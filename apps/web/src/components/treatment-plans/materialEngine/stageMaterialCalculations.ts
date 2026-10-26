/**
 * apps/web/src/components/treatment-plans/materialEngine/stageMaterialCalculations.ts
 *
 * Расчет потребности и себестоимости материалов для этапа комплексного плана лечения.
 */

import { type Kopecks, multiplyKopecks, parseKopecks, sumKopecks } from "@dental/shared";
import type {
	PlanStageMaterialRequirement,
	StageMaterialCostSummary,
	TreatmentPlanStage,
} from "../types";
import {
	ORDER_804N_MATERIAL_NORMS_MAP,
	matchMaterialToInventoryItem,
	type InventoryItemLookup,
} from "./inventoryMatching";

export function calculateStageMaterialRequirements(
	stage: TreatmentPlanStage,
	inventoryItems?: readonly InventoryItemLookup[],
): StageMaterialCostSummary {
	const resultItems: PlanStageMaterialRequirement[] = [];

	const stageTotalRequiredByMaterial = new Map<string, number>();
	for (const proc of stage.items) {
		const code = proc.code804n;
		const norms = ORDER_804N_MATERIAL_NORMS_MAP[code] ?? [];
		const qty = Math.max(1, proc.quantity || 1);
		for (const norm of norms) {
			const reqQty = Number((norm.quantityPerProcedure * qty).toFixed(2));
			const current = stageTotalRequiredByMaterial.get(norm.materialName) ?? 0;
			stageTotalRequiredByMaterial.set(norm.materialName, current + reqQty);
		}
	}

	for (const proc of stage.items) {
		const code = proc.code804n;
		const norms = ORDER_804N_MATERIAL_NORMS_MAP[code] ?? [];
		const qty = Math.max(1, proc.quantity || 1);

		for (const norm of norms) {
			const reqQty = Number((norm.quantityPerProcedure * qty).toFixed(2));
			const matchedInv = matchMaterialToInventoryItem(norm.materialName, inventoryItems);
			const unitCostRub = matchedInv
				? Number(matchedInv.unitCostRub) || norm.defaultUnitCostRub
				: norm.defaultUnitCostRub;

			const unitCostKopecks = parseKopecks(unitCostRub);
			const totalCostKopecks = (
				Number.isInteger(reqQty) && reqQty >= 0
					? multiplyKopecks(unitCostKopecks, reqQty)
					: Math.round(unitCostKopecks * reqQty)
			) as Kopecks;
			const totalCostRub = Math.round(totalCostKopecks / 100);

			const inStockQuantity = matchedInv ? matchedInv.stockQuantity : undefined;
			const totalRequiredForStage = stageTotalRequiredByMaterial.get(norm.materialName) ?? reqQty;
			const isDeficit = inStockQuantity !== undefined && inStockQuantity < totalRequiredForStage;
			const deficitQuantity = isDeficit ? Number((totalRequiredForStage - inStockQuantity).toFixed(2)) : 0;

			const item: PlanStageMaterialRequirement = {
				id: `${stage.stageNumber}-${proc.id}-${norm.id}`,
				materialName: norm.materialName,
				serviceCode: proc.serviceCode || code,
				order804nCode: code,
				procedureName: proc.name,
				quantityRequired: reqQty,
				unitOfMeasure: norm.unitOfMeasure,
				unitCostRub,
				unitCostKopecks,
				totalCostRub,
				totalCostKopecks,
				isDeficit,
				deficitQuantity,
				hideInPatientPresentation: Boolean(
					norm.hideInPatientPresentation ||
						/салфетк|ватн.*валик|чехол для позиционер/i.test(norm.materialName),
				),
				...(typeof proc.toothNumber === "number" ? { toothNumber: proc.toothNumber } : {}),
				...(matchedInv?.id ? { inventoryItemId: matchedInv.id } : {}),
				...(typeof inStockQuantity === "number" ? { inStockQuantity } : {}),
			};
			resultItems.push(item);
		}
	}

	const totalMaterialsCostKopecks = sumKopecks(resultItems.map((i) => i.totalCostKopecks));
	const totalMaterialsCostRub = Math.round(totalMaterialsCostKopecks / 100);
	const serviceRevenueKopecks = stage.totalKopecks;
	const serviceRevenueRub = stage.totalRub;
	const grossMarginKopecks = Math.max(0, serviceRevenueKopecks - totalMaterialsCostKopecks) as Kopecks;
	const grossMarginRub = Math.round(grossMarginKopecks / 100);
	const marginPercent = serviceRevenueKopecks > 0 ? Math.round((grossMarginKopecks / serviceRevenueKopecks) * 100) : 0;
	const deficitCount = resultItems.filter((i) => i.isDeficit).length;

	return {
		stageNumber: stage.stageNumber,
		stageTitle: stage.title,
		items: resultItems,
		totalMaterialsCostKopecks,
		totalMaterialsCostRub,
		serviceRevenueKopecks,
		serviceRevenueRub,
		grossMarginKopecks,
		grossMarginRub,
		marginPercent,
		hasDeficit: deficitCount > 0,
		deficitCount,
	};
}
