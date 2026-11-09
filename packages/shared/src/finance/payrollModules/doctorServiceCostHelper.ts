/**
 * packages/shared/src/finance/payrollModules/doctorServiceCostHelper.ts
 * Computes lab deductions, clinic overhead protection, and commission rates.
 * Mandate 8b: <= 140 lines.
 */

import type { Kopecks } from "../../money.js";
import type { ClinicalMaterialWriteoffResult } from "../../warehouse/clinicalMaterialWriteoffEngine.js";
import type { DoctorCompletedServiceItem, DoctorPayrollCalculationInput } from "./payrollTypes.js";
import type { DoctorSpecialtyCommissionRule } from "./payrollPresetTypes.js";
import { CLINICAL_CATEGORY_COMMISSION_PERCENT, DEFAULT_CATEGORY_COMMISSION_PERCENT } from "./payrollRules.js";

export type DentalSpecialtyCategory =
	| "therapy"
	| "orthopedics"
	| "surgery"
	| "orthodontics"
	| "hygiene"
	| "periodontology"
	| "other";

/**
 * Определяет, относится ли расходный материал к общеклиническим накладным расходам
 * (салфетки, ватные валики, слюноотсосы, перчатки, маски, стаканчики, нагрудники, бахилы).
 * Общеклинические расходники оплачиваются клиникой и НЕ подлежат удержанию из зарплаты врача!
 */
export function isGeneralClinicOverheadConsumable(materialName: string): boolean {
	if (!materialName || typeof materialName !== "string") return false;
	return /салфетк|ватн.*валик|валик.*стомат|слюноотсос|нагрудник|бахил|стаканчик|перчатк|маск|чехол для позиционер|дезинфицирующ.*салфетк/i.test(
		materialName.trim(),
	);
}

/**
 * Классифицирует услугу по медицинской категории (терапия, ортопедия, хирургия, ортодонтия, гигиена).
 */
export function classifyServiceCategory(
	categoryOrTitle?: string | null,
	order804nCode?: string | null,
): DentalSpecialtyCategory {
	const code = (order804nCode || "").trim().toUpperCase();
	const text = (categoryOrTitle || "").toLowerCase();

	if (text.includes("therap") || text.includes("терап") || text.includes("пломб") || text.includes("кариес") || text.includes("пульпит") || text.includes("эндодонт")) {
		return "therapy";
	}
	if (text.includes("prosthet") || text.includes("ортопед") || text.includes("коронк") || text.includes("протез") || text.includes("винир") || text.includes("вкладк")) {
		return "orthopedics";
	}
	if (text.includes("surg") || text.includes("хирург") || text.includes("имплант") || text.includes("удалени") || text.includes("синус") || text.includes("костн")) {
		return "surgery";
	}
	if (text.includes("orthodont") || text.includes("ортодонт") || text.includes("брекет") || text.includes("элайнер") || text.includes("дуг") || text.includes("пластинк")) {
		return "orthodontics";
	}
	if (text.includes("hygien") || text.includes("гигиен") || text.includes("отбеливан") || text.includes("air flow") || text.includes("чистк")) {
		return "hygiene";
	}
	if (text.includes("periodont") || text.includes("пародонт") || text.includes("вектор") || text.includes("кюретаж")) {
		return "periodontology";
	}

	if (code.startsWith("A16.07.002") || code.startsWith("A16.07.003") || code.startsWith("A16.07.030") || code.startsWith("A16.07.082")) {
		return "therapy";
	}
	if (code.startsWith("A16.07.004") || code.startsWith("A16.07.005") || code.startsWith("A16.07.006") || code.startsWith("A16.07.023")) {
		return "orthopedics";
	}
	if (code.startsWith("A16.07.001") || code.startsWith("A16.07.007") || code.startsWith("A16.07.011") || code.startsWith("A16.07.012") || code.startsWith("A16.07.041")) {
		return "surgery";
	}
	if (code.startsWith("A16.07.028") || code.startsWith("A16.07.047") || code.startsWith("A16.07.048")) {
		return "orthodontics";
	}
	if (code.startsWith("A16.07.051") || code.startsWith("A22.07.001")) {
		return "hygiene";
	}

	return "other";
}

/**
 * Извлекает себестоимость материалов для уменьшения расчетной базы врача из результатов 2-уровневого списания.
 */
export function extractDeductibleMaterialsFromWriteoff(
	writeoffResult: ClinicalMaterialWriteoffResult,
): {
	expensiveClinicalCostKop: Kopecks;
	cheapOverheadCostKop: Kopecks;
	totalDoctorDeductibleKop: Kopecks;
} {
	return {
		expensiveClinicalCostKop: writeoffResult.clinicalTotalCostKopecks,
		cheapOverheadCostKop: writeoffResult.overheadTotalCostKopecks,
		totalDoctorDeductibleKop: writeoffResult.totalDoctorDeductibleCostKopecks,
	};
}

export interface ItemCostBreakdown {
	readonly itemLabCost: number;
	readonly itemMaterialCost: number;
	readonly itemOverheadCovered: number;
	readonly itemCommissionPercent: number;
}

export function computeItemCostsAndCommission(
	item: DoctorCompletedServiceItem,
	preset: DoctorSpecialtyCommissionRule,
	input: DoctorPayrollCalculationInput,
	basePercent: number,
): ItemCostBreakdown {
	const shouldDeductLab =
		preset.deductsLabCosts ||
		item.category === "orthopedics" ||
		item.category === "orthodontics" ||
		(item.labCostKop !== undefined && item.labCostKop > 0);
	const itemLabCost = shouldDeductLab ? Math.max(0, item.labCostKop || 0) : 0;

	let itemMaterialCost = 0;
	let itemOverheadCovered = 0;

	if (item.deductMaterialFromDoctor === false) {
		itemMaterialCost = 0;
		itemOverheadCovered = Math.max(0, item.materialCostKop || 0);
	} else if (item.materialItems && item.materialItems.length > 0) {
		for (const m of item.materialItems) {
			if (isGeneralClinicOverheadConsumable(m.name)) {
				itemOverheadCovered += Math.max(0, m.costKop);
			} else {
				itemMaterialCost += Math.max(0, m.costKop);
			}
		}
	} else if (item.materialName && isGeneralClinicOverheadConsumable(item.materialName)) {
		itemOverheadCovered = Math.max(0, item.materialCostKop || 0);
		itemMaterialCost = 0;
	} else {
		const shouldDeductMaterial =
			preset.deductsMaterialCosts ||
			item.category === "surgery" ||
			item.category === "therapy" ||
			item.category === "pediatric" ||
			(item.materialCostKop !== undefined && item.materialCostKop > 0 && preset.deductsMaterialCosts);
		itemMaterialCost = shouldDeductMaterial ? Math.max(0, item.materialCostKop || 0) : 0;
	}

	const clinicalRate = input.useClinicalCategoryRates ? CLINICAL_CATEGORY_COMMISSION_PERCENT[item.category] : undefined;

	const itemCommissionPercent =
		item.customCommissionPercent ??
		input.categoryRates?.[item.category] ??
		clinicalRate ??
		(input.customBasePercentage !== undefined
			? input.customBasePercentage
			: (preset.specialtyId === "solo_practitioner" || preset.specialtyId === "solo-doctor" || preset.defaultPercentage === 100
				? preset.defaultPercentage
				: (DEFAULT_CATEGORY_COMMISSION_PERCENT[item.category] ?? (item.category === "retail_hygiene" ? preset.retailProductsPercentage : basePercent))));

	return { itemLabCost, itemMaterialCost, itemOverheadCovered, itemCommissionPercent };
}
