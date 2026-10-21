import {
	generateCompletedWorksActAndWriteOff,
	type CompletedWorksActResult,
	type InventoryItemLookup,
} from "../../treatmentPlanMaterialEngine.js";
import type {
	TreatmentPlanStage,
	TreatmentPlanValidationPayload,
} from "../types.js";

export interface BuildValidationPayloadParams {
	readonly stages: readonly TreatmentPlanStage[];
	readonly patientId: string;
	readonly patientName: string;
	readonly currentTierTitle: string;
	readonly doctorId?: string;
	readonly doctorFullName?: string;
	readonly discountPercent: number;
	readonly planCreatedAtIso?: string;
}

export function buildTreatmentPlanValidationPayload({
	stages,
	patientId,
	patientName,
	currentTierTitle,
	doctorId,
	doctorFullName,
	discountPercent,
	planCreatedAtIso,
}: BuildValidationPayloadParams): TreatmentPlanValidationPayload {
	const allItems = stages.flatMap((s) => s.items);
	return {
		planId: `PLAN-${patientId.slice(0, 6).toUpperCase()}`,
		planNumber: `ПЛАН-№${patientId.slice(0, 4)}`,
		planTitle: currentTierTitle,
		patientId,
		patientName,
		doctorId: doctorId || "doc-01",
		doctorFullName: doctorFullName || "Лечащий врач",
		createdAtIso: planCreatedAtIso || new Date().toISOString(),
		items: allItems.map((it) => ({
			itemId: it.id,
			...(it.toothNumber !== undefined ? { toothNumber: it.toothNumber } : {}),
			code804n: it.code804n,
			serviceTitle: it.name,
			category: it.category,
			planUnitPriceRub: it.unitPriceRub,
			planDiscountPercent: discountPercent,
			planDiscountRub: it.discountRub,
			quantity: it.quantity,
			planLineTotalRub:
				(Math.max(0, Math.round((it.unitPriceRub || 0) * 100) - Math.round((it.discountRub || 0) * 100)) *
					(it.quantity || 1)) /
				100,
		})),
	};
}

export interface BuildStageCompletedActDataParams {
	readonly selectedActStage: TreatmentPlanStage | null;
	readonly contractNumber: string;
	readonly patientId: string;
	readonly patientName: string;
	readonly doctorFullName?: string;
	readonly clinicName?: string;
	readonly inventoryItems?: unknown;
}

export function buildStageCompletedActData({
	selectedActStage,
	contractNumber,
	patientId,
	patientName,
	doctorFullName,
	clinicName,
	inventoryItems,
}: BuildStageCompletedActDataParams): CompletedWorksActResult | null {
	if (!selectedActStage) return null;
	return generateCompletedWorksActAndWriteOff({
		stage: selectedActStage,
		contractNumber,
		patientId,
		patientName,
		doctorFullName: doctorFullName || "Лечащий врач стоматолог",
		clinicName: clinicName || "Клиника ДЕНТЕ",
		...(Array.isArray(inventoryItems) && inventoryItems.length > 0
			? { inventoryItems: inventoryItems as InventoryItemLookup[] }
			: {}),
	});
}
