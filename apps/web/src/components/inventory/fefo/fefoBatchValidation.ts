import type { ClinicalBatchValidationResult } from "./fefoTypes.js";
import { formatRuDate } from "./fefoDateUtils.js";
import { getFefoTrafficLight } from "./fefoTrafficLightCore.js";

/**
 * Валидация партии для клинического использования в полости рта пациента (FEFO контроль).
 */
export function validateBatchForClinicalUse(
	batch: {
		readonly expiryDate?: string | null | undefined;
		readonly expirationDate?: string | null | undefined;
		readonly batchNumber?: string | null | undefined;
		readonly lotNumber?: string | null | undefined;
		readonly name?: string | null | undefined;
	},
	referenceDate: string | Date = new Date(),
): ClinicalBatchValidationResult {
	const rawExp = batch.expiryDate || batch.expirationDate;
	const traffic = getFefoTrafficLight(rawExp, referenceDate);
	const expired = traffic.daysLeft <= 0;
	const formattedExpiry = rawExp ? formatRuDate(rawExp) : "не указан";

	if (expired) {
		return {
			isAllowed: false,
			isExpired: true,
			alertMessage: `Срок годности партии истек ${formattedExpiry}! Партия заблокирована для утилизации`,
			formattedExpiry,
			status: "red",
			daysLeft: traffic.daysLeft,
		};
	}

	return {
		isAllowed: true,
		isExpired: false,
		alertMessage: null,
		formattedExpiry,
		status: traffic.status,
		daysLeft: traffic.daysLeft,
	};
}
