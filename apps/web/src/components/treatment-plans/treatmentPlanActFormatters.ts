/**
 * treatmentPlanActFormatters.ts — Форматирование денежных сумм, склонение и сумма прописью
 * для официальных Актов сдачи-приемки и регламентных документов DENTE CRM.
 * Мандаты: 8b (<=800 строк), 8s (SSOT / Закон единого авторитета).
 */

import { type Kopecks, formatKopecksRu, kopecksToWordsRu, parseKopecks } from "@dental/shared";

/**
 * Преобразует числовую сумму в рубли и копейки с гарантией точности (без плавающей точки).
 */
export function formatMoneyExact(rub: number, kopecks?: Kopecks): string {
	if (kopecks !== undefined && Number.isInteger(kopecks)) {
		return formatKopecksRu(kopecks);
	}
	const safeKopecks = Math.round(rub * 100);
	return formatKopecksRu(safeKopecks as Kopecks);
}

export { pluralizeRu } from "../../lib/russianPlural";

/**
 * Преобразует сумму в рублях в строку прописью (стандарт бухгалтерских актов РФ).
 * Пример: 19600 руб. 00 коп. -> "Девятнадцать тысяч шестьсот рублей 00 копеек"
 * Канонически делегирует в @dental/shared/moneyWordsRu (Мандат 8s SSOT).
 */
export function numberToWordsRu(amountRub: number, amountKopecks: number = 0): string {
	if (!Number.isFinite(amountRub)) return "Ноль рублей 00 копеек";
	const rublesOnly = Math.floor(Math.abs(amountRub));
	const kop = Math.abs(amountKopecks) % 100;
	const totalKopecks = (amountRub < 0 ? -1 : 1) * (rublesOnly * 100 + kop);
	return kopecksToWordsRu(totalKopecks);
}

