/**
 * apps/web/src/components/visit/clinicalProcedureCatalogService.ts
 *
 * Каталог клинических процедур и автоматическое сопоставление состояния зуба с прейскурантом услуг.
 * Чистая доменная логика стоматологических манипуляций без бюрократических шифров в интерфейсе.
 *
 * Соответствует Mandates 8e, 8n, 8x, DEF-PRICE-03:
 * Связь процедурных штампов с актуальным каталогом прейскуранта клиники
 * с надежным дефолтом при пустой базе.
 */

import { kopecksToRubles } from "@dental/shared";
import {
	loadCanonicalPricelist,
	type PricelistStudioItem,
} from "../catalog/pricelistCatalogData";

export interface ClinicalProcedureService {
	id: string;
	title: string;
	code: string;
	/** Алиас обратной совместимости для старых тестов и внутренних модулей */
	code804n: string;
	priceRub: number;
}

// Для обратной совместимости типов
export type Inferred804nService = ClinicalProcedureService;

export interface CatalogLookupItem {
	readonly id?: string | undefined;
	readonly code?: string | undefined;
	readonly code804n?: string | undefined;
	readonly standardCode?: string | undefined;
	readonly statutoryCode?: string | undefined;
	readonly serviceCode?: string | undefined;
	readonly title?: string | undefined;
	readonly name?: string | undefined;
	readonly commercialTitle?: string | undefined;
	readonly basePriceRub?: number | undefined;
	readonly priceRub?: number | undefined;
	readonly priceKopecks?: number | undefined;
}

interface ProcedureDefinition {
	readonly idPrefix: string;
	readonly code: string;
	readonly defaultPriceRub: number;
	readonly formatTitle: (toothNumber: number) => string;
	readonly keywords: readonly string[];
}

const PROCEDURE_DEFINITIONS: Record<string, ProcedureDefinition> = {
	caries: {
		idPrefix: "srv-caries",
		code: "A16.07.002",
		defaultPriceRub: 4500,
		formatTitle: (n) => `Лечение кариеса зуба ${n} со световой пломбой`,
		keywords: ["кариес", "пломб", "световой"],
	},
	defective_restoration: {
		idPrefix: "srv-defective-restoration",
		code: "A16.07.002.011",
		defaultPriceRub: 4500,
		formatTitle: (n) => `Замена несостоятельной пломбы зуба ${n}`,
		keywords: ["несостоятельн", "замена пломб", "дефект"],
	},
	pulpitis: {
		idPrefix: "srv-pulpitis",
		code: "A16.07.030",
		defaultPriceRub: 6500,
		formatTitle: (n) => `Эндодонтическое лечение пульпита зуба ${n}`,
		keywords: ["пульпит", "эндодонт", "канал"],
	},
	periodontitis: {
		idPrefix: "srv-perio",
		code: "A16.07.008",
		defaultPriceRub: 7500,
		formatTitle: (n) => `Лечение периодонтита зуба ${n}`,
		keywords: ["периодонтит", "деструкция"],
	},
	done: {
		idPrefix: "srv-fill",
		code: "A16.07.002.011",
		defaultPriceRub: 4000,
		formatTitle: (n) => `Восстановление зуба ${n} пломбой из фотокомпозита`,
		keywords: ["фотокомпозит", "реставрация"],
	},
	calculus: {
		idPrefix: "srv-calculus",
		code: "A16.07.050.001",
		defaultPriceRub: 2500,
		formatTitle: (n) => `Удаление зубных отложений (скейлинг) в области зуба ${n}`,
		keywords: ["скейлинг", "отложений", "камень"],
	},
	crown: {
		idPrefix: "srv-crown",
		code: "A16.07.004",
		defaultPriceRub: 18000,
		formatTitle: (n) => `Восстановление зуба ${n} коронкой`,
		keywords: ["коронк", "металлокерамик", "циркон"],
	},
	bridge: {
		idPrefix: "srv-bridge",
		code: "A16.07.004.002",
		defaultPriceRub: 18500,
		formatTitle: (n) => `Восстановление зуба ${n} искусственным зубом (мостовидный протез)`,
		keywords: ["мостовидн", "искусственный зуб", "протез"],
	},
	veneer: {
		idPrefix: "srv-veneer",
		code: "A16.07.003.001",
		defaultPriceRub: 22000,
		formatTitle: (n) => `Восстановление зуба ${n} керамическим виниром`,
		keywords: ["винир", "e.max"],
	},
	inlay: {
		idPrefix: "srv-inlay",
		code: "A16.07.003",
		defaultPriceRub: 16000,
		formatTitle: (n) => `Восстановление зуба ${n} керамической вкладкой`,
		keywords: ["вкладк", "инлей", "онлей"],
	},
	missing: {
		idPrefix: "srv-extract",
		code: "A16.07.001",
		defaultPriceRub: 3500,
		formatTitle: (n) => `Удаление зуба ${n}`,
		keywords: ["удаление зуба", "простое удаление"],
	},
	root: {
		idPrefix: "srv-root-extract",
		code: "A16.07.001.002",
		defaultPriceRub: 4000,
		formatTitle: (n) => `Удаление корня зуба ${n}`,
		keywords: ["удаление корня"],
	},
	retained: {
		idPrefix: "srv-retained-extract",
		code: "A16.07.001.003",
		defaultPriceRub: 6500,
		formatTitle: (n) => `Удаление ретинированного/дистопированного зуба ${n}`,
		keywords: ["ретинированн", "дистопированн", "сложное удаление"],
	},
	implant: {
		idPrefix: "srv-implant",
		code: "A16.07.054",
		defaultPriceRub: 35000,
		formatTitle: (n) => `Внутрикостная дентальная имплантация в области зуба ${n}`,
		keywords: ["имплантация", "имплант"],
	},
};

function resolveDefinitionKey(stamp: string): string | null {
	const s = String(stamp || "").trim().toLowerCase();
	switch (s) {
		case "caries":
			return "caries";
		case "defective_restoration":
		case "defective":
		case "defect":
			return "defective_restoration";
		case "pulpitis":
			return "pulpitis";
		case "treatment":
		case "periodontitis":
		case "periodontitis_mild":
		case "periodontitis_moderate":
		case "periodontitis_severe":
			return "periodontitis";
		case "done":
		case "fill":
		case "filled":
		case "filling":
			return "done";
		case "calculus":
			return "calculus";
		case "crown":
		case "planned_crown":
			return "crown";
		case "bridge":
		case "bridge_abutment":
			return "bridge";
		case "veneer":
			return "veneer";
		case "inlay":
		case "onlay":
			return "inlay";
		case "missing":
		case "extracted":
			return "missing";
		case "root":
			return "root";
		case "retained":
		case "impacted":
			return "retained";
		case "implant":
		case "planned":
		case "planned_implant":
			return "implant";
		default:
			return null;
	}
}

function extractPriceFromLookupItem(item: CatalogLookupItem): number | null {
	if (typeof item.basePriceRub === "number" && item.basePriceRub > 0) {
		return item.basePriceRub;
	}
	if (typeof item.priceRub === "number" && item.priceRub > 0) {
		return item.priceRub;
	}
	if (typeof item.priceKopecks === "number" && item.priceKopecks > 0) {
		return Math.round(kopecksToRubles(item.priceKopecks));
	}
	return null;
}

function findMatchingCatalogPrice(
	def: ProcedureDefinition,
	catalog: readonly CatalogLookupItem[],
): number | null {
	// 1. Поиск по точному совпадению кода услуги
	for (const item of catalog) {
		const codes = [
			item.code,
			item.code804n,
			item.standardCode,
			item.statutoryCode,
			item.serviceCode,
		].filter(Boolean);
		if (codes.includes(def.code)) {
			const price = extractPriceFromLookupItem(item);
			if (price !== null && price > 0) return price;
		}
	}

	// 2. Поиск по префиксу кода (например A16.07.002 совпадает с A16.07.002.001)
	for (const item of catalog) {
		const codes = [
			item.code,
			item.code804n,
			item.standardCode,
			item.statutoryCode,
			item.serviceCode,
		].filter((c): c is string => typeof c === "string" && Boolean(c));
		if (codes.some((c) => c.startsWith(def.code) || def.code.startsWith(c))) {
			const price = extractPriceFromLookupItem(item);
			if (price !== null && price > 0) return price;
		}
	}

	// 3. Поиск по ключевым словам в названии
	for (const item of catalog) {
		const title = (item.title || item.name || item.commercialTitle || "").toLowerCase();
		if (!title) continue;
		if (def.keywords.some((kw) => title.includes(kw))) {
			const price = extractPriceFromLookupItem(item);
			if (price !== null && price > 0) return price;
		}
	}

	return null;
}

/**
 * Сопоставляет клиническую отметку (штамп зуба) с процедурой из каталога услуг клиники.
 * Если передан каталог или доступен сохраненный прейскурант, цена берется из актуальной базы.
 * При отсутствии базы используется клинически выверенный эталонный дефолт.
 */
export function inferProcedureServiceFromStamp(
	stamp: string,
	toothNumber: number,
	catalog?: readonly CatalogLookupItem[] | null,
): ClinicalProcedureService | null {
	const key = resolveDefinitionKey(stamp);
	if (!key) return null;

	const def = PROCEDURE_DEFINITIONS[key];
	if (!def) return null;

	let resolvedPrice = def.defaultPriceRub;

	// Проверяем переданный каталог
	if (catalog && catalog.length > 0) {
		const matchedPrice = findMatchingCatalogPrice(def, catalog);
		if (matchedPrice !== null && matchedPrice > 0) {
			resolvedPrice = matchedPrice;
		}
	} else if (typeof window !== "undefined") {
		// При отсутствии переданного каталога пробуем подтянуть из локального хранилища клиники
		try {
			const localItems = loadCanonicalPricelist();
			if (localItems && localItems.length > 0) {
				const lookupItems: CatalogLookupItem[] = localItems.map((it: PricelistStudioItem) => ({
					id: it.id,
					code: it.code,
					serviceCode: it.serviceCode,
					statutoryCode: it.regulatoryCode,
					title: it.title,
					priceKopecks: it.priceKopecks,
				}));
				const matchedPrice = findMatchingCatalogPrice(def, lookupItems);
				if (matchedPrice !== null && matchedPrice > 0) {
					resolvedPrice = matchedPrice;
				}
			}
		} catch {
			// Мягкий фолбек на эталонный дефолт при ошибках парсинга
		}
	}

	return {
		id: `${def.idPrefix}-${toothNumber}`,
		title: def.formatTitle(toothNumber),
		code: def.code,
		code804n: def.code,
		priceRub: resolvedPrice,
	};
}

/**
 * Канонический маппинг услуг каталога прейскуранта из штампа зубной формулы (Мандат 8x)
 */
export const inferCatalogServiceFromStamp = inferProcedureServiceFromStamp;

/**
 * Алиас обратной совместимости
 */
export const infer804nServiceFromStamp = inferProcedureServiceFromStamp;
