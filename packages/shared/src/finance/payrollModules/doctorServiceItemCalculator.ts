/**
 * packages/shared/src/finance/payrollModules/doctorServiceItemCalculator.ts
 * Iterates through doctor completed services, tracks refunds, warranties and commissions.
 * Mandate 8b: <= 120 lines.
 */

import type { DoctorCompletedServiceItem, DoctorPayrollCalculationInput, DoctorPayrollStornoLineItem } from "./payrollTypes.js";
import type { DoctorSpecialtyCommissionRule } from "./payrollPresetTypes.js";
import { computeItemCostsAndCommission } from "./doctorServiceCostHelper.js";
import { createServiceStornoItem } from "./doctorStornoHelper.js";
import {
	computeEffectiveDoctorBaseAfterRefund,
	resolveIdentItemBasis,
} from "./identSalaryModelHelper.js";
import { basisPointsFromPercent, percentageOfKopecks, type Kopecks } from "../../money.js";

export interface ProcessedDoctorServicesSummary {
	totalGross: number;
	totalSalaryPriceKop: number;
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
	let totalSalaryPriceKop = 0;
	let totalLab = 0;
	let totalMaterial = 0;
	let totalOverheadCovered = 0;
	let earnedBase = 0;
	let earnedRetail = 0;
	let refundedServicesCount = 0;
	let warrantyServicesCount = 0;
	let totalItemRefundsKop = 0;
	const stornoItems: DoctorPayrollStornoLineItem[] = [];
	const identSalaryModel = input.identSalaryModel ?? "net_proportional_discount";
	const cashAdvancePolicy = input.cashAdvancePolicy ?? "proportional";

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

		const basis = resolveIdentItemBasis(item, identSalaryModel, cashAdvancePolicy);
		if (!basis.shouldInclude) continue;

		const actualPaidKop = basis.actualPaidKop;
		const refundReferenceKop = identSalaryModel === "gross_before_discount"
			? Math.max(actualPaidKop, item.grossRevenueKop)
			: actualPaidKop;
		const isFullyRefunded = item.isRefunded === true || (item.refundedAmountKop !== undefined && item.refundedAmountKop >= refundReferenceKop && refundReferenceKop > 0);
		const refundKop = Math.min(refundReferenceKop, item.refundedAmountKop ?? (item.isRefunded ? refundReferenceKop : 0));

		const { itemLabCost, itemMaterialCost, itemOverheadCovered, itemCommissionPercent } =
			computeItemCostsAndCommission(item, preset, input, basePercent);
		totalOverheadCovered += itemOverheadCovered;

		if (isFullyRefunded) {
			refundedServicesCount += 1;
			totalItemRefundsKop += refundReferenceKop;
			stornoItems.push(createServiceStornoItem(item, refundReferenceKop, refundKop, true, itemLabCost, itemMaterialCost, itemCommissionPercent));
			continue;
		}

		const effectiveGrossKop = computeEffectiveDoctorBaseAfterRefund({
			item,
			identSalaryModel,
			cashAdvancePolicy,
			salaryPriceKop: basis.salaryBaseConfiguredKop,
			actualPaidKop,
			refundKop,
		});
		if (refundKop > 0) {
			refundedServicesCount += 1;
			totalItemRefundsKop += refundKop;
			stornoItems.push(createServiceStornoItem(item, refundReferenceKop, refundKop, false, itemLabCost, itemMaterialCost, itemCommissionPercent));
		}

		totalGross += effectiveGrossKop;
		totalSalaryPriceKop += basis.salaryBaseConfiguredKop;
		totalLab += itemLabCost;
		totalMaterial += itemMaterialCost;

		if (item.category === "retail_hygiene") {
			const itemRetailPercent = item.customCommissionPercent ?? input.categoryRates?.retail_hygiene ?? preset.retailProductsPercentage;
			earnedRetail += percentageOfKopecks(effectiveGrossKop as Kopecks, basisPointsFromPercent(itemRetailPercent));
		} else {
			const netItemBase = Math.max(0, effectiveGrossKop - itemLabCost - itemMaterialCost);
			earnedBase += percentageOfKopecks(netItemBase as Kopecks, basisPointsFromPercent(itemCommissionPercent));
		}
	}

	return {
		totalGross, totalSalaryPriceKop, totalLab, totalMaterial, totalOverheadCovered,
		earnedBase, earnedRetail, refundedServicesCount, warrantyServicesCount,
		totalItemRefundsKop, stornoItems,
	};
}
