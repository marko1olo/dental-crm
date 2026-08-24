/**
 * patientSearchEngine.ts — Fast live patient search with phone fragment, name tokenization,
 * match highlighting, and 150ms debounce scoring for Reception and Schedule.
 */

import type { Patient } from "@dental/shared";
import {
	matchesPatientSearch,
	normalizeCyrillicText,
	normalizePhoneToNational,
	type PatientSearchableFields,
} from "../../utils/patientSearchUtils";

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
	readonly matchedBy: "phone" | "name" | "card" | "rep_phone" | "birth_date";
}

/**
 * Splits text into matched and non-matched chunks for <mark> visual highlighting.
 */
export function highlightSearchMatches(
	text: string | null | undefined,
	query: string,
): SearchMatchHighlightPart[] {
	if (!text) return [];
	const q = query.trim();
	if (!q) return [{ text, isMatch: false }];

	const normalizedSource = text.toLowerCase().replaceAll("ё", "е");
	const normalizedQ = q.toLowerCase().replaceAll("ё", "е");

	// Exact substring matching
	const index = normalizedSource.indexOf(normalizedQ);
	if (index >= 0) {
		const parts: SearchMatchHighlightPart[] = [];
		if (index > 0) {
			parts.push({ text: text.slice(0, index), isMatch: false });
		}
		parts.push({
			text: text.slice(index, index + q.length),
			isMatch: true,
		});
		if (index + q.length < text.length) {
			parts.push({ text: text.slice(index + q.length), isMatch: false });
		}
		return parts;
	}

	// Digit matching for phone numbers
	const queryDigits = q.replace(/\D/g, "");
	if (queryDigits.length >= 3) {
		const digitsInSource = text.replace(/\D/g, "");
		const digitIndex = digitsInSource.indexOf(queryDigits);
		if (digitIndex >= 0) {
			// Find character boundaries in formatted string
			let digitCounter = 0;
			let startCharIdx = -1;
			let endCharIdx = -1;

			for (let i = 0; i < text.length; i++) {
				const char = text[i];
				if (char && /\d/.test(char)) {
					if (digitCounter === digitIndex && startCharIdx === -1) {
						startCharIdx = i;
					}
					digitCounter++;
					if (digitCounter === digitIndex + queryDigits.length) {
						endCharIdx = i + 1;
						break;
					}
				}
			}

			if (startCharIdx >= 0 && endCharIdx > startCharIdx) {
				const parts: SearchMatchHighlightPart[] = [];
				if (startCharIdx > 0) {
					parts.push({ text: text.slice(0, startCharIdx), isMatch: false });
				}
				parts.push({
					text: text.slice(startCharIdx, endCharIdx),
					isMatch: true,
				});
				if (endCharIdx < text.length) {
					parts.push({ text: text.slice(endCharIdx), isMatch: false });
				}
				return parts;
			}
		}
	}

	// Tokenized word prefix matching
	const tokens = normalizedQ.split(/\s+/).filter(Boolean);
	for (const token of tokens) {
		const tokenIdx = normalizedSource.indexOf(token);
		if (tokenIdx >= 0) {
			const parts: SearchMatchHighlightPart[] = [];
			if (tokenIdx > 0) {
				parts.push({ text: text.slice(0, tokenIdx), isMatch: false });
			}
			parts.push({
				text: text.slice(tokenIdx, tokenIdx + token.length),
				isMatch: true,
			});
			if (tokenIdx + token.length < text.length) {
				parts.push({ text: text.slice(tokenIdx + token.length), isMatch: false });
			}
			return parts;
		}
	}

	return [{ text, isMatch: false }];
}

export type PatientWithSearchableData = Patient & {
	cardNumber?: string | null | undefined;
	balanceRub?: number | null | undefined;
	administrativeProfile?: {
		legalRepresentativePhone?: string | null | undefined;
		legalRepresentativeFullName?: string | null | undefined;
	} | null | undefined;
};

/**
 * Fast search index execution across patients collection.
 */
export function searchPatientsQuick(
	patients: readonly Patient[],
	rawQuery: string,
	limit: number = 20,
): PatientSearchResultItem[] {
	const query = rawQuery.trim();
	if (!query) {
		return patients.slice(0, limit).map((patient) => ({
			patient,
			score: 0,
			fullNameHighlights: [{ text: patient.fullName || "Пациент", isMatch: false }],
			phoneHighlights: [{ text: patient.phone || "—", isMatch: false }],
			matchedBy: "name",
		}));
	}

	const queryDigits = query.replace(/\D/g, "");
	const queryNational = normalizePhoneToNational(query);
	const normalizedQuery = normalizeCyrillicText(query);

	const results: PatientSearchResultItem[] = [];

	for (const patient of patients) {
		const patientWithData = patient as SearchablePatient;
		if (!matchesPatientSearch(patientWithData, query)) {
			continue;
		}

		let score = 0;
		let matchedBy: PatientSearchResultItem["matchedBy"] = "name";

		const patientPhoneDigits = (patient.phone ?? "").replace(/\D/g, "");
		const patientNational = normalizePhoneToNational(patient.phone);
		const normalizedName = normalizeCyrillicText(patient.fullName);
		const cardNumber = patientWithData.cardNumber ?? undefined;

		// Scoring
		if (queryDigits.length >= 10 && patientNational === queryNational) {
			score += 100;
			matchedBy = "phone";
		} else if (queryDigits.length >= 4 && patientPhoneDigits.endsWith(queryDigits)) {
			score += 80;
			matchedBy = "phone";
		} else if (queryDigits.length >= 3 && patientPhoneDigits.includes(queryDigits)) {
			score += 60;
			matchedBy = "phone";
		} else if (normalizedName.startsWith(normalizedQuery)) {
			score += 90;
			matchedBy = "name";
		} else if (normalizedName.includes(normalizedQuery)) {
			score += 70;
			matchedBy = "name";
		} else if (
			cardNumber &&
			normalizeCyrillicText(cardNumber).includes(normalizedQuery)
		) {
			score += 50;
			matchedBy = "card";
		} else {
			score += 40;
		}

		results.push({
			patient,
			score,
			fullNameHighlights: highlightSearchMatches(patient.fullName, query),
			phoneHighlights: highlightSearchMatches(patient.phone, query),
			cardHighlights: cardNumber ? highlightSearchMatches(cardNumber, query) : undefined,
			matchedBy,
		});
	}

	// Sort by highest score first, then by name
	return results
		.sort((a, b) => b.score - a.score || (a.patient.fullName || "").localeCompare(b.patient.fullName || "", "ru"))
		.slice(0, limit);
}
