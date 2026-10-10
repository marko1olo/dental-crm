/**
 * treatmentPlanMaterialEngine.ts — Клинико-складской движок списания материалов и калькуляции себестоимости DENTE CRM.
 *
 * Выполняет:
 * 1. Нормирование расхода стоматологических ТМЦ по Номенклатуре Минздрава РФ № 804н.
 * 2. Расчет себестоимости расходных материалов по этапам плана лечения с точностью до копейки.
 * 3. Сопоставление с реальным складским остатком клиники (InventoryItem), выявление дефицита.
 * 4. Формирование Акта выполненных работ и Накладной на списание ТМЦ (Форма М-11 / Торг-16).
 * 5. Расчет валовой маржинальности и доходности клинических этапов.
 */

import {
	type Kopecks,
	multiplyKopecks,
	parseKopecks,
	sumKopecks,
} from "@dental/shared";
import type {
	CompletedWorksActAndWriteOffData,
	PlanStageMaterialRequirement,
	ProcedureMaterialNorm,
	StageMaterialCostSummary,
	TreatmentPlanStage,
} from "./types";
import { THERAPY_MATERIAL_NORMS } from "./treatmentPlanTherapyNorms";
import { SURGICAL_MATERIAL_NORMS } from "./treatmentPlanSurgicalNorms";

export { THERAPY_MATERIAL_NORMS } from "./treatmentPlanTherapyNorms";
export { SURGICAL_MATERIAL_NORMS } from "./treatmentPlanSurgicalNorms";
export type CompletedWorksActResult = CompletedWorksActAndWriteOffData;

export interface InventoryItemLookup {
	readonly id: string;
	readonly name: string;
	readonly stockQuantity: number;
	readonly criticalThreshold?: number;
	readonly unitCostRub: string | number;
	readonly sku?: string;
	readonly barcode?: string;
	readonly lotNumber?: string;
	readonly expirationDate?: string;
}

/**
 * Эталонные нормы расхода стоматологических материалов по Номенклатуре Приказа Минздрава РФ № 804н.
 */
export const ORDER_804N_MATERIAL_NORMS_MAP: Record<string, readonly ProcedureMaterialNorm[]> = {
	...THERAPY_MATERIAL_NORMS,
	...SURGICAL_MATERIAL_NORMS,
};

/**
 * Сопоставление требуемого материала со складской позицией (InventoryItem).
 */
export function matchMaterialToInventoryItem(
	materialName: string,
	inventoryItems?: readonly InventoryItemLookup[],
): InventoryItemLookup | undefined {
	if (!inventoryItems || inventoryItems.length === 0) return undefined;

	const search = materialName.toLowerCase().trim();
	const words = search.split(/\s+/).filter((w) => w.length > 3);

	// 1. Прямое совпадение
	const exact = inventoryItems.find(
		(it) => it.name.toLowerCase().trim() === search,
	);
	if (exact) return exact;

	// 2. Вхождение ключевых слов
	return inventoryItems.find((it) => {
		const n = it.name.toLowerCase();
		return words.some((w) => n.includes(w));
	});
}

/**
 * Расчет потребности и себестоимости материалов для этапа комплексного плана лечения.
 */
export function calculateStageMaterialRequirements(
	stage: TreatmentPlanStage,
	inventoryItems?: readonly InventoryItemLookup[],
): StageMaterialCostSummary {
	const resultItems: PlanStageMaterialRequirement[] = [];

	// First pass: aggregate total required quantity per material across the whole stage
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
			const matchedInv = matchMaterialToInventoryItem(
				norm.materialName,
				inventoryItems,
			);

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
			const totalRequiredForStage =
				stageTotalRequiredByMaterial.get(norm.materialName) ?? reqQty;
			const isDeficit =
				inStockQuantity !== undefined && inStockQuantity < totalRequiredForStage;
			const deficitQuantity = isDeficit
				? Number((totalRequiredForStage - inStockQuantity).toFixed(2))
				: 0;

			const item: PlanStageMaterialRequirement = {
				id: `${stage.stageNumber}-${proc.id}-${norm.id}`,
				materialName: norm.materialName,
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

	const totalMaterialsCostKopecks = sumKopecks(
		resultItems.map((i) => i.totalCostKopecks),
	);
	const totalMaterialsCostRub = Math.round(totalMaterialsCostKopecks / 100);

	const serviceRevenueKopecks = stage.totalKopecks;
	const serviceRevenueRub = stage.totalRub;

	const grossMarginKopecks = Math.max(
		0,
		serviceRevenueKopecks - totalMaterialsCostKopecks,
	) as Kopecks;
	const grossMarginRub = Math.round(grossMarginKopecks / 100);

	const marginPercent =
		serviceRevenueKopecks > 0
			? Math.round((grossMarginKopecks / serviceRevenueKopecks) * 100)
			: 0;

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

/**
 * Расчет суммарной потребности и себестоимости материалов по всему комплексному плану.
 */
export function calculatePlanTotalMaterialCost(
	stages: readonly TreatmentPlanStage[],
	inventoryItems?: readonly InventoryItemLookup[],
): {
	summaries: readonly StageMaterialCostSummary[];
	totalMaterialsCostKopecks: Kopecks;
	totalMaterialsCostRub: number;
	totalServiceRevenueKopecks: Kopecks;
	totalServiceRevenueRub: number;
	totalGrossMarginKopecks: Kopecks;
	totalGrossMarginRub: number;
	overallMarginPercent: number;
	totalDeficitItemsCount: number;
} {
	const summaries = stages.map((s) =>
		calculateStageMaterialRequirements(s, inventoryItems),
	);

	const totalMaterialsCostKopecks = sumKopecks(
		summaries.map((s) => s.totalMaterialsCostKopecks),
	);
	const totalMaterialsCostRub = Math.round(totalMaterialsCostKopecks / 100);

	const totalServiceRevenueKopecks = sumKopecks(
		summaries.map((s) => s.serviceRevenueKopecks),
	);
	const totalServiceRevenueRub = Math.round(totalServiceRevenueKopecks / 100);

	const totalGrossMarginKopecks = Math.max(
		0,
		totalServiceRevenueKopecks - totalMaterialsCostKopecks,
	) as Kopecks;
	const totalGrossMarginRub = Math.round(totalGrossMarginKopecks / 100);

	const overallMarginPercent =
		totalServiceRevenueKopecks > 0
			? Math.round((totalGrossMarginKopecks / totalServiceRevenueKopecks) * 100)
			: 0;

	const totalDeficitItemsCount = summaries.reduce(
		(acc, s) => acc + s.deficitCount,
		0,
	);

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

/**
 * Формирование Акта выполненных работ и Складской накладной на списание ТМЦ.
 */
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
