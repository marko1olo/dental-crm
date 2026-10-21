/**
 * formatters.ts — Форматирование денежных сумм и утилиты XML
 */

export function formatKopecksToRub(kopecks: number): string {
	const rub = Math.round(kopecks) / 100;
	return new Intl.NumberFormat("ru-RU", {
		style: "currency",
		currency: "RUB",
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(rub);
}

export function formatRubInt(kopecks: number): string {
	const rub = Math.round(kopecks / 100);
	return new Intl.NumberFormat("ru-RU").format(rub) + " ₽";
}

export function escapeXml(unsafe: string): string {
	return unsafe
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}
