import {
	type AutoclavePackagingType,
	getPackagingRule,
} from "./autoclavePresets";
import type { PackExpiryCalculation } from "./autoclaveEngineTypes";

export function computePackExpiryDate(
	packagingType: AutoclavePackagingType,
	sterilizationDateInput: string | Date = new Date(),
): PackExpiryCalculation {
	const rule = getPackagingRule(packagingType);
	const sDate = typeof sterilizationDateInput === "string"
		? new Date(sterilizationDateInput)
		: new Date(sterilizationDateInput.getTime());

	const expiryDate = new Date(sDate.getTime() + rule.shelfLifeDays * 24 * 60 * 60 * 1000);
	const now = new Date();
	const diffMs = expiryDate.getTime() - now.getTime();
	const daysRemaining = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
	const isExpired = daysRemaining < 0 || (rule.shelfLifeDays === 0 && diffMs < -60 * 60 * 1000);

	return {
		sterilizationDate: sDate,
		expiryDate,
		daysValid: rule.shelfLifeDays,
		formattedExpiry: expiryDate.toISOString().slice(0, 10),
		isExpired,
		daysRemaining: Math.max(0, daysRemaining),
	};
}

export function evaluatePackStatus(
	sterilizationDate: string | Date,
	packagingType: AutoclavePackagingType,
	isBreached = false,
): "sterile" | "expiring_soon" | "expired" | "breached" {
	if (isBreached) return "breached";
	const calc = computePackExpiryDate(packagingType, sterilizationDate);
	if (calc.isExpired) return "expired";
	if (calc.daysRemaining <= 3 && calc.daysValid > 0) return "expiring_soon";
	return "sterile";
}
