/*
 * REVIEWER probe 3 (read-only): the dispatched defect is "mangled title on a
 * price range". This enumerates range FORMS the author's inventory never
 * measured, to answer "did it miss a site?" in this packet's own terms.
 */

import type { ServiceCatalogItem } from "@dental/shared";
import { analyzePricelist } from "../../../../apps/api/src/pricelist/analyzer.js";

const EMPTY: ServiceCatalogItem[] = [];

const lines = [
	// currency marker on BOTH bounds — very common in real pricelists
	"Отбеливание 12000 руб - 18000 руб",
	"Отбеливание 12000 руб. – 18000 руб.",
	"Отбеливание 12000 ₽ - 18000 ₽",
	"Отбеливание 12000₽-18000₽",
	"Отбеливание от 12000 руб до 18000 руб",
	"Отбеливание 12000 р. - 18000 р.",
	// three-tier slash chain (the fix leaves a dangling separator)
	"Отбеливание 12000/15000/18000 руб",
	"Отбеливание 12000-15000-18000 руб",
	// other range words
	"Отбеливание 12000 или 18000 руб",
	"Отбеливание 12000…18000 руб",
	"Отбеливание 12000..18000 руб",
	// float-fragile kopecks in both bounds (author only tested ,50 and ,75)
	"Отбеливание 12000,10/18000,30 руб",
	"Отбеливание 12000,10-18000,30 руб",
	"Отбеливание 1500,01/2500,07 руб",
];

for (const line of lines) {
	const response = await analyzePricelist(
		{
			sourceName: "reviewer-probe-3",
			sourceKind: "text",
			rawText: line,
			imageMimeType: "image/jpeg",
			preferredSpecialty: "universal",
			useServerAi: false,
		},
		EMPTY,
	);
	const item = response.items[0];
	console.log(
		item
			? `title=«${item.title}» price=${item.priceRub} max=${item.priceMaxRub} min/max/avg=${response.summary?.minPriceRub}/${response.summary?.maxPriceRub}/${response.summary?.averagePriceRub} | src=${line}`
			: `NO ITEM | src=${line}`,
	);
}
