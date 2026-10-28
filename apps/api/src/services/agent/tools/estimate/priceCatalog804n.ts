/**
 * priceCatalog804n.ts — Canonical Ministry of Health Nomenclature 804n Price Catalog.
 *
 * Provides standard fallback pricing and service categorization when prices
 * are not explicitly present in the clinic database or user input.
 */

export interface StandardCatalogService {
	readonly code: string;
	readonly title: string;
	readonly category: string;
	readonly priceRub: number;
}

export const CANONICAL_804N_PRICE_CATALOG: Readonly<
	Record<string, StandardCatalogService>
> = {
	"A16.07.002": {
		code: "A16.07.002",
		title: "Восстановление зуба пломбой (лечение кариеса)",
		category: "Терапия",
		priceRub: 10000,
	},
	"A16.07.004": {
		code: "A16.07.004",
		title: "Восстановление зуба коронкой постоянной",
		category: "Ортопедия",
		priceRub: 40000,
	},
	"A16.07.054": {
		code: "A16.07.054",
		title: "Внутрикостная дентальная имплантация",
		category: "Имплантация",
		priceRub: 50000,
	},
	"A16.07.001": {
		code: "A16.07.001",
		title: "Удаление постоянного зуба",
		category: "Хирургия",
		priceRub: 5000,
	},
	"A16.07.008": {
		code: "A16.07.008",
		title: "Пломбирование корневого канала зуба (эндодонтия)",
		category: "Терапия",
		priceRub: 15000,
	},
	"A16.07.051": {
		code: "A16.07.051",
		title: "Профессиональная гигиена полости рта и зубов",
		category: "Гигиена",
		priceRub: 7000,
	},
	"A16.07.041": {
		code: "A16.07.041",
		title: "Костная пластика челюстно-лицевой области (синус-лифтинг)",
		category: "Хирургия",
		priceRub: 45000,
	},
	"A16.07.050": {
		code: "A16.07.050",
		title: "Профессиональное отбеливание зубов",
		category: "Гигиена",
		priceRub: 25000,
	},
	"A16.07.048": {
		code: "A16.07.048",
		title: "Ортодонтическая коррекция с применением брекет-системы",
		category: "Ортодонтия",
		priceRub: 120000,
	},
	"B01.065.001": {
		code: "B01.065.001",
		title: "Прием (осмотр, консультация) врача-стоматолога первичный",
		category: "Консультация",
		priceRub: 2500,
	},
	"A06.07.007": {
		code: "A06.07.007",
		title: "Прицельная внутриротовая рентгенография / КЛКТ",
		category: "Диагностика",
		priceRub: 3000,
	},
};

export function resolveStandardCatalogPrice(
	code?: string | null,
	serviceName?: string | null,
): StandardCatalogService | null {
	if (code && CANONICAL_804N_PRICE_CATALOG[code]) {
		return CANONICAL_804N_PRICE_CATALOG[code] ?? null;
	}

	if (serviceName) {
		const nameLower = serviceName.toLowerCase();
		if (nameLower.includes("имплант"))
			return CANONICAL_804N_PRICE_CATALOG["A16.07.054"] ?? null;
		if (nameLower.includes("коронк") || nameLower.includes("протез"))
			return CANONICAL_804N_PRICE_CATALOG["A16.07.004"] ?? null;
		if (
			nameLower.includes("кариес") ||
			nameLower.includes("пломб") ||
			nameLower.includes("реставрац")
		)
			return CANONICAL_804N_PRICE_CATALOG["A16.07.002"] ?? null;
		if (
			nameLower.includes("канал") ||
			nameLower.includes("пульпит") ||
			nameLower.includes("периодонтит")
		)
			return CANONICAL_804N_PRICE_CATALOG["A16.07.008"] ?? null;
		if (nameLower.includes("удален") || nameLower.includes("экстракц"))
			return CANONICAL_804N_PRICE_CATALOG["A16.07.001"] ?? null;
		if (
			nameLower.includes("гигиен") ||
			nameLower.includes("чистк") ||
			nameLower.includes("air flow")
		)
			return CANONICAL_804N_PRICE_CATALOG["A16.07.051"] ?? null;
		if (nameLower.includes("синус") || nameLower.includes("костн"))
			return CANONICAL_804N_PRICE_CATALOG["A16.07.041"] ?? null;
		if (nameLower.includes("отбеливан"))
			return CANONICAL_804N_PRICE_CATALOG["A16.07.050"] ?? null;
		if (
			nameLower.includes("брекет") ||
			nameLower.includes("элайнер") ||
			nameLower.includes("прикус")
		)
			return CANONICAL_804N_PRICE_CATALOG["A16.07.048"] ?? null;
		if (
			nameLower.includes("снимок") ||
			nameLower.includes("рентген") ||
			nameLower.includes("кт") ||
			nameLower.includes("клкт")
		)
			return CANONICAL_804N_PRICE_CATALOG["A06.07.007"] ?? null;
		if (nameLower.includes("консульт") || nameLower.includes("осмотр"))
			return CANONICAL_804N_PRICE_CATALOG["B01.065.001"] ?? null;
	}

	return null;
}
