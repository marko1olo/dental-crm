/**
 * matcherTypes.ts — Nomenclature Matcher Contracts & Clean Domain Aliases.
 * Mandate 8ap: Clean domain nomenclature types.
 * Strictly <= 120 lines.
 */

import type {
	NomenclatureMatchResult,
	PriceListConfidenceKind,
	StatutoryNomenclatureEntry,
} from "../types.js";

export type {
	NomenclatureMatchResult,
	PriceListConfidenceKind,
	StatutoryNomenclatureEntry,
};

export interface NormalizedCodeExtraction {
	readonly rawCode: string;
	readonly normalizedCode: string;
	readonly cleanedTitleWithoutCode: string;
}

export interface KeywordScoringMatch {
	readonly bestEntry: StatutoryNomenclatureEntry | null;
	readonly highestScore: number;
	readonly matchedKeywordCount: number;
}

/**
 * Clean domain alias for NomenclatureMatchResult (Mandate 8ap).
 */
export interface ServiceNomenclatureMatchResult extends NomenclatureMatchResult {
	readonly serviceCode?: string;
	readonly nomenclatureCode?: string;
}
