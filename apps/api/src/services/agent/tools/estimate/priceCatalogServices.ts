/**
 * priceCatalogServices.ts — Canonical Clinical Services Price Catalog.
 *
 * Mandate 8ap: Clinical Domain Services Catalog (Order 804n nomenclature).
 * All financial values represented in integer kopecks (amountKopecks) and rubles.
 * Provides standard fallback pricing and service categorization when prices
 * are not explicitly present in the clinic database or user input.
 */

export interface StandardCatalogService {
	readonly code: string;
	readonly title: string;
	readonly category: string;
	readonly priceRub: number;
	readonly priceKopecks: number;
}

export const CANONICAL_SERVICES_PRICE_CATALOG: Readonly<
	Record<string, StandardCatalogService>
> = {
	"A16.07.002": {
		code: "A16.07.002",
		title: "Восстановление зуба пломбой (лечение кариеса)",
		category: "Терапия",
		priceRub: 10000,
		priceKopecks: 1000000,
	},
	"A16.07.004": {
		code: "A16.07.004",
		title: "Восстановление зуба коронкой постоянной",
		category: "Ортопедия",
		priceRub: 40000,
		priceKopecks: 4000000,
	},
	"A16.07.054": {
		code: "A16.07.054",
		title: "Внутрикостная дентальная имплантация",
		category: "Имплантация",
		priceRub: 50000,
		priceKopecks: 5000000,
	},
	"A16.07.001": {
		code: "A16.07.001",
		title: "Удаление постоянного зуба",
		category: "Хирургия",
		priceRub: 5000,
		priceKopecks: 500000,
	},
	"A16.07.008": {
		code: "A16.07.008",
		title: "Пломбирование корневого канала зуба (эндодонтия)",
		category: "Терапия",
		priceRub: 15000,
		priceKopecks: 1500000,
	},
	"A16.07.051": {
		code: "A16.07.051",
		title: "Профессиональная гигиена полости рта и зубов",
		category: "Гигиена",
		priceRub: 7000,
		priceKopecks: 700000,
	},
	"A16.07.041": {
		code: "A16.07.041",
		title: "Костная пластика челюстно-лицевой области (синус-лифтинг)",
		category: "Хирургия",
		priceRub: 45000,
		priceKopecks: 4500000,
	},
	"A16.07.050": {
		code: "A16.07.050",
		title: "Профессиональное отбеливание зубов",
		category: "Гигиена",
		priceRub: 25000,
		priceKopecks: 2500000,
	},
	"A16.07.048": {
		code: "A16.07.048",
		title: "Ортодонтическая коррекция с применением брекет-системы",
		category: "Ортодонтия",
		priceRub: 120000,
		priceKopecks: 12000000,
	},
	"B01.065.001": {
		code: "B01.065.001",
		title: "Прием (осмотр, консультация) врача-стоматолога первичный",
		category: "Консультация",
		priceRub: 2500,
		priceKopecks: 250000,
	},
	"A06.07.007": {
		code: "A06.07.007",
		title: "Прицельная внутриротовая рентгенография / КЛКТ",
		category: "Диагностика",
		priceRub: 3000,
		priceKopecks: 300000,
	},
};


export function resolveStandardCatalogPrice(
	code?: string | null,
	serviceName?: string | null,
): StandardCatalogService | null {
	if (code && CANONICAL_SERVICES_PRICE_CATALOG[code]) {
		return CANONICAL_SERVICES_PRICE_CATALOG[code] ?? null;
	}

	if (serviceName) {
		const nameLower = serviceName.toLowerCase();
		if (nameLower.includes("имплант"))
			return CANONICAL_SERVICES_PRICE_CATALOG["A16.07.054"] ?? null;
		if (nameLower.includes("коронк") || nameLower.includes("протез"))
			return CANONICAL_SERVICES_PRICE_CATALOG["A16.07.004"] ?? null;
		if (
			nameLower.includes("кариес") ||
			nameLower.includes("пломб") ||
			nameLower.includes("реставрац")
		)
			return CANONICAL_SERVICES_PRICE_CATALOG["A16.07.002"] ?? null;
		if (
			nameLower.includes("канал") ||
			nameLower.includes("пульпит") ||
			nameLower.includes("периодонтит")
		)
			return CANONICAL_SERVICES_PRICE_CATALOG["A16.07.008"] ?? null;
		if (nameLower.includes("удален") || nameLower.includes("экстракц"))
			return CANONICAL_SERVICES_PRICE_CATALOG["A16.07.001"] ?? null;
		if (
			nameLower.includes("гигиен") ||
			nameLower.includes("чистк") ||
			nameLower.includes("air flow")
		)
			return CANONICAL_SERVICES_PRICE_CATALOG["A16.07.051"] ?? null;
		if (nameLower.includes("синус") || nameLower.includes("костн"))
			return CANONICAL_SERVICES_PRICE_CATALOG["A16.07.041"] ?? null;
		if (nameLower.includes("отбеливан"))
			return CANONICAL_SERVICES_PRICE_CATALOG["A16.07.050"] ?? null;
		if (
			nameLower.includes("брекет") ||
			nameLower.includes("элайнер") ||
			nameLower.includes("прикус")
		)
			return CANONICAL_SERVICES_PRICE_CATALOG["A16.07.048"] ?? null;
		if (
			nameLower.includes("снимок") ||
			nameLower.includes("рентген") ||
			nameLower.includes("кт") ||
			nameLower.includes("клкт")
		)
			return CANONICAL_SERVICES_PRICE_CATALOG["A06.07.007"] ?? null;
		if (nameLower.includes("консульт") || nameLower.includes("осмотр"))
			return CANONICAL_SERVICES_PRICE_CATALOG["B01.065.001"] ?? null;
	}

	return null;
}
