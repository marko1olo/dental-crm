/**
 * calculatePresetKopecks.ts — Computes target discount in integer kopecks from a loyalty preset.
 * Mandate 8b: <= 120 lines.
 */
import { rubToKopecks } from "@dental/shared";
import type { LoyaltyDiscountParams } from "../engine54fz/types";

export function calculatePresetKopecks(
	params: LoyaltyDiscountParams,
	nonWarrantyGrossKopecks: number,
): { targetLoyaltyDiscountKopecks: number; isCapped: boolean } {
	let target = 0;
	let isCapped = false;

	if (params.preset === "warranty_100" || params.preset === "colleague_100") {
		target = nonWarrantyGrossKopecks;
	} else if (params.preset === "round_hundreds") {
		if (nonWarrantyGrossKopecks >= 10000) {
			target = nonWarrantyGrossKopecks - Math.floor(nonWarrantyGrossKopecks / 10000) * 10000;
		} else if (nonWarrantyGrossKopecks > 0) {
			target = nonWarrantyGrossKopecks - Math.floor(nonWarrantyGrossKopecks / 100) * 100;
		}
	} else if (params.preset === "discount_3") target = Math.round((nonWarrantyGrossKopecks * 3) / 100);
	else if (params.preset === "discount_5" || params.preset === "family_5") target = Math.round((nonWarrantyGrossKopecks * 5) / 100);
	else if (params.preset === "discount_10" || params.preset === "pensioner_10") target = Math.round((nonWarrantyGrossKopecks * 10) / 100);
	else if (params.preset === "employee_20") target = Math.round((nonWarrantyGrossKopecks * 20) / 100);
	else if (params.preset === "manual_percent") {
		const pct = Math.max(0, Math.min(100, params.customPercent ?? 0));
		target = Math.round((nonWarrantyGrossKopecks * pct) / 100);
	} else if (params.preset === "manual_rub") {
		const req = Math.max(0, rubToKopecks(params.customRub ?? 0));
		if (req > nonWarrantyGrossKopecks) {
			target = nonWarrantyGrossKopecks;
			isCapped = true;
		} else {
			target = req;
		}
	}

	if (target > nonWarrantyGrossKopecks) {
		target = nonWarrantyGrossKopecks;
		isCapped = true;
	}
	return { targetLoyaltyDiscountKopecks: Math.max(0, target), isCapped };
}
