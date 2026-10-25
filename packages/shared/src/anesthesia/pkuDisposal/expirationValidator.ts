/**
 * @dental/shared/anesthesia/pkuDisposal/expirationValidator.ts
 * Carpule Expiration Date Calculations & Validation (Mandate 8b, <= 120 lines)
 */

/**
 * Рассчитывает дату срока годности по умолчанию (+N лет от текущей или референсной даты).
 * Формат: ГГГГ-ММ.
 */
export function calculateDefaultCarpuleExpirationDate(
	offsetYears: number = 2,
	referenceDate?: Date | string,
): string {
	const now = referenceDate
		? typeof referenceDate === "string"
			? new Date(referenceDate)
			: referenceDate
		: new Date();
	const targetYear = now.getFullYear() + offsetYears;
	const targetMonth = String(now.getMonth() + 1).padStart(2, "0");
	return `${targetYear}-${targetMonth}`;
}

/**
 * Валидирует срок годности карпулы/ампулы анестетика.
 */
export function validateCarpuleExpirationDate(
	expDateString: string,
	referenceDateIso?: string,
): {
	isExpired: boolean;
	daysRemaining: number;
	formattedExpDateRu: string;
	warningRu: string | null;
} {
	const trimmed = (expDateString ?? "").trim();
	if (!trimmed) {
		return {
			isExpired: false,
			daysRemaining: 999,
			formattedExpDateRu: "Не указан",
			warningRu: "Внимание: срок годности карпулы не указан в карте!",
		};
	}

	const now = referenceDateIso ? new Date(referenceDateIso) : new Date();
	let expDate: Date;

	if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
		expDate = new Date(trimmed);
	} else if (/^\d{4}-\d{2}$/.test(trimmed)) {
		const [year, month] = trimmed.split("-").map(Number);
		expDate = new Date(year ?? 2026, month ?? 1, 0, 23, 59, 59);
	} else if (/^\d{2}\.\d{4}$/.test(trimmed)) {
		const [month, year] = trimmed.split(".").map(Number);
		expDate = new Date(year ?? 2026, month ?? 1, 0, 23, 59, 59);
	} else if (/^\d{2}\.\d{2}\.\d{4}$/.test(trimmed)) {
		const [day, month, year] = trimmed.split(".").map(Number);
		expDate = new Date(year ?? 2026, (month ?? 1) - 1, day ?? 1, 23, 59, 59);
	} else {
		expDate = new Date(trimmed);
	}

	if (Number.isNaN(expDate.getTime())) {
		return {
			isExpired: false,
			daysRemaining: 999,
			formattedExpDateRu: trimmed,
			warningRu: `Нестандартный формат срока годности: «${trimmed}».`,
		};
	}

	const diffMs = expDate.getTime() - now.getTime();
	const daysRemaining = Math.floor(diffMs / (1000 * 60 * 60 * 24));
	const isExpired = daysRemaining < 0;

	const formattedExpDateRu = expDate.toLocaleDateString("ru-RU", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	});

	let warningRu: string | null = null;
	if (isExpired) {
		warningRu = `КРИТИЧЕСКИЙ ЗАПРЕТ: Срок годности партии карпул ИСТЁК ${Math.abs(daysRemaining)} дн. назад (${formattedExpDateRu})! Применение запрещено ст. 69 ФЗ № 323 и СанПиН 3.3686-21.`;
	} else if (daysRemaining <= 30) {
		warningRu = `ВНИМАНИЕ: Срок годности карпул истекает через ${daysRemaining} дн. (${formattedExpDateRu}). Партия подлежит приоритетному списанию.`;
	}

	return {
		isExpired,
		daysRemaining,
		formattedExpDateRu,
		warningRu,
	};
}
