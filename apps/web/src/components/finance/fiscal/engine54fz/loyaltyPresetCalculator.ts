import { rubToKopecks } from "@dental/shared";
import type { LoyaltyDiscountParams } from "./types";

export interface TargetDiscountCalculation {
	targetLoyaltyDiscountKopecks: number;
	isCapped: boolean;
}

export function calculateTargetLoyaltyDiscountKopecks(
	nonWarrantyGrossKopecks: number,
	params: LoyaltyDiscountParams,
): TargetDiscountCalculation {
	let targetLoyaltyDiscountKopecks = 0;
	let isCapped = false;

	if (params.preset === "warranty_100" || params.preset === "colleague_100") {
		targetLoyaltyDiscountKopecks = nonWarrantyGrossKopecks;
	} else if (params.preset === "round_hundreds") {
		if (nonWarrantyGrossKopecks >= 10000) {
			const roundedKopecks = Math.floor(nonWarrantyGrossKopecks / 10000) * 10000;
			targetLoyaltyDiscountKopecks = nonWarrantyGrossKopecks - roundedKopecks;
		} else if (nonWarrantyGrossKopecks > 0) {
			const roundedKopecks = Math.floor(nonWarrantyGrossKopecks / 100) * 100;
			targetLoyaltyDiscountKopecks = nonWarrantyGrossKopecks - roundedKopecks;
		}
	} else if (params.preset === "discount_3") {
		targetLoyaltyDiscountKopecks = Math.round((nonWarrantyGrossKopecks * 3) / 100);
	} else if (params.preset === "discount_5" || params.preset === "family_5") {
		targetLoyaltyDiscountKopecks = Math.round((nonWarrantyGrossKopecks * 5) / 100);
	} else if (params.preset === "discount_10" || params.preset === "pensioner_10") {
		targetLoyaltyDiscountKopecks = Math.round((nonWarrantyGrossKopecks * 10) / 100);
	} else if (params.preset === "employee_20") {
		targetLoyaltyDiscountKopecks = Math.round((nonWarrantyGrossKopecks * 20) / 100);
	} else if (params.preset === "manual_percent") {
		const pct = Math.max(0, Math.min(100, params.customPercent ?? 0));
		targetLoyaltyDiscountKopecks = Math.round((nonWarrantyGrossKopecks * pct) / 100);
	} else if (params.preset === "manual_rub") {
		const requestedKop = Math.max(0, rubToKopecks(params.customRub ?? 0));
		if (requestedKop > nonWarrantyGrossKopecks) {
			targetLoyaltyDiscountKopecks = nonWarrantyGrossKopecks;
			isCapped = true;
		} else {
			targetLoyaltyDiscountKopecks = requestedKop;
		}
	}

	if (targetLoyaltyDiscountKopecks > nonWarrantyGrossKopecks) {
		targetLoyaltyDiscountKopecks = nonWarrantyGrossKopecks;
		isCapped = true;
	} else if (targetLoyaltyDiscountKopecks < 0) {
		targetLoyaltyDiscountKopecks = 0;
	}

	return { targetLoyaltyDiscountKopecks, isCapped };
}
