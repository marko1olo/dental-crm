import { isDemoShowcaseMode } from "../../../lib/demoMode";
import type { PlanPriceCatalogItem } from "../planDriftAudit";

export type CatalogServiceLookupItem = PlanPriceCatalogItem;

export interface MatchCatalogServiceResult {
	readonly priceRub: number;
	readonly unitPriceRub: number;
	readonly title: string;
	readonly priceId: string | null;
	readonly fromCatalog: boolean;
	readonly isDraft: boolean;
	readonly requiresManualPricing: boolean;
}

/**
 * Поиск услуги в прейскуранте клиники по коду услуги или ключевым словам.
 * В PROD-режиме: при отсутствии в каталоге возвращает priceRub: 0, unitPriceRub: 0, isDraft: true, requiresManualPricing: true.
 * В DEMO-режиме: использует демонстрационную цену fallbackPriceRub.
 */
export function matchCatalogService(
	catalog: readonly CatalogServiceLookupItem[] | undefined,
	category: string,
	keywords: readonly string[],
	fallbackPriceRub: number,
	order804nCode?: string,
	options?: { isDemoMode?: boolean; serviceCode?: string },
): MatchCatalogServiceResult {
	const isDemo = isDemoShowcaseMode(options?.isDemoMode);
	const targetCode = options?.serviceCode || order804nCode;

	if (catalog && catalog.length > 0) {
		const normalizedKeywords = keywords.map((k) => k.toLowerCase().replace(/ё/g, "е"));

		// 1. Точное совпадение по коду услуги (если есть в прайсе)
		if (targetCode) {
			const byCode = catalog.find(
				(s) =>
					s.active !== false &&
					(s.title.includes(targetCode) ||
						s.serviceCode === targetCode ||
						s.order804nCode === targetCode ||
						s.code === targetCode),
			);
			if (byCode && typeof byCode.basePriceRub === "number" && byCode.basePriceRub > 0) {
				return {
					priceRub: byCode.basePriceRub,
					unitPriceRub: byCode.basePriceRub,
					title: byCode.title,
					priceId: byCode.id,
					fromCatalog: true,
					isDraft: false,
					requiresManualPricing: false,
				};
			}
		}

		// 2. Сопоставление по ключевым словам и категории
		const matched = catalog.filter((item) => {
			const title = item.title.toLowerCase().replace(/ё/g, "е");
			return normalizedKeywords.some((kw) => title.includes(kw));
		});

		const activeMatch = matched.find((s) => s.active !== false) ?? matched[0];
		if (activeMatch && typeof activeMatch.basePriceRub === "number" && activeMatch.basePriceRub > 0) {
			return {
				priceRub: activeMatch.basePriceRub,
				unitPriceRub: activeMatch.basePriceRub,
				title: activeMatch.title,
				priceId: activeMatch.id,
				fromCatalog: true,
				isDraft: false,
				requiresManualPricing: false,
			};
		}
	}

	// Услуга отсутствует в каталоге или basePriceRub === 0:
	if (isDemo) {
		return {
			priceRub: fallbackPriceRub,
			unitPriceRub: fallbackPriceRub,
			title: "",
			priceId: null,
			fromCatalog: false,
			isDraft: false,
			requiresManualPricing: false,
		};
	}

	// PROD-режим: запрещено подставлять фиксированные дефолтные цены!
	return {
		priceRub: 0,
		unitPriceRub: 0,
		title: "",
		priceId: null,
		fromCatalog: false,
		isDraft: true,
		requiresManualPricing: true,
	};
}
