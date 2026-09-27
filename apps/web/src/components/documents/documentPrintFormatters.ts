/**
 * documentPrintFormatters.ts
 *
 * Канонические утилиты экранирования HTML и форматирования дат для печатных форм документов.
 * Мандаты: 8b (<=800 строк), 8s (SSOT / Закон единого авторитета).
 */

export { escapeHtml } from "@dental/shared";

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
