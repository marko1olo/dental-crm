/**
 * packages/shared/src/finance/payrollModules/doctorServiceItemCalculator.ts
 * Iterates through doctor completed services, tracks refunds, warranties and commissions.
 * Mandate 8b: <= 120 lines.
 */

import type { DoctorCompletedServiceItem, DoctorPayrollCalculationInput, DoctorPayrollStornoLineItem } from "./payrollTypes.js";
import type { DoctorSpecialtyCommissionRule } from "./payrollPresetTypes.js";
import { computeItemCostsAndCommission } from "./doctorServiceCostHelper.js";
import { createServiceStornoItem } from "./doctorStornoHelper.js";

export interface ProcessedDoctorServicesSummary {
	totalGross: number;
	totalLab: number;
	totalMaterial: number;
	totalOverheadCovered: number;
	earnedBase: number;
	earnedRetail: number;
	refundedServicesCount: number;
	warrantyServicesCount: number;
	totalItemRefundsKop: number;
	stornoItems: DoctorPayrollStornoLineItem[];
}

export function processDoctorServiceItems(
	doctorServices: readonly DoctorCompletedServiceItem[],
	preset: DoctorSpecialtyCommissionRule,
	input: DoctorPayrollCalculationInput,
	basePercent: number,
): ProcessedDoctorServicesSummary {
	let totalGross = 0;
	let totalLab = 0;
	let totalMaterial = 0;
	let totalOverheadCovered = 0;
	let earnedBase = 0;
	let earnedRetail = 0;
	let refundedServicesCount = 0;
	let warrantyServicesCount = 0;
	let totalItemRefundsKop = 0;
	const stornoItems: DoctorPayrollStornoLineItem[] = [];

	for (const item of doctorServices) {
		if (item.isDepositAdvanceOnly) continue;

		if (item.isWarrantyRework) {
			warrantyServicesCount += 1;
			if (item.warrantyType === "clinic_warranty" || item.warrantyType === "lab_warranty") {
				const fixedComp = item.warrantyFixedCompensationKop ?? 0;
				if (fixedComp > 0) earnedBase += fixedComp;
			}
			if (item.deductMaterialFromDoctor && item.materialCostKop > 0) totalMaterial += item.materialCostKop;
			continue;
		}

		if (item.isPaid === false || item.isDebt === true || item.invoiceStatus === "unpaid") continue;

		const actualPaidKop = item.actuallyPaidGrossKop !== undefined
			? Math.max(0, item.actuallyPaidGrossKop)
			: (item.paidAmountKop !== undefined ? Math.max(0, Math.min(item.grossRevenueKop, item.paidAmountKop)) : item.grossRevenueKop);

		if (actualPaidKop <= 0 && item.grossRevenueKop > 0) continue;

		const isFullyRefunded = item.isRefunded === true || (item.refundedAmountKop !== undefined && item.refundedAmountKop >= actualPaidKop);
		const refundKop = Math.min(actualPaidKop, item.refundedAmountKop ?? (item.isRefunded ? actualPaidKop : 0));

		const { itemLabCost, itemMaterialCost, itemOverheadCovered, itemCommissionPercent } =
			computeItemCostsAndCommission(item, preset, input, basePercent);
		totalOverheadCovered += itemOverheadCovered;

		if (isFullyRefunded) {
			refundedServicesCount += 1;
			totalItemRefundsKop += actualPaidKop;
			stornoItems.push(createServiceStornoItem(item, actualPaidKop, refundKop, true, itemLabCost, itemMaterialCost, itemCommissionPercent));
			continue;
		}

		const effectiveGrossKop = Math.max(0, actualPaidKop - refundKop);
		if (refundKop > 0) {
			refundedServicesCount += 1;
			totalItemRefundsKop += refundKop;
			stornoItems.push(createServiceStornoItem(item, actualPaidKop, refundKop, false, itemLabCost, itemMaterialCost, itemCommissionPercent));
		}

		totalGross += effectiveGrossKop;
		totalLab += itemLabCost;
		totalMaterial += itemMaterialCost;

		if (item.category === "retail_hygiene") {
			const itemRetailPercent = item.customCommissionPercent ?? input.categoryRates?.retail_hygiene ?? preset.retailProductsPercentage;
			earnedRetail += Math.round((effectiveGrossKop * itemRetailPercent) / 100);
		} else {
			const netItemBase = Math.max(0, effectiveGrossKop - itemLabCost - itemMaterialCost);
			earnedBase += Math.round((netItemBase * itemCommissionPercent) / 100);
		}
	}

	return {
		totalGross, totalLab, totalMaterial, totalOverheadCovered,
		earnedBase, earnedRetail, refundedServicesCount, warrantyServicesCount,
		totalItemRefundsKop, stornoItems,
	};
}
