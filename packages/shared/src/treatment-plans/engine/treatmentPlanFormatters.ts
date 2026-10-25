/**
 * treatmentPlanFormatters.ts — Форматирование рублей, копеек и прописи для планов лечения.
 */

import type { Kopecks } from "../../utils/money.js";
import { integerToRussianWords } from "../../sanpin/sanpinRegistryEngine.js";

export function escapeHtml(str: unknown): string {
	if (str === null || str === undefined) return "";
	return String(str)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

export function formatRublesFromKopecks(kopecks: Kopecks): string {
	const whole = Math.trunc(kopecks / 100);
	const frac = Math.abs(kopecks % 100);
	const grouped = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0");
	return `${grouped},${String(frac).padStart(2, "0")}\u00A0₽`;
}

export function convertKopecksToRussianWords(kopecks: Kopecks): string {
	const n = Math.max(0, Math.floor(kopecks / 100));
	const kop = Math.abs(kopecks % 100);
	const words = integerToRussianWords(n);
	const capitalized = words.charAt(0).toUpperCase() + words.slice(1);
	return `${capitalized} рублей ${String(kop).padStart(2, "0")} копеек`;
}
