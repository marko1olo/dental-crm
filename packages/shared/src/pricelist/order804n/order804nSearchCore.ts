/**
 * packages/shared/src/pricelist/order804n/order804nSearchCore.ts
 * Layer 2: Domain Search, Normalization, Lemmatization & Statutory 804n Code Validation.
 *
 * Implements Mandates 8b, 8c, 8e, 8l, 8n, 8s, 8t, 8z.
 * Pure Layer 2 domain logic without DOM or network dependencies.
 */

import type { DentalSpecialty, ServiceCategory } from "../../schemas/aiAndEgiszSchemas.js";
import {
	PEDIATRIC_804N_CATALOG,
	THERAPEUTIC_AND_DIAGNOSTIC_BASE_CATALOG,
} from "./therapeuticAndDiagnosticCatalog.js";
import { SURGICAL_AND_ORTHO_804N_CATALOG } from "./surgicalAndOrthoCatalog.js";
import type {
	Order804nCategorySummary,
	Order804nSearchOptions,
	Order804nSearchResult,
	Order804nValidationResult,
	StatutoryNomenclatureEntry,
} from "./types.js";

/**
 * Complete statutory Minzdrav Order 804n registry assembled in canonical order.
 */
export const ORDER_804N_STATUTORY_REGISTRY: readonly StatutoryNomenclatureEntry[] = [
	...THERAPEUTIC_AND_DIAGNOSTIC_BASE_CATALOG,
	...SURGICAL_AND_ORTHO_804N_CATALOG,
	...PEDIATRIC_804N_CATALOG,
];

/**
 * Standard statutory 804n code regex pattern (e.g. A16.07.002, B01.065.001 or B01.003.004.005).
 */
export const ORDER_804N_CODE_REGEX = /^[AB]\d{2}\.\d{2,3}\.\d{3}(?:\.\d{3})?$/;

/**
 * Normalizes Cyrillic 'А'/'В' to Latin 'A'/'B' in statutory codes.
 */
export function normalize804nCode(rawCode: string): string {
	return (rawCode || "")
		.trim()
		.toUpperCase()
		.replace(/^А/, "A")
		.replace(/^В/, "B");
}

/**
 * Validates if string strictly conforms to Minzdrav Order 804n code syntax.
 */
export function isOrder804nCode(str: string): boolean {
	const norm = normalize804nCode(str);
	return ORDER_804N_CODE_REGEX.test(norm);
}

/**
 * Validates code format and resolves against the canonical statutory registry.
 */
export function validate804nCode(rawCode: string): Order804nValidationResult {
	const normalizedCode = normalize804nCode(rawCode);
	if (!normalizedCode) {
		return { isValid: false, normalizedCode: "", error: "Код услуги 804н не может быть пустым" };
	}
	if (!isOrder804nCode(normalizedCode)) {
		return {
			isValid: false,
			normalizedCode,
			error: `Недопустимый формат кода 804н: "${rawCode}". Ожидается вид A16.07.002 или B01.065.001.`,
		};
	}

	const entry = ORDER_804N_STATUTORY_REGISTRY.find(
		(e) => e.code === normalizedCode || normalizedCode.startsWith(e.code),
	);

	if (!entry) {
		return {
			isValid: true, // syntactically valid code
			normalizedCode,
		};
	}

	return {
		isValid: true,
		normalizedCode,
		entry,
	};
}

/**
 * Look up statutory nomenclature entry by exact or prefix code.
 */
export function find804nEntryByCode(code: string): StatutoryNomenclatureEntry | undefined {
	const normalized = normalize804nCode(code);
	return ORDER_804N_STATUTORY_REGISTRY.find(
		(e) => e.code === normalized || normalized.startsWith(e.code),
	);
}

/**
 * Filters registry entries by service category.
 */
export function get804nEntriesByCategory(
	category: ServiceCategory,
): readonly StatutoryNomenclatureEntry[] {
	return ORDER_804N_STATUTORY_REGISTRY.filter((e) => e.category === category);
}

/**
 * Filters registry entries by dental specialty.
 */
export function get804nEntriesBySpecialty(
	specialty: DentalSpecialty,
): readonly StatutoryNomenclatureEntry[] {
	return ORDER_804N_STATUTORY_REGISTRY.filter(
		(e) => e.specialty === specialty || e.specialty === "universal",
	);
}

/**
 * Lightweight Russian stemmer heuristic for clinical service names.
 */
export function stemCyrillicWord(word: string): string {
	const w = word.toLowerCase().trim();
	if (w.length < 4) return w;
	return w
		.replace(/(?:ого|его|ому|ему|ыми|ими|ых|их|ую|юю|ая|яя|ое|ее|ый|ий|ой|ей)$/, "")
		.replace(/(?:овать|евать|ивать|ывать)$/, "")
		.replace(/(?:ование|евание|ация|яция|ение|яние|ость|есть)$/, "")
		.replace(/(?:ическ|еск|ческ|ск)$/, "")
		.replace(/(?:ов|ев|ам|ям|ах|ях|ом|ем|ами|ями)$/, "")
		.replace(/(?:а|я|о|е|ы|и|у|ю|ь|ъ)$/, "");
}

/**
 * Tokenizes text and stems words for clinical lexical matching.
 */
export function tokenizeAndStem(text: string): readonly string[] {
	return (text || "")
		.toLowerCase()
		.split(/[\s,.;:!?()«»""'’\/\-\+\[\]]+/)
		.filter((w) => w.length >= 3)
		.map(stemCyrillicWord);
}

/**
 * High-performance search & ranking over Order 804n registry with code, keyword and fuzzy matching.
 */
export function search804nRegistry(
	query: string,
	options?: Order804nSearchOptions,
): readonly Order804nSearchResult[] {
	const rawQuery = (query || "").trim();
	if (!rawQuery && !options?.codeHint) return [];

	const normalizedCodeQuery = normalize804nCode(options?.codeHint || rawQuery);
	const results: Order804nSearchResult[] = [];

	const catFilters = options?.categoryFilter
		? Array.isArray(options.categoryFilter)
			? options.categoryFilter
			: [options.categoryFilter]
		: undefined;

	const specFilters = options?.specialtyFilter
		? Array.isArray(options.specialtyFilter)
			? options.specialtyFilter
			: [options.specialtyFilter]
		: undefined;

	const queryStems = tokenizeAndStem(rawQuery);
	const maxResults = options?.maxResults ?? 20;
	const threshold = options?.threshold ?? 0.2;

	for (const entry of ORDER_804N_STATUTORY_REGISTRY) {
		// Category & Specialty filters
		if (catFilters && !catFilters.includes(entry.category)) continue;
		if (specFilters && !specFilters.includes(entry.specialty) && entry.specialty !== "universal") {
			continue;
		}

		// Exact code match
		if (normalizedCodeQuery && entry.code === normalizedCodeQuery) {
			results.push({
				entry,
				score: 1.0,
				matchType: "exact_code",
				matchedTerm: entry.code,
			});
			continue;
		}

		// Prefix code match
		if (normalizedCodeQuery && normalizedCodeQuery.startsWith(entry.code)) {
			results.push({
				entry,
				score: 0.95,
				matchType: "prefix_code",
				matchedTerm: entry.code,
			});
			continue;
		}

		let score = 0;
		let matchType: Order804nSearchResult["matchType"] = "fuzzy";
		let matchedTerm: string | undefined;

		// Primary keywords regex evaluation
		for (const reg of entry.primaryKeywords) {
			if (reg.test(rawQuery)) {
				score += 0.55;
				matchType = "primary_keyword";
				matchedTerm = reg.source;
				break;
			}
		}

		// Secondary keywords regex evaluation
		for (const reg of entry.secondaryKeywords) {
			if (reg.test(rawQuery)) {
				score += 0.25;
				if (!matchedTerm) {
					matchType = "secondary_keyword";
					matchedTerm = reg.source;
				}
				break;
			}
		}

		// Stem matching against title
		if (queryStems.length > 0) {
			const titleStems = tokenizeAndStem(entry.title);
			let stemMatches = 0;
			for (const qs of queryStems) {
				if (titleStems.some((ts) => ts.includes(qs) || qs.includes(ts))) {
					stemMatches++;
				}
			}
			const stemScore = (stemMatches / queryStems.length) * 0.4;
			score += stemScore;
		}

		if (score >= threshold) {
			results.push({
				entry,
				score: Math.min(score, 0.99),
				matchType,
				matchedTerm,
			});
		}
	}

	results.sort((a, b) => b.score - a.score);
	return results.slice(0, maxResults);
}

/**
 * Computes breakdown summaries per service category across Order 804n registry.
 */
export function get804nCategorySummaries(): readonly Order804nCategorySummary[] {
	const catMap = new Map<ServiceCategory, { count: number; sum: number }>();
	for (const entry of ORDER_804N_STATUTORY_REGISTRY) {
		const curr = catMap.get(entry.category) || { count: 0, sum: 0 };
		curr.count++;
		curr.sum += entry.defaultPriceRub;
		catMap.set(entry.category, curr);
	}

	const summaries: Order804nCategorySummary[] = [];
	for (const [category, stats] of catMap.entries()) {
		summaries.push({
			category,
			count: stats.count,
			totalAveragePriceRub: Math.round(stats.sum / stats.count),
		});
	}
	return summaries.sort((a, b) => b.count - a.count);
}
