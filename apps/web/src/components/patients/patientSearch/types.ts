/**
 * types.ts — Layer 0: Типы и контракты подсистемы нечеткого поиска и слияния пациентов.
 */

import type { Patient } from "@dental/shared";

export interface PatientSearchableFields {
	fullName?: string | null | undefined;
	phone?: string | null | undefined;
	mobilePhone?: string | null | undefined;
	contactPhone?: string | null | undefined;
	birthDate?: string | null | undefined;
	cardNumber?: string | null | undefined;
	chartNumber?: string | null | undefined;
	medicalCardNumber?: string | null | undefined;
	medCardNumber?: string | null | undefined;
	snils?: string | null | undefined;
	insurancePolicyNumber?: string | null | undefined;
	policyNumber?: string | null | undefined;
	omsPolicy?: string | null | undefined;
	dmsPolicyNumber?: string | null | undefined;
	notes?: string | null | undefined;
	tags?: string[] | string | null | undefined;
	administrativeProfile?: {
		legalRepresentativePhone?: string | null | undefined;
		legalRepresentativeFullName?: string | null | undefined;
		cardNumber?: string | null | undefined;
		patientPhone?: string | null | undefined;
		snils?: string | null | undefined;
		insurancePolicyNumber?: string | null | undefined;
		identityDocument?: string | null | undefined;
		taxpayerInn?: string | null | undefined;
	} | null | undefined;
}

export interface PatientSearchScoredResult {
	readonly isMatch: boolean;
	readonly score: number;
	readonly matchedBy: "phone" | "name" | "card" | "rep_phone" | "birth_date" | "fuzzy_name" | "snils" | "policy" | "tag" | "notes";
	readonly isExact: boolean;
	readonly isFuzzy: boolean;
	readonly suggestedName?: string | undefined;
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
	readonly birthDate?: string | null | undefined;
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
	readonly duplicateReason: "phone" | "name" | "fuzzy_name" | "birth_date_and_name" | "both";
	readonly explanation?: string | undefined;
}

export interface MergedPatientResult {
	readonly primaryPatient: Patient;
	readonly archivedDuplicatePatient: Patient;
	readonly combinedBalanceRub: number;
	readonly unitedAllergies: string;
	readonly unitedSafetyFlags: string[];
	readonly summary: string;
}
