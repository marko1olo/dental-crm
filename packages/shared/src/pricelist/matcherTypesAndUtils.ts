import type { DentalSpecialty, ServiceCategory } from "../index.js";

export type MatchConfidenceKind =
	| "exact_code"
	| "high_keyword"
	| "medium_keyword"
	| "low_keyword"
	| "fallback";

export interface NomenclatureMatchResult {
	readonly code804n: string;
	readonly statutoryTitle804n: string;
	readonly category: ServiceCategory;
	readonly specialty: DentalSpecialty;
	readonly confidence: number; // 0..1
	readonly confidenceKind: MatchConfidenceKind;
	readonly cleanedTitle: string;
	readonly matchedKeywords: readonly string[];
}

/**
 * Normalizes Cyrillic 'А'/'В' to Latin 'A'/'B' in statutory codes.
 */
export function normalizeStatutoryCode(rawCode: string): string {
	return (rawCode || "")
		.trim()
		.toUpperCase()
		.replace(/^А/, "A")
		.replace(/^В/, "B");
}

/**
 * Checks if a string looks like a statutory Order 804n code (e.g. A16.07.002 or B01.065.001.002).
 */
export function isStatutory804nCode(str: string): boolean {
	const norm = normalizeStatutoryCode(str);
	return /^[AB]\d{2}\.\d{2}\.\d{3}(?:\.\d{3})?$/.test(norm);
}
