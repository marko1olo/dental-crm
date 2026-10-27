/**
 * searchEngineTypes.ts — Type definitions for fast patient search and duplicate detection.
 */

import type { Patient } from "@dental/shared";

export interface SearchablePatient extends Patient {
	readonly cardNumber?: string | null | undefined;
}

export interface SearchMatchHighlightPart {
	readonly text: string;
	readonly isMatch: boolean;
}

export interface PatientSearchResultItem {
	readonly patient: Patient;
	readonly score: number;
	readonly fullNameHighlights: SearchMatchHighlightPart[];
	readonly phoneHighlights: SearchMatchHighlightPart[];
	readonly cardHighlights?: SearchMatchHighlightPart[] | undefined;
	readonly matchedBy: "phone" | "name" | "card" | "rep_phone" | "birth_date" | "fuzzy_name" | "both" | "snils" | "policy" | "tag" | "notes";
	readonly isFuzzy?: boolean | undefined;
	readonly suggestedName?: string | undefined;
}

export interface FindPotentialDuplicatesCriteria {
	readonly fullName?: string | null | undefined;
	readonly phone?: string | null | undefined;
	readonly thresholdScore?: number | undefined;
	readonly limit?: number | undefined;
}

export interface PotentialDuplicateItem {
	readonly patient: Patient;
	readonly score: number;
	readonly fullNameHighlights: SearchMatchHighlightPart[];
	readonly phoneHighlights: SearchMatchHighlightPart[];
	readonly cardHighlights?: SearchMatchHighlightPart[] | undefined;
	readonly matchedBy: "phone" | "name" | "card" | "rep_phone" | "birth_date" | "fuzzy_name" | "both" | "snils" | "policy" | "tag" | "notes";
	readonly isFuzzy?: boolean | undefined;
	readonly suggestedName?: string | undefined;
	readonly duplicateReason: "phone" | "name" | "fuzzy_name" | "both";
}

export type PatientWithSearchableData = Patient & {
	cardNumber?: string | null | undefined;
	balanceRub?: number | null | undefined;
	administrativeProfile?: {
		legalRepresentativePhone?: string | null | undefined;
		legalRepresentativeFullName?: string | null | undefined;
	} | null | undefined;
};

export interface QuickPatientPrefill {
	readonly fullName: string;
	readonly phone: string;
}
