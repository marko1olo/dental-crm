import {
	DEFAULT_CATEGORY_COMMISSION_PERCENT,
	CLINICAL_CATEGORY_COMMISSION_PERCENT,
	type DoctorSpecialtyCommissionRule,
} from "@dental/shared/payroll";
import type { DoctorStaffPayrollInput } from "./staffPayrollRoleTypes";

export interface DoctorServicesCalculationOutput {
	readonly totalGross: number;
	readonly totalLab: number;
	readonly totalMaterial: number;
	readonly earnedBase: number;
	readonly earnedRetail: number;
}

export function calculateDoctorServicesMetrics(
	input: DoctorStaffPayrollInput,
	preset: DoctorSpecialtyCommissionRule,
	basePercent: number
): DoctorServicesCalculationOutput {
	let totalGross = 0;
	let totalLab = 0;
	let totalMaterial = 0;
	let earnedBase = 0;
	let earnedRetail = 0;

	for (const item of input.services) {
		if (item.isDepositAdvanceOnly) continue;
		if (item.isPaid === false || item.isDebt === true || item.invoiceStatus === "unpaid") continue;

		const rawGrossKop = Math.round(Number((item as any).amountKopecks ?? item.grossRevenueKop) || 0);
		const actualPaidKop = item.actuallyPaidGrossKop !== undefined
			? Math.max(0, Math.round(Number(item.actuallyPaidGrossKop) || 0))
			: (item.paidAmountKop !== undefined
				? Math.max(0, Math.min(rawGrossKop, Math.round(Number(item.paidAmountKop) || 0)))
				: rawGrossKop);

		if (actualPaidKop <= 0 && rawGrossKop > 0) continue;

		const itemGrossKop = actualPaidKop;
		const itemLabKop = Math.round(Number((item as any).labCostKopecks ?? item.labCostKop) || 0);
		const rawMatKop = Number((item as any).materialCostKopecks ?? (item as any).implantCostKopecks ?? item.materialCostKop) || 0;
		const itemMatKop = Math.round(rawMatKop);

		totalGross += itemGrossKop;

		const shouldDeductLab = preset.deductsLabCosts || item.category === "orthopedics" || item.category === "orthodontics" || itemLabKop > 0;
		const labCost = shouldDeductLab ? Math.max(0, itemLabKop) : 0;

		const shouldDeductMaterial = preset.deductsMaterialCosts || item.category === "surgery" || item.category === "therapy" || item.category === "pediatric" || (itemMatKop > 0 && preset.deductsMaterialCosts);
		const materialCost = shouldDeductMaterial ? Math.max(0, itemMatKop) : 0;

		totalLab += labCost;
		totalMaterial += materialCost;

		const clinicalRate = input.useClinicalCategoryRates ? CLINICAL_CATEGORY_COMMISSION_PERCENT[item.category] : undefined;

		if (item.category === "retail_hygiene") {
			const retailPercent = item.customCommissionPercent ?? input.categoryRates?.retail_hygiene ?? clinicalRate ?? preset.retailProductsPercentage;
			earnedRetail += Math.round((itemGrossKop * retailPercent) / 100);
		} else {
			const netItemBase = Math.max(0, itemGrossKop - labCost - materialCost);
			const itemCommissionPercent = item.customCommissionPercent ?? input.categoryRates?.[item.category] ?? clinicalRate ?? (input.customBasePercentage !== undefined ? input.customBasePercentage : (preset.specialtyId === "solo_practitioner" || preset.defaultPercentage === 100 ? preset.defaultPercentage : (DEFAULT_CATEGORY_COMMISSION_PERCENT[item.category] ?? basePercent)));
			earnedBase += Math.round((netItemBase * itemCommissionPercent) / 100);
		}
	}

	return { totalGross, totalLab, totalMaterial, earnedBase, earnedRetail };
}
