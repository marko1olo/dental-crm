/**
 * treatmentPlanFormatters.ts — Форматирование рублей, копеек и прописи для планов лечения.
 */

import type { Kopecks } from "../../money.js";
import { formatKopecksRu, kopecksToRubles } from "../../money.js";
import { integerToRussianWords } from "../../sanpin/sanpinRegistryEngine.js";

export { escapeHtml } from "../../utils/strings.js";

export function formatRublesFromKopecks(kopecks: Kopecks): string {
	return formatKopecksRu(kopecks);
}

export function convertKopecksToRussianWords(kopecks: Kopecks): string {
	const n = Math.max(0, Math.floor(kopecksToRubles(kopecks)));
	const kop = Math.abs(kopecks) % 100;
	const words = integerToRussianWords(n);
	const capitalized = words.charAt(0).toUpperCase() + words.slice(1);
	return `${capitalized} рублей ${String(kop).padStart(2, "0")} копеек`;
}
