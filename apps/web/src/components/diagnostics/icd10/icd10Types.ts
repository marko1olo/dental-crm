import type { DentalIcd10Item, DentalSpecialty, ClinicalSeverity } from "../icd10DentalCatalog";

/**
 * Валидные номера зубов по двухцифровой системе FDI (ISO 3950).
 */
export const VALID_FDI_PERMANENT_TEETH = new Set<number>([
	11, 12, 13, 14, 15, 16, 17, 18,
	21, 22, 23, 24, 25, 26, 27, 28,
	31, 32, 33, 34, 35, 36, 37, 38,
	41, 42, 43, 44, 45, 46, 47, 48,
]);

export const VALID_FDI_PRIMARY_TEETH = new Set<number>([
	51, 52, 53, 54, 55,
	61, 62, 63, 64, 65,
	71, 72, 73, 74, 75,
	81, 82, 83, 84, 85,
]);

export const ALL_VALID_FDI_TEETH = new Set<number>([
	...VALID_FDI_PERMANENT_TEETH,
	...VALID_FDI_PRIMARY_TEETH,
]);

export interface Icd10SearchResult {
	readonly item: DentalIcd10Item;
	readonly score: number;
	readonly matchedBy: "code" | "title" | "synonym" | "rubric" | "fuzzy";
	readonly highlightedTerms: readonly string[];
}

export interface Icd10ParsedQuery {
	readonly rawQuery: string;
	readonly cleanedQuery: string;
	readonly extractedToothNumber: number | null;
	readonly extractedToothRaw: string | null;
	readonly normalizedCodeCandidate: string | null;
}

export interface Icd10SearchOptions {
	readonly specialty?: DentalSpecialty | undefined;
	readonly rubric?: string | undefined;
	readonly severity?: ClinicalSeverity | undefined;
	readonly requiresToothOnly?: boolean | undefined;
	readonly limit?: number | undefined;
	readonly selectedToothNumber?: number | null | undefined;
}

export interface Icd10ValidationSuccess {
	readonly isValid: true;
	readonly normalizedCode: string;
	readonly item?: DentalIcd10Item | undefined;
	readonly teeth: number[];
}

export interface Icd10ValidationFailure {
	readonly isValid: false;
	readonly errorCode: "Icd10Required" | "Icd10Invalid" | "ToothRequired" | "ToothInvalid";
	readonly errorMessage: string;
	readonly normalizedCode?: string | undefined;
	readonly item?: DentalIcd10Item | undefined;
	readonly teeth?: number[] | undefined;
}

export type Icd10ValidationResult = Icd10ValidationSuccess | Icd10ValidationFailure;
