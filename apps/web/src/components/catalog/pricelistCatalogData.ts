/**
 * apps/web/src/components/catalog/pricelistCatalogData.ts
 *
 * Канонический SSOT фасад прейскуранта услуг стоматологической клиники.
 * Декомпозирован строго по Мандату 8b (лимит строк <= 80 строк на фасад).
 * Модули:
 * - ./pricelist/pricelistCatalogTypes.ts — типы, нормализаторы, статистика
 * - ./pricelist/pricelistCatalogPresets.ts — канонические пакеты и золотой пресет РФ
 * - ./pricelist/pricelistCatalogStorage.ts — синхронизация с PG18 и localStorage
 */

import {
	formatKopecksRu,
	formatKopecksToRubles as sharedFormatKopecksToRubles,
	kopecksToRubles,
	parseKopecks,
	rublesToKopecks,
	RU_MONEY_MINUS,
	RU_MONEY_NBSP,
} from "@dental/shared";

export * from "./pricelist/pricelistCatalogTypes";
export * from "./pricelist/pricelistCatalogPresets";
export * from "./pricelist/pricelistCatalogStorage";

// =============================================================================
// HELPER ARITHMETIC COMPATIBILITY BRIDGES (SSOT @dental/shared/src/money.ts)
// =============================================================================

export function formatKopecksToRubles(kopecks: number): string {
	const safeKopecks = Math.round(Number.isFinite(kopecks) ? kopecks : 0);
	if (safeKopecks === 0) return `0${RU_MONEY_NBSP}₽`;
	if (safeKopecks % 100 === 0) {
		const whole = Math.trunc(kopecksToRubles(Math.abs(safeKopecks)));
		const grouped = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, RU_MONEY_NBSP);
		const sign = safeKopecks < 0 ? RU_MONEY_MINUS : "";
		return `${sign}${grouped}${RU_MONEY_NBSP}₽`;
	}
	return formatKopecksRu(safeKopecks);
}

export function kopecksToRublesExact(kopecks: number): string {
	const safeKopecks = Math.round(Number.isFinite(kopecks) ? kopecks : 0);
	if (safeKopecks % 100 === 0) {
		return String(kopecksToRubles(safeKopecks));
	}
	return sharedFormatKopecksToRubles(safeKopecks);
}

export function parseRublesToKopecks(rublesInput: string | number): number {
	if (typeof rublesInput === "number") {
		return rublesToKopecks(rublesInput);
	}
	if (!rublesInput || typeof rublesInput !== "string") {
		return 0;
	}
	const cleaned = rublesInput
		.replace(/[₽\u00A0\s]|руб\.?/gi, "")
		.replace(",", ".")
		.trim();
	if (!cleaned) return 0;
	const num = Number(cleaned);
	if (!Number.isFinite(num) || Number.isNaN(num)) {
		return 0;
	}
	return rublesToKopecks(num);
}

export function kopecksToRublesNumber(kopecks: number): number {
	return kopecksToRubles(kopecks);
}
