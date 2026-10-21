/**
 * apps/web/src/components/treatment-plans/materialEngine/planMaterialCalculations.ts
 *
 * Расчет суммарной себестоимости плана и генерация Акта выполненных работ.
 */

import { type Kopecks, sumKopecks } from "@dental/shared";
import type {
	CompletedWorksActAndWriteOffData,
	StageMaterialCostSummary,
	TreatmentPlanStage,
} from "../types";
import { type InventoryItemLookup } from "./inventoryMatching";
import { calculateStageMaterialRequirements } from "./stageMaterialCalculations";

export function calculatePlanTotalMaterialCost(
	stages: readonly TreatmentPlanStage[],
	inventoryItems?: readonly InventoryItemLookup[],
) {
	const summaries = stages.map((s) => calculateStageMaterialRequirements(s, inventoryItems));
	const totalMaterialsCostKopecks = sumKopecks(summaries.map((s) => s.totalMaterialsCostKopecks));
	const totalMaterialsCostRub = Math.round(totalMaterialsCostKopecks / 100);
	const totalServiceRevenueKopecks = sumKopecks(summaries.map((s) => s.serviceRevenueKopecks));
	const totalServiceRevenueRub = Math.round(totalServiceRevenueKopecks / 100);
	const totalGrossMarginKopecks = Math.max(0, totalServiceRevenueKopecks - totalMaterialsCostKopecks) as Kopecks;
	const totalGrossMarginRub = Math.round(totalGrossMarginKopecks / 100);
	const overallMarginPercent = totalServiceRevenueKopecks > 0 ? Math.round((totalGrossMarginKopecks / totalServiceRevenueKopecks) * 100) : 0;
	const totalDeficitItemsCount = summaries.reduce((acc, s) => acc + s.deficitCount, 0);

	return {
		summaries,
		totalMaterialsCostKopecks,
		totalMaterialsCostRub,
		totalServiceRevenueKopecks,
		totalServiceRevenueRub,
		totalGrossMarginKopecks,
		totalGrossMarginRub,
		overallMarginPercent,
		totalDeficitItemsCount,
	};
}

export function generateCompletedWorksActAndWriteOff(params: {
	readonly stage: TreatmentPlanStage;
	readonly contractNumber: string;
	readonly patientId: string;
	readonly patientName: string;
	readonly doctorFullName: string;
	readonly clinicName: string;
	readonly inventoryItems?: readonly InventoryItemLookup[] | undefined;
	readonly customActNumber?: string | undefined;
}): CompletedWorksActAndWriteOffData {
	const {
		stage,
		contractNumber,
		patientId,
		patientName,
		doctorFullName,
		clinicName,
		inventoryItems,
		customActNumber,
	} = params;

	const summary = calculateStageMaterialRequirements(stage, inventoryItems);
	const now = new Date();
	const actDate = now.toLocaleDateString("ru-RU");
	const actNumber =
		customActNumber ||
		`ACT-${now.getFullYear()}-${stage.stageNumber}-${patientId.slice(0, 5).toUpperCase()}`;

	return {
		actNumber,
		actDate,
		contractNumber,
		patientId,
		patientName,
		doctorFullName,
		clinicName,
		stageNumber: stage.stageNumber,
		stageTitle: stage.title,
		completedProcedures: stage.items,
		writtenOffMaterials: summary.items,
		totalServiceRub: stage.totalRub,
		totalServiceKopecks: stage.totalKopecks,
		totalMaterialCostRub: summary.totalMaterialsCostRub,
		totalMaterialCostKopecks: summary.totalMaterialsCostKopecks,
		marginRub: summary.grossMarginRub,
		marginPercent: summary.marginPercent,
		status: "draft",
		createdAtIso: now.toISOString(),
	};
}
