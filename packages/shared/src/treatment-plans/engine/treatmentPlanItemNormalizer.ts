/**
 * treatmentPlanItemNormalizer.ts — Создание нормализованного элемента плана лечения DENTE.
 */

import { multiplyKopecks } from "../../utils/money.js";
import { isValidToothFdi } from "../../radiology/hotFolderSyncEngine.js";
import {
	PLAN_STAGE_METADATA,
	type PlanTierKey,
	type TreatmentPlanItemInput,
	type TreatmentPlanItem,
} from "./types.js";
import {
	classifyProcedureStage,
	isProcedureHighCostCode02,
} from "./stageSequencingRules.js";
import { splitLaborAndMaterials } from "./financialWarrantyCalculator.js";

export function normalizeTreatmentPlanItem(
	input: TreatmentPlanItemInput,
	tierKey: PlanTierKey,
	index: number,
): TreatmentPlanItem {
	const id = input.id || `item_${tierKey}_${index + 1}_${Date.now()}`;
	const quantity = Number.isInteger(input.quantity) && (input.quantity ?? 1) > 0 ? (input.quantity ?? 1) : 1;
	const unitPriceKopecks = Math.max(0, Math.round(input.unitPriceKopecks || 0));
	const grossCostKopecks = multiplyKopecks(unitPriceKopecks, quantity);
	const discountKopecks = Math.min(grossCostKopecks, Math.max(0, Math.round(input.discountKopecks || 0)));
	const netCostKopecks = grossCostKopecks - discountKopecks;

	const stageKind = input.stageKind || classifyProcedureStage(input.code804n, input.categoryRu);
	const stageNumber = PLAN_STAGE_METADATA[stageKind].stageNumber;
	const isHighCost = typeof input.isHighCostCode02 === "boolean"
		? input.isHighCostCode02
		: isProcedureHighCostCode02(input.code804n, input.nameRu, input.categoryRu);

	const { laborKopecks, materialsKopecks } = splitLaborAndMaterials(
		netCostKopecks,
		tierKey,
		input.laborKopecks,
		input.materialsKopecks,
	);

	let toothNumber: number | null = null;
	if (typeof input.toothNumber === "number" && isValidToothFdi(input.toothNumber)) {
		toothNumber = input.toothNumber;
	}

	return {
		id,
		toothNumber,
		surfaces: Array.isArray(input.surfaces) ? [...input.surfaces] : [],
		code804n: (input.code804n || "A16.07.002").trim(),
		nameRu: (input.nameRu || "Стоматологическая процедура").trim(),
		categoryRu: (input.categoryRu || "Терапия").trim(),
		stageKind,
		stageNumber,
		tierKey,
		unitPriceKopecks,
		quantity,
		grossCostKopecks,
		discountKopecks,
		netCostKopecks,
		laborKopecks,
		materialsKopecks,
		totalCostKopecks: netCostKopecks,
		materialNameRu: (input.materialNameRu || "").trim(),
		clinicalRationaleRu: (input.clinicalRationaleRu || "").trim(),
		isHighCostCode02: isHighCost,
		status: input.status || "planned",
		doctorId: input.doctorId ?? null,
		doctorName: input.doctorName ?? null,
		doctorSpecialty: input.doctorSpecialty ?? null,
	};
}
