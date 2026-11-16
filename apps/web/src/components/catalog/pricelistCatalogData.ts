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

import { formatKopecksRu, kopecksToRubles, parseKopecks, rublesToKopecks } from "@dental/shared";

export * from "./pricelist/pricelistCatalogTypes";
export * from "./pricelist/pricelistCatalogPresets";
export * from "./pricelist/pricelistCatalogStorage";

// =============================================================================
// HELPER ARITHMETIC COMPATIBILITY BRIDGES (SSOT @dental/shared/src/money.ts)
// =============================================================================

export function formatKopecksToRubles(kopecks: number): string {
	return formatKopecksRu(Math.round(Number.isFinite(kopecks) ? kopecks : 0));
}

export function kopecksToRublesExact(kopecks: number): string {
	const safeKopecks = Math.round(Number.isFinite(kopecks) ? kopecks : 0);
	if (safeKopecks % 100 === 0) {
		return String(safeKopecks / 100);
	}
	return (safeKopecks / 100).toFixed(2);
}

export function parseRublesToKopecks(rublesInput: string | number): number {
	if (typeof rublesInput === "number") {
		return rublesToKopecks(rublesInput);
	}
	try {
		return parseKopecks(rublesInput);
	} catch {
		return 0;
	}
}

export function kopecksToRublesNumber(kopecks: number): number {
	return kopecksToRubles(kopecks);
}
