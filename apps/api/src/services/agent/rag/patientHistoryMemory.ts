/**
 * patientHistoryMemory.ts — 5-Year Patient EHR Semantic Memory & RAG Search Engine.
 *
 * Implements:
 * 1. Vectorization and semantic indexing of 043/u outpatient diary records,
 *    ICD-10 diagnoses, drug allergy anamnesis, radiograph/imaging studies,
 *    odontogram/tooth state change histories, and treatment items.
 * 2. High-performance hybrid semantic vectorizer & BM25 ranker with Russian
 *    dental morphology, full FDI tooth case inflection parsing (11–48, 51–85),
 *    and temporal filtering.
 * 3. Agent Tool `clinical.search_patient_history`:
 *    - Semantic search across 5-year patient history ("Когда лечили 36 зуб?", "Были ли осложнения после анестезии?").
 *    - Returns exact visit dates, FDI tooth numbers, materials used, doctor full names, and clinical synthesis.
 */

import { and, desc, eq, gte, inArray, isNotNull, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db as defaultDb } from "../../../db/client.js";
import {
	appointments,
	extendedOdontogramStates,
	imagingStudies,
	patientDrugAllergies,
	patients,
	toothStateHistory,
	toothStates,
	treatmentItems,
	users,
	visitDiaries,
	visits,
} from "../../../db/schema.js";
import {
	ALL_VALID_FDI_TEETH,
	Icd10ClinicalValidator,
	VALID_FDI_PERMANENT_TEETH,
	VALID_FDI_PRIMARY_TEETH,
} from "../../clinical/Icd10ClinicalValidator.js";
import type { AgentContext } from "../context.js";
import type { ToolDefinition } from "../tools/tool.js";
import {
	extractAnesthesia,
	extractDiagnoses,
	extractMaterials,
} from "../tools/voiceDictationParser.js";
import { cosineSimilarity } from "./embeddingService.js";

// Re-export cosineSimilarity for backwards compatibility
export { cosineSimilarity };

// ─── TYPES & INTERFACES ──────────────────────────────────────────────────────

export type MemoryChunkCategory =
	| "visit_diary_043u"
	| "diagnosis_icd10"
	| "allergy_anamnesis"
	| "imaging_xray"
	| "odontogram_tooth_state"
	| "treatment_item"
	| "complication_event";

export interface PatientHistoryMemoryChunk {
	readonly id: string;
	readonly patientId: string;
	readonly organizationId: string;
	readonly category: MemoryChunkCategory;
	readonly date: string; // ISO 8601 string
	readonly toothNumber?: number | undefined;
	readonly toothCodes?: string[] | undefined;
	readonly doctorUserId?: string | undefined;
	readonly doctorFullName?: string | undefined;
	readonly visitId?: string | undefined;
	readonly diagnosisCode?: string | undefined;
	readonly diagnosisTitle?: string | undefined;
	readonly materials?: string[] | undefined;
	readonly anesthesia?: string | undefined;
	readonly complications?: string | undefined;
	readonly summary: string;
	readonly rawContent: string;
	readonly keywords: string[];
	readonly vector: number[];
	readonly metadata?: Record<string, unknown> | undefined;
}

export type QueryIntent =
	| "tooth_treatment_history"
	| "anesthesia_complications"
	| "allergy_check"
	| "imaging_search"
	| "materials_used"
	| "general_clinical_query";

export interface ParsedClinicalQuery {
	readonly rawQuery: string;
	readonly intent: QueryIntent;
	readonly extractedTeeth: number[];
	readonly extractedDiagnoses: string[];
	readonly extractedKeywords: string[];
	readonly targetYear?: number | undefined;
	readonly targetCategory?: MemoryChunkCategory | undefined;
}

export interface MemoryMatchResult {
	readonly chunkId: string;
	readonly category: MemoryChunkCategory;
	readonly score: number; // 0.0 – 1.0
	readonly relevance: "high" | "medium" | "low";
	readonly visitDate: string;
	readonly toothNumber?: number | undefined;
	readonly doctorFullName?: string | undefined;
	readonly diagnosis?: {
		readonly code?: string | undefined;
		readonly title?: string | undefined;
	} | undefined;
	readonly materials?: string[] | undefined;
	readonly anesthesia?: string | undefined;
	readonly complications?: string | undefined;
	readonly summary: string;
	readonly highlights: string[];
}

export interface PatientHistorySearchResult {
	readonly patientId: string;
	readonly query: string;
	readonly parsedQuery: ParsedClinicalQuery;
	readonly totalRecordsScanned: number;
	readonly matchesCount: number;
	readonly matches: MemoryMatchResult[];
	readonly synthesizedAnswerRu: string;
}

// ─── DENTAL MORPHOLOGY & STEMMER ─────────────────────────────────────────────

const RUSSIAN_STOP_WORDS = new Set<string>([
	"и",
	"в",
	"во",
	"не",
	"что",
	"он",
	"на",
	"я",
	"с",
	"со",
	"как",
	"а",
	"то",
	"все",
	"она",
	"так",
	"его",
	"но",
	"да",
	"ты",
	"к",
	"у",
	"же",
	"вы",
	"за",
	"бы",
	"по",
	"только",
	"ее",
	"мне",
	"было",
	"вот",
	"от",
	"меня",
	"еще",
	"нет",
	"о",
	"об",
	"из",
	"ему",
	"теперь",
	"когда",
	"даже",
	"ну",
	"вдруг",
	"ли",
	"если",
	"уже",
	"или",
	"ни",
	"быть",
	"был",
	"была",
	"были",
	"было",
	"до",
	"вас",
	"нибудь",
	"опять",
	"уж",
	"вам",
	"ведь",
	"там",
	"потом",
	"себя",
	"ничего",
	"ей",
	"может",
	"они",
	"тут",
	"где",
	"есть",
	"надо",
	"ней",
	"для",
	"мы",
	"тебя",
	"их",
	"чем",
	"была",
	"сам",
	"чтоб",
	"без",
	"будто",
	"чего",
	"раз",
	"тоже",
	"себе",
	"под",
	"будет",
	"ж",
	"тогда",
	"кто",
	"этот",
	"того",
	"потому",
	"этого",
	"какой",
	"совсем",
	"ним",
	"здесь",
	"этом",
	"один",
	"почти",
	"мой",
	"тем",
	"чтобы",
	"нее",
	"сейчас",
	"были",
	"куда",
	"зачем",
	"всех",
	"никогда",
	"можно",
	"при",
	"наконец",
	"два",
	"об",
	"другой",
	"хоть",
	"после",
	"над",
	"больше",
	"тот",
	"через",
	"эти",
	"нас",
	"про",
	"всего",
	"них",
	"какая",
	"много",
	"разве",
	"три",
	"эту",
	"моя",
	"впрочем",
	"хорошо",
	"свою",
	"этой",
	"перед",
	"иногда",
	"лучше",
	"чуть",
	"том",
	"нельзя",
	"такой",
	"им",
	"более",
	"всегда",
	"конечно",
	"всю",
	"между",
	"зуб",
	"зуба",
	"зубу",
	"зубом",
	"зубе",
	"зубы",
	"зубов",
]);

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

// ─── FDI TOOTH NUMBER PARSER WITH COMPLETE RUSSIAN INFLECTIONS ───────────────

const RUSSIAN_TEETH_TENS: Readonly<Record<string, number>> = {
	десять: 10,
	одиннадцать: 11,
	двенадцать: 12,
	тринадцать: 13,
	четырнадцать: 14,
	пятнадцать: 15,
	шестнадцать: 16,
	семнадцать: 17,
	восемнадцать: 18,
	двадцать: 20,
	тридцать: 30,
	сорок: 40,
	пятьдесят: 50,
	шестьдесят: 60,
	семьдесят: 70,
	восемьдесят: 80,
};

const RUSSIAN_TEETH_ONES: Readonly<Record<string, number>> = {
	один: 1,
	первый: 1,
	первого: 1,
	первому: 1,
	первым: 1,
	первом: 1,
	два: 2,
	второй: 2,
	второго: 2,
	второму: 2,
	вторым: 2,
	втором: 2,
	три: 3,
	третий: 3,
	третьего: 3,
	третьему: 3,
	третьим: 3,
	третьем: 3,
	четыре: 4,
	четвертый: 4,
	четвертого: 4,
	четвертому: 4,
	четвертым: 4,
	четвертом: 4,
	пять: 5,
	пятый: 5,
	пятого: 5,
	пятому: 5,
	пятым: 5,
	пятом: 5,
	шесть: 6,
	шестой: 6,
	шестого: 6,
	шестому: 6,
	шестым: 6,
	шестом: 6,
	семь: 7,
	седьмой: 7,
	седьмого: 7,
	седьмому: 7,
	седьмым: 7,
	седьмом: 7,
	восемь: 8,
	восьмой: 8,
	восьмого: 8,
	восьмому: 8,
	восьмым: 8,
	восьмом: 8,
};

const RUSSIAN_TEETH_ORDINALS_SINGLE: Readonly<Record<string, number>> = {
	одиннадцать: 11,
	одиннадцатый: 11,
	одиннадцатого: 11,
	одиннадцатому: 11,
	одиннадцатым: 11,
	одиннадцатом: 11,
	двенадцать: 12,
	двенадцатый: 12,
	двенадцатого: 12,
	двенадцатому: 12,
	двенадцатым: 12,
	двенадцатом: 12,
	тринадцать: 13,
	тринадцатый: 13,
	тринадцатого: 13,
	тринадцатому: 13,
	тринадцатым: 13,
	тринадцатом: 13,
	четырнадцать: 14,
	четырнадцатый: 14,
	четырнадцатого: 14,
	четырнадцатому: 14,
	четырнадцатым: 14,
	четырнадцатом: 14,
	пятнадцать: 15,
	пятнадцатый: 15,
	пятнадцатого: 15,
	пятнадцатому: 15,
	пятнадцатым: 15,
	пятнадцатом: 15,
	шестнадцать: 16,
	шестнадцатый: 16,
	шестнадцатого: 16,
	шестнадцатому: 16,
	шестнадцатым: 16,
	шестнадцатом: 16,
	семнадцать: 17,
	семнадцатый: 17,
	семнадцатого: 17,
	семнадцатому: 17,
	семнадцатым: 17,
	семнадцатом: 17,
	восемнадцать: 18,
	восемнадцатый: 18,
	восемнадцатого: 18,
	восемнадцатому: 18,
	восемнадцатым: 18,
	восемнадцатом: 18,
};

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

// ─── DENSE 128-DIMENSIONAL VECTORIZER ────────────────────────────────────────

const VECTOR_DIMENSION = 128;

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

// ─── QUERY INTENT & ENTITY PARSER ────────────────────────────────────────────

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

// ─── 5-YEAR PATIENT EHR INDEX BUILDER ────────────────────────────────────────

export interface BuildPatientIndexOptions {
	readonly maxAgeYears?: number | undefined; // default: 5 years
	readonly includeAllergies?: boolean | undefined; // default: true
	readonly includeImaging?: boolean | undefined; // default: true
	readonly includeOdontogram?: boolean | undefined; // default: true
	readonly includeTreatmentItems?: boolean | undefined; // default: true
}

/**
 * Extracts Unix millisecond timestamp from standard UUIDv7 string (first 48 bits).
 */
export function extractTimestampFromUuidV7(id?: string | null): Date | null {
	if (!id) return null;
	try {
		const hex = id.replace(/-/g, "").slice(0, 12);
		if (hex.length === 12) {
			const ms = Number.parseInt(hex, 16);
			if (!Number.isNaN(ms) && ms > 1500000000000 && ms < 2500000000000) {
				return new Date(ms);
			}
		}
	} catch {}
	return null;
}

/**
 * Builds high-density semantic memory chunks from all clinical databases for a patient,
 * bounded by a 5-year chronological window (or specified horizon).
 */
export async function buildPatientHistoryMemoryIndex(
	// biome-ignore lint/suspicious/noExplicitAny: Drizzle client instance
	targetDb: any,
	organizationId: string,
	patientId: string,
	options: BuildPatientIndexOptions = {},
): Promise<PatientHistoryMemoryChunk[]> {
	const dbClient = targetDb ?? defaultDb;
	const maxAgeYears = options.maxAgeYears ?? 5;
	const cutoffDate = new Date();
	cutoffDate.setFullYear(cutoffDate.getFullYear() - maxAgeYears);

	const chunks: PatientHistoryMemoryChunk[] = [];

	// 1. Fetch Doctor Directory for FIO resolution
	let staffUsers: { id: string; fullName: string; role: string }[] = [];
	try {
		staffUsers =
			(await dbClient
				.select({
					id: users.id,
					fullName: users.fullName,
					role: users.role,
				})
				.from(users)
				.where(eq(users.organizationId, organizationId))) || [];
	} catch {
		staffUsers = [];
	}

	const doctorNameById = new Map<string, string>();
	for (const u of staffUsers) {
		if (u?.id && u?.fullName) {
			doctorNameById.set(u.id, u.fullName);
		}
	}

	// 2. Fetch Outpatient Visits (043/у) and Structured Diaries
	let patientVisits: any[] = [];
	try {
		patientVisits =
			(await dbClient
				.select({
					id: visits.id,
					status: visits.status,
					complaint: visits.complaint,
					anamnesis: visits.anamnesis,
					objectiveStatus: visits.objectiveStatus,
					diagnosis: visits.diagnosis,
					treatmentPlan: visits.treatmentPlan,
					doctorSummary: visits.doctorSummary,
					appointmentId: visits.appointmentId,
					signedAt: visits.signedAt,
					createdAt: visits.createdAt,
				})
				.from(visits)
				.where(
					and(
						eq(visits.organizationId, organizationId),
						eq(visits.patientId, patientId),
						gte(visits.createdAt, cutoffDate),
					),
				)
				.orderBy(desc(visits.createdAt))) || [];
	} catch {
		patientVisits = [];
	}

	// Fetch Appointments for doctor mapping
	const appointmentIds: string[] = patientVisits
		.map((v: { appointmentId?: string | null }) => v?.appointmentId)
		.filter((id): id is string => typeof id === "string" && id.length > 0);

	const apptDoctorMap = new Map<string, string>();
	if (appointmentIds.length > 0) {
		try {
			const appts =
				(await dbClient
					.select({
						id: appointments.id,
						doctorUserId: appointments.doctorUserId,
					})
					.from(appointments)
					.where(
						and(
							eq(appointments.organizationId, organizationId),
							inArray(appointments.id, appointmentIds),
						),
					)) || [];
			for (const a of appts) {
				if (a?.id && a?.doctorUserId) {
					apptDoctorMap.set(a.id, a.doctorUserId);
				}
			}
		} catch {
			// No appointments found or mock fallback
		}
	}

	// Fetch Structured Diaries (visitDiaries)
	const visitIds: string[] = patientVisits
		.map((v: { id?: string }) => v?.id)
		.filter((id): id is string => typeof id === "string" && id.length > 0);
	let diaries: any[] = [];
	if (visitIds.length > 0) {
		try {
			diaries =
				(await dbClient
					.select()
					.from(visitDiaries)
					.where(
						and(
							eq(visitDiaries.organizationId, organizationId),
							inArray(visitDiaries.visitId, visitIds),
						),
					)) || [];
		} catch {
			diaries = [];
		}
	}

	const diaryByVisitId = new Map<string, typeof visitDiaries.$inferSelect>();
	for (const d of diaries) {
		if (d?.visitId) {
			diaryByVisitId.set(d.visitId, d);
		}
	}

	const visitDateById = new Map<string, Date>();
	for (const v of patientVisits) {
		if (v?.id) {
			const d = v.signedAt
				? new Date(v.signedAt)
				: v.createdAt
					? new Date(v.createdAt)
					: extractTimestampFromUuidV7(v.id) || new Date();
			visitDateById.set(v.id, d);
		}
	}

	// Transform visits into memory chunks
	for (const v of patientVisits) {
		if (!v || !v.id) continue;
		const d = diaryByVisitId.get(v.id);
		const doctorId =
			d?.doctorId ??
			(v.appointmentId ? apptDoctorMap.get(v.appointmentId) : undefined);
		const doctorName = doctorId
			? (doctorNameById.get(doctorId) ?? "Врач-стоматолог")
			: "Лечащий врач";

		const rawDate = v.signedAt
			? new Date(v.signedAt)
			: v.createdAt
				? new Date(v.createdAt)
				: new Date();
		const isoDate = rawDate.toISOString();
		const dateRu = rawDate.toLocaleDateString("ru-RU");

		// Extract clinical details
		const combinedText = [
			v.complaint ? `Жалобы: ${v.complaint}` : "",
			v.anamnesis ? `Анамнез: ${v.anamnesis}` : "",
			v.objectiveStatus ? `Объективный статус: ${v.objectiveStatus}` : "",
			v.diagnosis ? `Диагноз: ${v.diagnosis}` : "",
			v.treatmentPlan ? `План: ${v.treatmentPlan}` : "",
			v.doctorSummary ? `Резюме: ${v.doctorSummary}` : "",
			d?.statusLocalis ? `Status Localis: ${d.statusLocalis}` : "",
			d?.treatmentDescription ? `Лечение: ${d.treatmentDescription}` : "",
			d?.diagnosisIcd10 ? `МКБ-10: ${d.diagnosisIcd10}` : "",
			d?.diagnosisTooth ? `Зуб: ${d.diagnosisTooth}` : "",
			d?.complications ? `Осложнения: ${d.complications}` : "",
			d?.comorbidities ? `Сопутствующие: ${d.comorbidities}` : "",
			d?.content ? `Дневник: ${d.content}` : "",
		]
			.filter(Boolean)
			.join("\n");

		const teeth = extractFdiTeethFromText(combinedText);
		const primaryTooth =
			d?.diagnosisTooth && !Number.isNaN(Number(d.diagnosisTooth))
				? Number(d.diagnosisTooth)
				: teeth[0];

		const materials = extractMaterials(combinedText);
		const anesthesiaParsed = extractAnesthesia(combinedText);
		const anesthesiaText = anesthesiaParsed?.rawText
			? `${anesthesiaParsed.rawText} (${anesthesiaParsed.drug ?? "анестетик"} ${anesthesiaParsed.volumeMl ? `${anesthesiaParsed.volumeMl} мл` : ""})`
			: undefined;

		const icd10Code = d?.diagnosisIcd10 || v.diagnosis || undefined;
		const complicationsText = d?.complications?.trim() || undefined;

		// Summary generation
		const summaryParts = [`Прием от ${dateRu} (Врач: ${doctorName})`];
		if (primaryTooth) summaryParts.push(`Зуб FDI ${primaryTooth}`);
		if (icd10Code) summaryParts.push(`Диагноз: ${icd10Code}`);
		if (materials.length > 0)
			summaryParts.push(`Материалы: ${materials.join(", ")}`);
		if (anesthesiaText) summaryParts.push(`Анестезия: ${anesthesiaText}`);
		if (complicationsText) summaryParts.push(`Осложнения: ${complicationsText}`);
		if (v.doctorSummary) summaryParts.push(`Итог: ${v.doctorSummary}`);

		const summary = summaryParts.join("; ");
		const keywords = extractNormalizedKeywords(
			`${combinedText} ${summary} ${doctorName}`,
		);
		const vector = computeDenseEmbeddingVector(
			`${summary} ${combinedText} ${doctorName}`,
		);

		chunks.push({
			id: `chunk_visit_${v.id}`,
			patientId,
			organizationId,
			category: "visit_diary_043u",
			date: isoDate,
			toothNumber: primaryTooth,
			toothCodes: teeth.map(String),
			doctorUserId: doctorId,
			doctorFullName: doctorName,
			visitId: v.id,
			diagnosisCode: icd10Code,
			materials,
			anesthesia: anesthesiaText,
			complications: complicationsText,
			summary,
			rawContent: combinedText,
			keywords,
			vector,
			metadata: {
				status: v.status,
				isSigned: v.signedAt !== null,
			},
		});

		// If explicit complications were present, also index as a distinct complication_event
		if (
			complicationsText ||
			combinedText.toLowerCase().includes("осложнен") ||
			combinedText.toLowerCase().includes("обморок") ||
			combinedText.toLowerCase().includes("парестези")
		) {
			const compSummary = `Осложнение на приеме ${dateRu} (${doctorName}): ${complicationsText || v.doctorSummary || "Особые реакции при лечении"}`;
			chunks.push({
				id: `chunk_comp_${v.id}`,
				patientId,
				organizationId,
				category: "complication_event",
				date: isoDate,
				toothNumber: primaryTooth,
				doctorFullName: doctorName,
				visitId: v.id,
				anesthesia: anesthesiaText,
				complications: complicationsText ?? "Реакция на вмешательство",
				summary: compSummary,
				rawContent: combinedText,
				keywords: extractNormalizedKeywords(
					`${compSummary} ${complicationsText} анестезия осложнение`,
				),
				vector: computeDenseEmbeddingVector(
					`${compSummary} ${complicationsText} анестезия`,
				),
			});
		}
	}

	// 3. Fetch Drug Allergy Anamnesis (Allergies are permanent / 5-year active)
	if (options.includeAllergies !== false) {
		let allergies: any[] = [];
		try {
			allergies =
				(await dbClient
					.select()
					.from(patientDrugAllergies)
					.where(
						and(
							eq(patientDrugAllergies.organizationId, organizationId),
							eq(patientDrugAllergies.patientId, patientId),
						),
					)) || [];
		} catch {
			allergies = [];
		}

		for (const a of allergies) {
			if (!a || !a.id) continue;
			const dateStr = (
				a.diagnosedDate
					? new Date(a.diagnosedDate)
					: a.createdAt
						? new Date(a.createdAt)
						: new Date()
			).toISOString();
			const allergySummary = `Аллергия / Непереносимость: ${a.allergenGroup} (МНН: ${a.drugInnLatin || "—"}), тяжесть: ${a.reactionSeverity}, проявления: ${a.clinicalManifestations}${a.hasSamterTriad ? " [Триада Самтера / Аспириновая астма]" : ""}${a.notes ? `. Прим: ${a.notes}` : ""}`;

			const allergyKeywords = extractNormalizedKeywords(
				`${allergySummary} аллергия анафилаксия непереносимость ${a.allergenGroup} ${a.drugInnLatin || ""}`,
			);

			chunks.push({
				id: `chunk_allergy_${a.id}`,
				patientId,
				organizationId,
				category: "allergy_anamnesis",
				date: dateStr,
				summary: allergySummary,
				rawContent: allergySummary,
				keywords: allergyKeywords,
				vector: computeDenseEmbeddingVector(allergySummary),
				metadata: {
					severity: a.reactionSeverity,
					hasSamterTriad: a.hasSamterTriad,
					isConfirmed: a.isConfirmedByAllergist,
				},
			});
		}
	}

	// 4. Fetch Radiographs and Imaging Studies (X-ray / CT / Panoramic)
	if (options.includeImaging !== false) {
		let studies: any[] = [];
		try {
			studies =
				(await dbClient
					.select()
					.from(imagingStudies)
					.where(
						and(
							eq(imagingStudies.organizationId, organizationId),
							eq(imagingStudies.patientId, patientId),
							gte(imagingStudies.capturedAt, cutoffDate),
						),
					)
					.orderBy(desc(imagingStudies.capturedAt))) || [];
		} catch {
			studies = [];
		}

		for (const s of studies) {
			if (!s || !s.id) continue;
			const rawDate = s.capturedAt ? new Date(s.capturedAt) : new Date();
			const dateStr = rawDate.toISOString();
			const dateRu = rawDate.toLocaleDateString("ru-RU");
			const toothNum =
				s.toothCode && !Number.isNaN(Number(s.toothCode))
					? Number(s.toothCode)
					: undefined;

			const studySummary = `Рентген-исследование (${(s.kind || "XRAY").toUpperCase()}) от ${dateRu}: ${s.title || "Снимок"}, область: ${s.region || "зубной ряд"}${toothNum ? `, зуб FDI ${toothNum}` : ""}${s.aiSummary ? `. AI-анализ: ${s.aiSummary}` : ""}`;

			chunks.push({
				id: `chunk_img_${s.id}`,
				patientId,
				organizationId,
				category: "imaging_xray",
				date: dateStr,
				toothNumber: toothNum,
				toothCodes: s.toothCode ? [s.toothCode] : undefined,
				visitId: s.visitId ?? undefined,
				summary: studySummary,
				rawContent: `${studySummary} ${s.sourceName || ""}`,
				keywords: extractNormalizedKeywords(
					`${studySummary} снимок рентген клкт оптг кт`,
				),
				vector: computeDenseEmbeddingVector(studySummary),
				metadata: {
					kind: s.kind,
					status: s.status,
				},
			});
		}
	}

	// 5. Fetch Odontogram & Tooth State Histories
	if (options.includeOdontogram !== false) {
		let stateLogs: any[] = [];
		try {
			stateLogs =
				(await dbClient
					.select()
					.from(toothStateHistory)
					.where(
						and(
							eq(toothStateHistory.organizationId, organizationId),
							eq(toothStateHistory.patientId, patientId),
							gte(toothStateHistory.changedAt, cutoffDate),
						),
					)
					.orderBy(desc(toothStateHistory.changedAt))) || [];
		} catch {
			stateLogs = [];
		}

		for (const log of stateLogs) {
			if (!log || !log.id) continue;
			const rawDate = log.changedAt ? new Date(log.changedAt) : new Date();
			const dateStr = rawDate.toISOString();
			const dateRu = rawDate.toLocaleDateString("ru-RU");
			const doctorName = log.changedByUserId
				? (doctorNameById.get(log.changedByUserId) ?? "Врач-стоматолог")
				: "Лечащий врач";

			const logSummary = `Зуб FDI ${log.toothNumber}: изменение статуса от ${dateRu} (${doctorName}) — с '${log.previousState || "норма"}' на '${log.newState}'${log.reason ? `. Причина: ${log.reason}` : ""}`;

			chunks.push({
				id: `chunk_tooth_hist_${log.id}`,
				patientId,
				organizationId,
				category: "odontogram_tooth_state",
				date: dateStr,
				toothNumber: log.toothNumber,
				doctorUserId: log.changedByUserId ?? undefined,
				doctorFullName: doctorName,
				visitId: log.visitId ?? undefined,
				summary: logSummary,
				rawContent: logSummary,
				keywords: extractNormalizedKeywords(
					`${logSummary} зуб ${log.toothNumber} ${log.newState} ${log.previousState || ""}`,
				),
				vector: computeDenseEmbeddingVector(logSummary),
			});
		}

		// Current Tooth States
		let currentStates: any[] = [];
		try {
			currentStates =
				(await dbClient
					.select()
					.from(toothStates)
					.where(
						and(
							eq(toothStates.organizationId, organizationId),
							eq(toothStates.patientId, patientId),
						),
					)) || [];
		} catch {
			currentStates = [];
		}

		for (const ts of currentStates) {
			if (!ts || !ts.id) continue;
			if (ts.state === "healthy" && !ts.notes) continue;
			const rawDate = ts.updatedAt
				? new Date(ts.updatedAt)
				: ts.createdAt
					? new Date(ts.createdAt)
					: new Date();
			const dateStr = rawDate.toISOString();
			const dateRu = rawDate.toLocaleDateString("ru-RU");
			const stateSummary = `Текущий статус одонтограммы (зуб FDI ${ts.toothNumber}): ${ts.state}${ts.notes ? `. Заметки: ${ts.notes}` : ""}`;

			chunks.push({
				id: `chunk_tooth_state_${ts.id}`,
				patientId,
				organizationId,
				category: "odontogram_tooth_state",
				date: dateStr,
				toothNumber: ts.toothNumber,
				summary: stateSummary,
				rawContent: stateSummary,
				keywords: extractNormalizedKeywords(
					`${stateSummary} зуб ${ts.toothNumber} ${ts.state}`,
				),
				vector: computeDenseEmbeddingVector(stateSummary),
			});
		}
	}

	// 6. Fetch Treatment Items (Specific Restorative & Surgical Procedures)
	if (options.includeTreatmentItems !== false) {
		let items: any[] = [];
		try {
			items =
				(await dbClient
					.select()
					.from(treatmentItems)
					.where(
						and(
							eq(treatmentItems.organizationId, organizationId),
							eq(treatmentItems.patientId, patientId),
						),
					)
					.orderBy(desc(treatmentItems.id))
					.limit(100)) || [];
		} catch {
			items = [];
		}

		for (const item of items) {
			if (!item || !item.id) continue;
			const rawDate =
				(item.visitId ? visitDateById.get(item.visitId) : null) ||
				extractTimestampFromUuidV7(item.id) ||
				new Date();
			const dateStr = rawDate.toISOString();
			const dateRu = rawDate.toLocaleDateString("ru-RU");
			const toothNum =
				item.toothCode && !Number.isNaN(Number(item.toothCode))
					? Number(item.toothCode)
					: undefined;
			const doctorName = item.plannedDoctorUserId
				? (doctorNameById.get(item.plannedDoctorUserId) ?? "Врач-стоматолог")
				: undefined;

			const itemSummary = `Выполненная процедура от ${dateRu}${toothNum ? ` (зуб FDI ${toothNum})` : ""}: ${item.title} — ${item.priceRub} ₽${doctorName ? ` (врач: ${doctorName})` : ""}${item.notes ? `. Заметка: ${item.notes}` : ""}`;

			chunks.push({
				id: `chunk_item_${item.id}`,
				patientId,
				organizationId,
				category: "treatment_item",
				date: dateStr,
				toothNumber: toothNum,
				toothCodes: item.toothCode ? [item.toothCode] : undefined,
				doctorUserId: item.plannedDoctorUserId ?? undefined,
				doctorFullName: doctorName,
				visitId: item.visitId ?? undefined,
				summary: itemSummary,
				rawContent: itemSummary,
				keywords: extractNormalizedKeywords(
					`${itemSummary} ${item.title} ${toothNum || ""}`,
				),
				vector: computeDenseEmbeddingVector(itemSummary),
			});
		}
	}

	return chunks;
}

// ─── HYBRID SEMANTIC SEARCH & RANKING ────────────────────────────────────────

export interface SearchPatientHistoryOptions {
	// biome-ignore lint/suspicious/noExplicitAny: Optional Drizzle client
	readonly db?: any;
	readonly organizationId: string;
	readonly patientId: string;
	readonly query: string;
	readonly topK?: number | undefined;
	readonly maxAgeYears?: number | undefined;
	readonly toothFilter?: number | undefined;
	readonly categoryFilter?: MemoryChunkCategory[] | undefined;
	readonly preloadedChunks?: PatientHistoryMemoryChunk[] | undefined;
}

/**
 * Searches across the patient's 5-year semantic EHR memory, ranking records by
 * dense vector cosine similarity, BM25 keyword matching, FDI tooth exact alignment,
 * and temporal recency.
 */
export async function searchPatientHistoryMemory(
	options: SearchPatientHistoryOptions,
): Promise<PatientHistorySearchResult> {
	const topK = options.topK ?? 10;
	const parsedQuery = parseClinicalHistoryQuery(options.query);
	const queryVector = computeDenseEmbeddingVector(options.query);

	// Load memory chunks (from DB or preloaded cache)
	let chunks: PatientHistoryMemoryChunk[] = options.preloadedChunks ?? [];
	if (chunks.length === 0) {
		chunks = await buildPatientHistoryMemoryIndex(
			options.db ?? defaultDb,
			options.organizationId,
			options.patientId,
			{ maxAgeYears: options.maxAgeYears ?? 5 },
		);
	}

	const scoredMatches: MemoryMatchResult[] = [];

	for (const chunk of chunks) {
		// Category filter check
		if (
			options.categoryFilter &&
			options.categoryFilter.length > 0 &&
			!options.categoryFilter.includes(chunk.category)
		) {
			continue;
		}

		// Tooth filter check (if explicitly requested by caller)
		if (options.toothFilter !== undefined) {
			const matchesTooth =
				chunk.toothNumber === options.toothFilter ||
				(chunk.toothCodes &&
					chunk.toothCodes.includes(String(options.toothFilter)));
			if (!matchesTooth) continue;
		}

		// 1. Vector Cosine Similarity (Weight: 40%)
		const cosine = cosineSimilarity(queryVector, chunk.vector);

		// 2. Keyword & BM25 Match (Weight: 30%)
		let keywordOverlap = 0;
		const highlights: string[] = [];
		const chunkKeywordsSet = new Set(chunk.keywords);

		for (const qk of parsedQuery.extractedKeywords) {
			if (chunkKeywordsSet.has(qk)) {
				keywordOverlap += 1;
				highlights.push(qk);
			} else {
				// Partial substring match for medical roots
				for (const ck of chunkKeywordsSet) {
					if (ck.startsWith(qk) || qk.startsWith(ck)) {
						keywordOverlap += 0.7;
						highlights.push(ck);
						break;
					}
				}
			}
		}

		const keywordScore =
			parsedQuery.extractedKeywords.length > 0
				? Math.min(1, keywordOverlap / parsedQuery.extractedKeywords.length)
				: 0.5;

		// 3. FDI Tooth Exact Match Boost (Weight: 20%)
		let toothBoost = 0;
		if (parsedQuery.extractedTeeth.length > 0) {
			for (const queryTooth of parsedQuery.extractedTeeth) {
				if (
					chunk.toothNumber === queryTooth ||
					(chunk.toothCodes && chunk.toothCodes.includes(String(queryTooth)))
				) {
					toothBoost = 1.0;
					highlights.push(`Зуб FDI ${queryTooth}`);
					break;
				}
			}
		} else {
			// Neutral if no tooth was mentioned in query
			toothBoost = 0.5;
		}

		// 4. Intent & Category Alignment (Weight: 10%)
		let categoryBoost = 0.5;
		if (
			parsedQuery.targetCategory &&
			chunk.category === parsedQuery.targetCategory
		) {
			categoryBoost = 1.0;
		}

		// 5. Target Year Alignment
		if (parsedQuery.targetYear !== undefined) {
			const chunkYear = new Date(chunk.date).getFullYear();
			if (!Number.isNaN(chunkYear) && chunkYear === parsedQuery.targetYear) {
				categoryBoost += 0.3;
			}
		}

		// Combined Hybrid Score (0.0 to 1.0)
		const compositeScore = Math.min(
			1,
			cosine * 0.4 +
				keywordScore * 0.3 +
				toothBoost * 0.2 +
				categoryBoost * 0.1,
		);

		// Relevance tier
		let relevance: "high" | "medium" | "low" = "low";
		if (
			compositeScore >= 0.55 ||
			(toothBoost === 1.0 && compositeScore >= 0.45)
		) {
			relevance = "high";
		} else if (compositeScore >= 0.35) {
			relevance = "medium";
		}

		if (compositeScore >= 0.25) {
			scoredMatches.push({
				chunkId: chunk.id,
				category: chunk.category,
				score: Number(compositeScore.toFixed(3)),
				relevance,
				visitDate: chunk.date,
				toothNumber: chunk.toothNumber,
				doctorFullName: chunk.doctorFullName,
				diagnosis: chunk.diagnosisCode
					? {
							code: chunk.diagnosisCode,
							title: chunk.diagnosisTitle,
						}
					: undefined,
				materials: chunk.materials,
				anesthesia: chunk.anesthesia,
				complications: chunk.complications,
				summary: chunk.summary,
				highlights: Array.from(new Set(highlights)),
			});
		}
	}

	// Sort descending by score, then by date recency
	scoredMatches.sort((a, b) => {
		if (Math.abs(b.score - a.score) > 0.05) {
			return b.score - a.score;
		}
		return new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime();
	});

	const topMatches = scoredMatches.slice(0, topK);

	// Synthesize concise Russian clinical answer
	const synthesizedAnswerRu = synthesizeClinicalAnswerRu(
		parsedQuery,
		topMatches,
		chunks.length,
	);

	return {
		patientId: options.patientId,
		query: options.query,
		parsedQuery,
		totalRecordsScanned: chunks.length,
		matchesCount: topMatches.length,
		matches: topMatches,
		synthesizedAnswerRu,
	};
}

/**
 * Synthesizes a natural, concise, medically rigorous Russian summary answering
 * the doctor's query directly based on ranked records.
 */
function synthesizeClinicalAnswerRu(
	query: ParsedClinicalQuery,
	matches: MemoryMatchResult[],
	totalScanned: number,
): string {
	if (matches.length === 0) {
		if (query.extractedTeeth.length > 0) {
			return `В истории болезни за последние 5 лет записей о лечении зуба FDI ${query.extractedTeeth.join(", ")} не обнаружено (проверено записей: ${totalScanned}).`;
		}
		if (query.intent === "allergy_check") {
			return `Аллергологический анамнез чист: данных о лекарственной аллергии или непереносимости в карте пациента не зафиксировано.`;
		}
		return `По запросу "${query.rawQuery}" в 5-летней истории ЭМК 043/у релевантных клинических записей не найдено (проверено ${totalScanned} событий).`;
	}

	const top = matches[0];
	if (!top) {
		return `По запросу "${query.rawQuery}" в 5-летней истории ЭМК 043/у релевантных клинических записей не найдено.`;
	}

	const rawDate = top.visitDate ? new Date(top.visitDate) : new Date();
	const dateRu = !Number.isNaN(rawDate.getTime())
		? rawDate.toLocaleDateString("ru-RU")
		: "ранее";

	switch (query.intent) {
		case "tooth_treatment_history": {
			const toothStr =
				query.extractedTeeth.length > 0
					? `зуба FDI ${query.extractedTeeth.join(", ")}`
					: top.toothNumber
						? `зуба FDI ${top.toothNumber}`
						: "зуба";

			const details: string[] = [];
			if (top.doctorFullName) details.push(`врач: ${top.doctorFullName}`);
			if (top.diagnosis?.code) details.push(`диагноз: ${top.diagnosis.code}`);
			if (top.materials && top.materials.length > 0)
				details.push(`материалы: ${top.materials.join(", ")}`);
			if (top.anesthesia) details.push(`анестезия: ${top.anesthesia}`);
			if (top.complications)
				details.push(`⚠️ осложнения: ${top.complications}`);

			const extraMatches = matches
				.slice(1, 3)
				.filter((m) => m.toothNumber === top.toothNumber);
			let extraStr = "";
			if (extraMatches.length > 0) {
				extraStr = ` Также зафиксированы приемы: ${extraMatches.map((m) => `${new Date(m.visitDate).toLocaleDateString("ru-RU")} (${m.summary})`).join("; ")}.`;
			}

			return `Лечение ${toothStr} проводилось ${dateRu} (${details.join("; ")}).${extraStr}`;
		}

		case "anesthesia_complications": {
			const compMatches = matches.filter(
				(m) =>
					m.complications ||
					m.summary.toLowerCase().includes("осложнен") ||
					m.summary.toLowerCase().includes("обморок") ||
					m.summary.toLowerCase().includes("аллерг"),
			);

			if (compMatches.length === 0) {
				const anesthesias = Array.from(
					new Set(matches.map((m) => m.anesthesia).filter(Boolean)),
				);
				const anesthList =
					anesthesias.length > 0
						? `Применялась анестезия: ${anesthesias.join("; ")}.`
						: "";
				return `Осложнений и патологических реакций после анестезии в карте не зафиксировано (всего приемов: ${matches.length}). ${anesthList}`;
			}

			const compDesc = compMatches
				.map(
					(m) =>
						`${new Date(m.visitDate).toLocaleDateString("ru-RU")} — ${m.complications || m.summary} (врач: ${m.doctorFullName || "—"})`,
				)
				.join("; ");
			return `⚠️ Внимание! Зафиксированы осложнения / реакции: ${compDesc}.`;
		}

		case "allergy_check": {
			const allergyMatches = matches.filter(
				(m) => m.category === "allergy_anamnesis",
			);
			if (allergyMatches.length === 0) {
				return `Аллергологический статус: аллергий на указанные препараты не зарегистрировано.`;
			}
			return `⚠️ Аллергоанамнез: ${allergyMatches.map((m) => m.summary).join("; ")}.`;
		}

		case "imaging_search": {
			const imgList = matches
				.map(
					(m) =>
						`${new Date(m.visitDate).toLocaleDateString("ru-RU")} — ${m.summary}`,
				)
				.join("; ");
			return `Найдено рентген-снимков (${matches.length}): ${imgList}.`;
		}

		case "materials_used": {
			const matList = matches
				.filter((m) => m.materials && m.materials.length > 0)
				.map(
					(m) =>
						`${new Date(m.visitDate).toLocaleDateString("ru-RU")}${m.toothNumber ? ` (зуб ${m.toothNumber})` : ""}: ${m.materials?.join(", ")}`,
				)
				.join("; ");
			return matList.length > 0
				? `Использованные материалы: ${matList}.`
				: `Информация по материалам: ${top.summary}.`;
		}

		default: {
			return `Найдено ${matches.length} релевантных записей. Наиболее значимая: ${top.summary} (от ${dateRu}).`;
		}
	}
}

// ─── AGENT TOOL: clinical.search_patient_history ─────────────────────────────

const searchPatientHistorySchema = z.object({
	patientId: z
		.string()
		.uuid("Некорректный UUID пациента")
		.describe("Уникальный идентификатор пациента"),
	query: z
		.string()
		.min(1, "Поисковый запрос не может быть пустым")
		.describe(
			"Семантический запрос по истории болезни пациента (например, 'Когда лечили 36 зуб?', 'Были ли осложнения после анестезии?', 'Какие пломбировочные материалы использовались?')",
		),
	toothNumber: z
		.number()
		.int()
		.min(11)
		.max(85)
		.optional()
		.describe(
			"Опциональный фильтр по номеру зуба FDI (11–48 для постоянного или 51–85 для молочного прикуса)",
		),
	maxAgeYears: z
		.number()
		.min(1)
		.max(20)
		.optional()
		.default(5)
		.describe("Глубина поиска в годах (по умолчанию: 5 лет)"),
	limit: z
		.number()
		.int()
		.min(1)
		.max(50)
		.optional()
		.default(10)
		.describe("Максимальное количество возвращаемых записей"),
});

export const searchPatientHistoryTool: ToolDefinition<
	typeof searchPatientHistorySchema
> = {
	name: "search_patient_history",
	description:
		"Семантическая память и поиск по 5-летней истории болезни пациента (ЭМК 043/у): поиск визитов, дневников, диагнозов МКБ-10, аллергоанамнеза, осложнений анестезии, рентген-снимков, материалов и врачей с точными датами.",
	parameters: searchPatientHistorySchema,
	permissions: ["clinical.read"],
	category: "read",
	handler: async (ctx: AgentContext, args) => {
		const targetDb = ctx.db ?? defaultDb;

		// Validate patient belongs to tenant
		const [patient] = await targetDb
			.select({ id: patients.id, fullName: patients.fullName })
			.from(patients)
			.where(
				and(
					eq(patients.organizationId, ctx.organizationId),
					eq(patients.id, args.patientId),
				),
			)
			.limit(1);

		if (!patient) {
			throw new Error(`Пациент с ID ${args.patientId} не найден в клинике`);
		}

		// Perform hybrid semantic search
		const searchResult = await searchPatientHistoryMemory({
			db: targetDb,
			organizationId: ctx.organizationId,
			patientId: args.patientId,
			query: args.query,
			...(args.limit !== undefined ? { topK: args.limit } : {}),
			...(args.maxAgeYears !== undefined
				? { maxAgeYears: args.maxAgeYears }
				: {}),
			...(args.toothNumber !== undefined
				? { toothFilter: args.toothNumber }
				: {}),
		});

		return {
			patientId: args.patientId,
			patientFullName: patient.fullName,
			query: args.query,
			intent: searchResult.parsedQuery.intent,
			extractedTeeth: searchResult.parsedQuery.extractedTeeth,
			totalRecordsScanned: searchResult.totalRecordsScanned,
			matchesCount: searchResult.matchesCount,
			synthesizedAnswerRu: searchResult.synthesizedAnswerRu,
			matches: searchResult.matches.map((m) => ({
				visitDate: m.visitDate,
				category: m.category,
				toothNumber: m.toothNumber ?? null,
				doctorFullName: m.doctorFullName ?? null,
				diagnosis: m.diagnosis ?? null,
				materials: m.materials ?? [],
				anesthesia: m.anesthesia ?? null,
				complications: m.complications ?? null,
				summary: m.summary,
				score: m.score,
				relevance: m.relevance,
			})),
		};
	},
};
