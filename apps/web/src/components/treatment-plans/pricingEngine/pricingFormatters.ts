import { type Kopecks, parseKopecks } from "@dental/shared";

/**
 * Разбор денежного значения без исключения посреди отрисовки.
 * @param allowEmptyAsZero - если true, null/undefined/"" дает 0 (для смет),
 *                            если false, дает null (для одонтограммы, где отсутствие цены = unknown).
 */
export function safeKopecks(
	value: number | string | null | undefined,
	options: { allowEmptyAsZero?: boolean } = { allowEmptyAsZero: true },
): Kopecks | null {
	if (value === null || value === undefined || value === "") {
		return options.allowEmptyAsZero ? (0 as Kopecks) : null;
	}
	if (typeof value === "number" && !Number.isFinite(value)) return null;
	try {
		return parseKopecks(value);
	} catch {
		return null;
	}
}

export const parseSafeKopecks = safeKopecks;

/**
 * Форматирование суммы в рублях на понятном русском языке.
 * Запрет на сырые «NULL», «NaN ₽», «404 Not Found» или машинный мусор в UI.
 */
export function formatPlanPriceRub(
	amountRub: number | string | null | undefined,
	fallbackText = "Цена не указана",
): string {
	if (amountRub === null || amountRub === undefined || amountRub === "") {
		return fallbackText;
	}
	const num =
		typeof amountRub === "string"
			? Number(amountRub.replace(/\s+/g, "").replace(",", "."))
			: amountRub;
	if (!Number.isFinite(num)) {
		return fallbackText;
	}
	const formatted = Math.round(num)
		.toLocaleString("ru-RU")
		.replace(/[\u00A0\u202F]/g, " ");
	return `${formatted} ₽`;
}

/**
 * Форматирует сумму в рублях для отображения пациенту у кресла.
 */
export function formatChairsidePrice(amountRub: number | undefined | null): string {
	const safe = typeof amountRub === "number" && !Number.isNaN(amountRub) ? Math.round(amountRub) : 0;
	return `${safe.toLocaleString("ru-RU")} ₽`;
}

/**
 * Форматирует сумму в копейках в рублевую строку.
 */
export function formatKopecksToRubString(amountKopecks: Kopecks | number): string {
	const rub = Math.round(Number(amountKopecks) / 100);
	return formatChairsidePrice(rub);
}
