/**
 * documentPrintFormatters.ts
 *
 * Канонические утилиты экранирования HTML, форматирования дат и сумм прописью для печатных форм документов (Стом-Икс стандарты).
 * Мандаты: 8b (<=800 строк), 8s (SSOT / Закон единого авторитета).
 */

import {
	kopecksToWordsRu,
	legalMoneyInWordsRu,
	legalMoneyInWordsFromKopecksRu,
	moneyToWordsRu,
	rublesToWordsRu,
	formatKopecksRu,
	parseKopecks,
} from "@dental/shared";

export function escapeHtml(str: unknown): string {
	if (str === null || str === undefined) return "";
	return String(str)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

export {
	kopecksToWordsRu,
	legalMoneyInWordsRu,
	legalMoneyInWordsFromKopecksRu,
	moneyToWordsRu,
	rublesToWordsRu,
	formatKopecksRu,
	parseKopecks,
};

export function formatDateRu(dateStr: string | null | undefined): string {
	if (!dateStr) return "«___» _________ _____ г.";
	try {
		const d = new Date(dateStr);
		if (Number.isNaN(d.getTime())) return escapeHtml(dateStr);
		return (
			d.toLocaleDateString("ru-RU", {
				day: "numeric",
				month: "long",
				year: "numeric",
			}) + " г."
		);
	} catch {
		return escapeHtml(dateStr);
	}
}

/**
 * Безопасное форматирование рублей в строку формата "12 345,00 ₽"
 * Исключает утечки `NaN ₽`, `undefined ₽` или дробных искажений.
 */
export function formatRublesExactRu(rubles: number | string | null | undefined): string {
	if (rubles === null || rubles === undefined || rubles === "") return "0,00 ₽";
	const num = typeof rubles === "string" ? Number(rubles.replace(/\s/g, "").replace(",", ".")) : rubles;
	if (!Number.isFinite(num)) return "0,00 ₽";
	return formatKopecksRu(parseKopecks(num));
}

