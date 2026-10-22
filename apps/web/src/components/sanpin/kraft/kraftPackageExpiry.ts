import { getKraftMaterialDefinition, type KraftPackageMaterialId } from "./kraftPackagePresets.js";
import type { ExpirationCalculationResult, KraftPackageStatus } from "./kraftPackageTypes.js";

export function calculatePackageExpiration(
	packDateInput: string | Date,
	packageType: KraftPackageMaterialId,
	referenceDateInput: string | Date = new Date(),
): ExpirationCalculationResult {
	const packDate = typeof packDateInput === "string" ? new Date(packDateInput) : packDateInput;
	const refDate = typeof referenceDateInput === "string" ? new Date(referenceDateInput) : referenceDateInput;

	const material = getKraftMaterialDefinition(packageType);
	const daysLifespan = material.statutoryShelfLifeDays;

	const expDate = new Date(packDate.getTime());
	expDate.setDate(expDate.getDate() + daysLifespan);

	const diffMs = expDate.getTime() - refDate.getTime();
	const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

	let status: KraftPackageStatus = "sterile_valid";
	if (daysRemaining <= 0) {
		status = "expired";
	} else if (daysRemaining <= 7) {
		status = "expiring_soon_7d";
	}

	const isExpired = status === "expired";
	const isExpiringSoon = status === "expiring_soon_7d";

	let humanReadableRemainingRu = "";
	if (isExpired) {
		humanReadableRemainingRu = `Просрочено на ${Math.abs(daysRemaining)} дн. (требуется повторная очистка и стерилизация)`;
	} else if (daysRemaining === 0) {
		humanReadableRemainingRu = "Истекает сегодня (до 23:59)";
	} else if (daysRemaining === 1) {
		humanReadableRemainingRu = "Остался 1 день стерильности";
	} else {
		humanReadableRemainingRu = `Осталось ${daysRemaining} дн. стерильности`;
	}

	return {
		packDateFormatted: packDate.toISOString().slice(0, 10),
		expDateFormatted: expDate.toISOString().slice(0, 10),
		expDateIso: expDate.toISOString(),
		daysLifespan,
		daysRemaining,
		status,
		isExpired,
		isExpiringSoon,
		humanReadableRemainingRu,
	};
}

export function evaluateKraftPackageStatus(
	expDateInput: string | Date,
	isBreached = false,
	referenceDateInput: string | Date = new Date(),
): KraftPackageStatus {
	if (isBreached) return "recalled";
	const expDate = typeof expDateInput === "string" ? new Date(expDateInput) : expDateInput;
	const refDate = typeof referenceDateInput === "string" ? new Date(referenceDateInput) : referenceDateInput;
	const diffMs = expDate.getTime() - refDate.getTime();
	const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

	if (daysRemaining <= 0) return "expired";
	if (daysRemaining <= 7) return "expiring_soon_7d";
	return "sterile_valid";
}
