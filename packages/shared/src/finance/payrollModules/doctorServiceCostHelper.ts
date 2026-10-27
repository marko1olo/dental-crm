/**
 * packages/shared/src/finance/payrollModules/doctorServiceCostHelper.ts
 * Computes lab deductions, clinic overhead protection, and commission rates.
 * Mandate 8b: <= 120 lines.
 */

import { isGeneralClinicOverheadConsumable } from "../doctorNetSalaryEngine.js";
import type { DoctorCompletedServiceItem, DoctorPayrollCalculationInput } from "./payrollTypes.js";
import type { DoctorSpecialtyCommissionRule } from "./payrollPresetTypes.js";
import { CLINICAL_CATEGORY_COMMISSION_PERCENT, DEFAULT_CATEGORY_COMMISSION_PERCENT } from "./payrollRules.js";

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
