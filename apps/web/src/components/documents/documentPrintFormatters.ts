/**
 * documentPrintFormatters.ts
 *
 * Канонические утилиты экранирования HTML, форматирования дат и сумм прописью для печатных форм документов (Стом-Икс стандарты).
 * Мандаты: 8b (<=800 строк), 8s (SSOT / Закон единого авторитета).
 */

import {
	escapeHtml,
	formatKopecksRu,
	formatRublesExactRu,
	kopecksToWordsRu,
	legalMoneyInWordsFromKopecksRu,
	legalMoneyInWordsRu,
	moneyToWordsRu,
	parseKopecks,
	rublesToWordsRu,
} from "@dental/shared";

export {
	escapeHtml,
	formatKopecksRu,
	formatRublesExactRu,
	kopecksToWordsRu,
	legalMoneyInWordsFromKopecksRu,
	legalMoneyInWordsRu,
	moneyToWordsRu,
	parseKopecks,
	rublesToWordsRu,
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


