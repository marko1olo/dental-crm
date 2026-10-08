/**
 * embeddingPipeline.ts — Layer 1 Dense Vectorization, Morphology & Query Parser.
 * 
 * Implements:
 * 1. Russian dental stemmer and keyword normalization.
 * 2. FDI tooth case inflection parser (11–48 permanent, 51–85 primary).
 * 3. Deterministic 128-dimensional dense vector generator (L2 unit normalized).
 * 4. Clinical natural language query intent classifier and entity extractor.
 */

import { ALL_VALID_FDI_TEETH } from "../../../clinical/Icd10ClinicalValidator.js";
import { extractDiagnoses } from "../../tools/voiceDictationParser.js";
import {
	RUSSIAN_STOP_WORDS,
	RUSSIAN_TEETH_ONES,
	RUSSIAN_TEETH_ORDINALS_SINGLE,
	RUSSIAN_TEETH_TENS,
	VECTOR_DIMENSION,
} from "./constants.js";
import type {
	MemoryChunkCategory,
	ParsedClinicalQuery,
	QueryIntent,
} from "./types.js";

/**
 * Normalizes Russian dental words by stripping common grammatical endings
 * to allow fuzzy matching across clinical cases and inflections.
 */
export function stemRussianDentalWord(word: string): string {
	let normalized = word.toLowerCase().trim();
	if (normalized.length <= 3) return normalized;

	// Normalize 'ё' -> 'е'
	normalized = normalized.replaceAll("ё", "е");

	// Common dental roots fast-path
	if (normalized.startsWith("пульпит")) return "пульпит";
	if (normalized.startsWith("кариес")) return "кариес";
	if (normalized.startsWith("периодонтит")) return "периодонтит";
	if (normalized.startsWith("гингивит")) return "гингивит";
	if (normalized.startsWith("пародонтит")) return "пародонтит";
	if (normalized.startsWith("анестези")) return "анестези";
	if (normalized.startsWith("артикаин")) return "артикаин";
	if (normalized.startsWith("убистезин")) return "убистезин";
	if (normalized.startsWith("септанест")) return "септанест";
	if (normalized.startsWith("ультракаин")) return "ультракаин";
	if (normalized.startsWith("скандонест")) return "скандонест";
	if (normalized.startsWith("мепивакаин")) return "мепивакаин";
	if (normalized.startsWith("лидокаин")) return "лидокаин";
	if (normalized.startsWith("аллерги")) return "аллерги";
	if (normalized.startsWith("осложнен")) return "осложнен";
	if (normalized.startsWith("коффердам")) return "коффердам";
	if (normalized.startsWith("гуттаперч")) return "гуттаперч";
	if (normalized.startsWith("силер")) return "силер";
	if (normalized.startsWith("композит")) return "композит";
	if (normalized.startsWith("коронк")) return "коронк";
	if (normalized.startsWith("имплант")) return "имплант";
	if (normalized.startsWith("реставрац")) return "реставрац";
	if (normalized.startsWith("препариров")) return "препариров";
	if (normalized.startsWith("обтурац")) return "обтурац";
	if (normalized.startsWith("экстирпац")) return "экстирпац";
	if (normalized.startsWith("рентген")) return "рентген";
	if (normalized.startsWith("снимок")) return "снимок";
	if (normalized.startsWith("снимк")) return "снимок";
	if (normalized.startsWith("клкт")) return "клкт";
	if (normalized.startsWith("оптг")) return "оптг";
	if (normalized.startsWith("визиограф")) return "визиограф";
	if (normalized.startsWith("пломб")) return "пломб";
	if (normalized.startsWith("каналы")) return "канал";
	if (normalized.startsWith("канал")) return "канал";
	if (normalized.startsWith("материал")) return "материал";

	// Standard Russian grammatical inflection suffix stripping
	const endings = [
		"ейшими",
		"ейшего",
		"ейшему",
		"ейшим",
		"ейшая",
		"ейшей",
		"ейшую",
		"ейшее",
		"ившими",
		"ившего",
		"ившему",
		"ившим",
		"ившая",
		"ившей",
		"ившую",
		"ившее",
		"ывшими",
		"ывшего",
		"ывшему",
		"ывшим",
		"ывшая",
		"ывшей",
		"ывшую",
		"ывшее",
		"ующими",
		"ующего",
		"ующему",
		"ующим",
		"ующая",
		"ующей",
		"ующую",
		"ующее",
		"енными",
		"енного",
		"енному",
		"енным",
		"енная",
		"енней",
		"енную",
		"енное",
		"ами",
		"ями",
		"ого",
		"ему",
		"ому",
		"ыми",
		"ых",
		"их",
		"ую",
		"ей",
		"ой",
		"ем",
		"им",
		"ом",
		"ам",
		"ям",
		"ах",
		"ях",
		"ов",
		"ев",
		"ий",
		"ый",
		"ой",
		"ая",
		"яя",
		"ое",
		"ее",
		"ые",
		"ие",
		"ть",
		"ти",
		"ся",
		"сь",
		"ет",
		"ут",
		"ют",
		"ит",
		"ат",
		"ят",
		"ил",
		"ла",
		"ли",
		"ло",
		"ал",
		"ел",
		"а",
		"е",
		"и",
		"о",
		"у",
		"ы",
		"я",
	];

	for (const ending of endings) {
		if (normalized.endsWith(ending) && normalized.length - ending.length >= 3) {
			normalized = normalized.slice(0, -ending.length);
			break;
		}
	}

	return normalized;
}

/**
 * Tokenizes text into normalized stems and extracted keywords.
 */
export function extractNormalizedKeywords(text: string): string[] {
	if (!text || typeof text !== "string") return [];

	const rawTokens = text
		.toLowerCase()
		.replaceAll(/[^\p{L}\p{N}\s.-]/gu, " ")
		.split(/\s+/)
		.filter((t) => t.length >= 2);

	const stemmedSet = new Set<string>();

	for (const token of rawTokens) {
		if (RUSSIAN_STOP_WORDS.has(token)) continue;
		const stem = stemRussianDentalWord(token);
		if (stem.length >= 2 && !RUSSIAN_STOP_WORDS.has(stem)) {
			stemmedSet.add(stem);
		}
		// Also retain alphanumeric code tokens (e.g. K04.0, K02, A2, A3)
		if (/[0-9]/.test(token)) {
			stemmedSet.add(token);
		}
	}

	return Array.from(stemmedSet);
}

/**
 * Robust FDI tooth extractor supporting numeric notation (e.g. 11–48, 51–85, 3.6, 4.7)
 * and all Russian grammatical case inflections for spoken numbers ("тридцать шестым", "сорок седьмого").
 */
export function extractFdiTeethFromText(text: string): number[] {
	if (!text) return [];
	const found = new Set<number>();
	const lower = text.toLowerCase().replaceAll("ё", "е");

	// 1. Spoken two-word compound ordinals: e.g. "сорок седьмым", "тридцать шестого"
	const words = lower
		.replaceAll(/[^\p{L}\p{N}\s.-]/gu, " ")
		.split(/\s+/)
		.filter(Boolean);

	for (let i = 0; i < words.length; i++) {
		const w = words[i];
		if (!w) continue;

		// Single word ordinals (11-18)
		const singleOrdinal = RUSSIAN_TEETH_ORDINALS_SINGLE[w];
		if (singleOrdinal !== undefined) {
			found.add(singleOrdinal);
			continue;
		}

		// Two-word compound ordinals: tens + ones (e.g. "тридцать" + "шестой", "сорок" + "седьмым")
		const tensVal = RUSSIAN_TEETH_TENS[w];
		if (tensVal !== undefined && i + 1 < words.length) {
			const nextWord = words[i + 1];
			if (nextWord) {
				const onesVal = RUSSIAN_TEETH_ONES[nextWord];
				if (onesVal !== undefined) {
					const toothNum = tensVal + onesVal;
					if (ALL_VALID_FDI_TEETH.has(toothNum)) {
						found.add(toothNum);
						i++; // Skip next word
						continue;
					}
				}
			}
		}
	}

	// 2. Dotted quadrant.tooth format: 1.6, 3.6, 4.7
	const dotRegex = /\b([1-8])\.([1-8])\b/g;
	for (const match of lower.matchAll(dotRegex)) {
		const q = match[1];
		const t = match[2];
		if (q && t) {
			const num = Number.parseInt(`${q}${t}`, 10);
			if (ALL_VALID_FDI_TEETH.has(num)) {
				found.add(num);
			}
		}
	}

	// 3. Two-digit numbers preceded or followed by tooth indicators: "зуб 36", "36 зуб", "36-й", "36-го", "36"
	const directToothRegex =
		/(?:зуб[а-я]*\s*)?([1-8][1-8])(?:\s*зуб[а-я]*|\s*-\s*[а-я]+)?\b/gi;
	for (const match of lower.matchAll(directToothRegex)) {
		const rawDigits = match[1];
		if (rawDigits) {
			const num = Number.parseInt(rawDigits, 10);
			if (ALL_VALID_FDI_TEETH.has(num)) {
				found.add(num);
			}
		}
	}

	return Array.from(found).sort((a, b) => a - b);
}

/**
 * Deterministic hash-based 128-dimensional dense vector generator.
 * Produces unit-normalized dense vectors based on tokens and sorted bigram pairs,
 * ensuring zero external network dependency and sub-millisecond execution.
 */
export function computeDenseEmbeddingVector(
	text: string,
	dimension = VECTOR_DIMENSION,
): number[] {
	const vec = new Array<number>(dimension).fill(0);
	if (!text || text.trim().length === 0) return vec;

	const normalized = text.toLowerCase().trim();
	const tokens = extractNormalizedKeywords(normalized);

	// 1. Unigram & root feature hashing (Strong weight)
	for (const token of tokens) {
		let h = 0x811c9dc5;
		for (let i = 0; i < token.length; i++) {
			h ^= token.charCodeAt(i);
			h = Math.imul(h, 0x01000193);
		}
		const index = Math.abs(h) % dimension;
		vec[index] = (vec[index] ?? 0) + 4.0;
	}

	// 2. Token Bigram hashing (unordered pairs for robust phrase matching)
	for (let i = 0; i < tokens.length - 1; i++) {
		const tokenA = tokens[i];
		const tokenB = tokens[i + 1];
		if (tokenA && tokenB) {
			const pair = [tokenA, tokenB].sort().join("_");
			let h = 0x811c9dc5;
			for (let j = 0; j < pair.length; j++) {
				h ^= pair.charCodeAt(j);
				h = Math.imul(h, 0x01000193);
			}
			const index = Math.abs(h) % dimension;
			vec[index] = (vec[index] ?? 0) + 3.0;
		}
	}

	// 3. L2 Unit Normalization
	let normSq = 0;
	for (let i = 0; i < dimension; i++) {
		const val = vec[i] ?? 0;
		normSq += val * val;
	}

	if (normSq > 0) {
		const norm = Math.sqrt(normSq);
		for (let i = 0; i < dimension; i++) {
			vec[i] = (vec[i] ?? 0) / norm;
		}
	}

	return vec;
}

/**
 * Classifies doctor natural language queries into clinical intents and extracts entities.
 */
export function parseClinicalHistoryQuery(query: string): ParsedClinicalQuery {
	const lower = query.toLowerCase().trim();
	const extractedTeeth = extractFdiTeethFromText(query);
	const rawDiagnoses = extractDiagnoses(query);
	const extractedDiagnoses = rawDiagnoses.map((d) => d.code);
	const keywords = extractNormalizedKeywords(query);

	// Target year extraction (e.g. "в 2024 году", "2023", "2025")
	let targetYear: number | undefined;
	const yearMatch = /\b(20[12][0-9])\b/.exec(query);
	if (yearMatch && yearMatch[1]) {
		targetYear = Number.parseInt(yearMatch[1], 10);
	}

	let intent: QueryIntent = "general_clinical_query";
	let targetCategory: MemoryChunkCategory | undefined;

	if (
		lower.includes("аллерг") ||
		lower.includes("непереносимост") ||
		lower.includes("противопоказан") ||
		lower.includes("астм") ||
		lower.includes("отек квинке")
	) {
		intent = "allergy_check";
		targetCategory = "allergy_anamnesis";
	} else if (
		lower.includes("осложнен") ||
		lower.includes("анестези") ||
		lower.includes("давление") ||
		lower.includes("обморок") ||
		lower.includes("коллапс") ||
		lower.includes("парестези") ||
		lower.includes("альвеолит") ||
		lower.includes("перфорац") ||
		lower.includes("отлом")
	) {
		intent = "anesthesia_complications";
		targetCategory = "complication_event";
	} else if (
		lower.includes("снимок") ||
		lower.includes("снимк") ||
		lower.includes("рентген") ||
		lower.includes("клкт") ||
		lower.includes("оптг") ||
		lower.includes("кт") ||
		lower.includes("прицельн")
	) {
		intent = "imaging_search";
		targetCategory = "imaging_xray";
	} else if (
		lower.includes("материал") ||
		lower.includes("композит") ||
		lower.includes("пломб") ||
		lower.includes("filtek") ||
		lower.includes("estelite") ||
		lower.includes("гуттаперч") ||
		lower.includes("силер")
	) {
		intent = "materials_used";
		targetCategory = "treatment_item";
	} else if (
		extractedTeeth.length > 0 ||
		lower.includes("зуб") ||
		lower.includes("лечили") ||
		lower.includes("удаляли") ||
		lower.includes("депульпиров")
	) {
		intent = "tooth_treatment_history";
		targetCategory = "visit_diary_043u";
	}

	return {
		rawQuery: query,
		intent,
		extractedTeeth,
		extractedDiagnoses,
		extractedKeywords: keywords,
		targetYear,
		targetCategory,
	};
}
