import {
	STATUTORY_PACKAGING_TYPES,
	type KraftPackagingType,
	type SterilityCalculation,
	type SterilityStatus,
} from "./types.js";

export function calculateKraftSterilityExpiration(
	packDateInput: string | Date,
	packagingType: KraftPackagingType,
	referenceDateInput: string | Date = new Date(),
): SterilityCalculation {
	const packDate = typeof packDateInput === "string" ? new Date(packDateInput) : new Date(packDateInput.getTime());
	const refDate =
		typeof referenceDateInput === "string" ? new Date(referenceDateInput) : new Date(referenceDateInput.getTime());

	const meta = STATUTORY_PACKAGING_TYPES[packagingType] ?? STATUTORY_PACKAGING_TYPES.kraft_heat_sealed;
	const daysLifespan = meta.statutoryShelfLifeDays;

	const expDate = new Date(packDate.getTime());
	expDate.setDate(expDate.getDate() + daysLifespan);

	const diffMs = expDate.getTime() - refDate.getTime();
	const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

	let status: SterilityStatus = "sterile_valid";
	if (daysLifespan === 0) {
		status = "sterile_valid";
	} else if (daysRemaining < 0) {
		status = "expired";
	} else if (daysRemaining <= 7) {
		status = "expiring_soon_7d";
	}

	const isExpired = status === "expired";
	const isExpiringSoon = status === "expiring_soon_7d";

	let humanReadableRemainingRu = "";
	if (daysLifespan === 0) {
		humanReadableRemainingRu = "Без упаковки (использовать в течение смены)";
	} else if (isExpired) {
		humanReadableRemainingRu = `Срок истек ${Math.abs(daysRemaining)} дн. назад (требуется повторная очистка и стерилизация)`;
	} else if (daysRemaining === 0) {
		humanReadableRemainingRu = "Истекает сегодня (до 23:59)";
	} else if (daysRemaining === 1) {
		humanReadableRemainingRu = "Остался 1 день стерильности";
	} else {
		humanReadableRemainingRu = `Осталось ${daysRemaining} дн. стерильности`;
	}

	const pad2 = (n: number) => String(n).padStart(2, "0");
	const packDateFormatted = `${packDate.getFullYear()}-${pad2(packDate.getMonth() + 1)}-${pad2(packDate.getDate())}`;
	const expDateFormatted = `${expDate.getFullYear()}-${pad2(expDate.getMonth() + 1)}-${pad2(expDate.getDate())}`;

	return {
		packDateFormatted,
		expDateFormatted,
		expDateIso: expDate.toISOString(),
		daysLifespan,
		daysRemaining,
		status,
		isExpired,
		isExpiringSoon,
		humanReadableRemainingRu,
	};
}
