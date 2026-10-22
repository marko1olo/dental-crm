/**
 * icd10MatchingEngine.ts — Фасадный модуль поиска, нечеткого матчинга (Fuzzy Match)
 * и валидации стоматологических диагнозов МКБ-10 с поддержкой зубной формулы FDI.
 * Декомпозирован по Мандату 8b в подмодули ./icd10/*.
 */

import {
	normalizeCode,
	isValidFdiTooth,
	parseQuery,
	levenshteinDistance,
	search,
	autoMatchFromClinicalText,
	validateSelection,
	getRubricMeta,
	type Icd10SearchOptions,
	type Icd10SearchResult,
	type Icd10ParsedQuery,
	type Icd10ValidationResult,
} from "./icd10";

export * from "./icd10";

export class Icd10MatchingEngine {
	public static normalizeCode(raw: unknown): string {
		return normalizeCode(raw);
	}

	public static isValidFdiTooth(toothNumber: number): boolean {
		return isValidFdiTooth(toothNumber);
	}

	public static parseQuery(rawQuery: string): Icd10ParsedQuery {
		return parseQuery(rawQuery);
	}

	public static levenshteinDistance(a: string, b: string): number {
		return levenshteinDistance(a, b);
	}

	public static search(rawQuery: string, options: Icd10SearchOptions = {}): Icd10SearchResult[] {
		return search(rawQuery, options);
	}

	public static autoMatchFromClinicalText(clinicalText: string) {
		return autoMatchFromClinicalText(clinicalText);
	}

	public static validateSelection(code: unknown, toothInput?: unknown): Icd10ValidationResult {
		return validateSelection(code, toothInput);
	}

	public static getRubricMeta(rubricCode: string) {
		return getRubricMeta(rubricCode);
	}
}
