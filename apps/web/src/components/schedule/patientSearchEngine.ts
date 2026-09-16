/**
 * patientSearchEngine.ts — Fast live patient search with phone fragment, name tokenization,
 * fuzzy Levenshtein scoring, match highlighting, and 150ms debounce scoring for Reception and Schedule.
 */

import type { Patient } from "@dental/shared";
import {
	fuzzyMatchToken,
	scorePatientSearch,
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
	readonly matchedBy: "phone" | "name" | "card" | "rep_phone" | "birth_date" | "fuzzy_name";
	readonly isFuzzy?: boolean | undefined;
	readonly suggestedName?: string | undefined;
}

/**
 * Splits text into matched and non-matched chunks for <mark> visual highlighting.
 * Handles exact substrings, phone digit sequences, and fuzzy matched tokens.
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

	// 1. Exact substring matching
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

	// 2. Digit matching for phone numbers
	const queryDigits = q.replace(/\D/g, "");
	if (queryDigits.length >= 3) {
		const digitsInSource = text.replace(/\D/g, "");
		const digitIndex = digitsInSource.indexOf(queryDigits);
		if (digitIndex >= 0) {
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

	// 3. Tokenized word prefix & fuzzy matching
	const queryTokens = normalizedQ.split(/\s+/).filter(Boolean);
	for (const token of queryTokens) {
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

	// 4. Fuzzy token highlight
	const words = text.split(/(\s+)/);
	let hasFuzzyWord = false;
	const parts: SearchMatchHighlightPart[] = [];

	for (const word of words) {
		if (!word || /^\s+$/.test(word)) {
			parts.push({ text: word, isMatch: false });
			continue;
		}

		let wordIsMatch = false;
		for (const qTok of queryTokens) {
			const fMatch = fuzzyMatchToken(qTok, word);
			if (fMatch.isMatch) {
				wordIsMatch = true;
				hasFuzzyWord = true;
				break;
			}
		}

		parts.push({ text: word, isMatch: wordIsMatch });
	}

	if (hasFuzzyWord) {
		return parts;
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
 * Fast search index execution across patients collection with scored ranking.
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
			isFuzzy: false,
		}));
	}

	const results: PatientSearchResultItem[] = [];

	for (const patient of patients) {
		const patientWithData = patient as SearchablePatient;
		const scored = scorePatientSearch(patientWithData, query);
		if (!scored.isMatch) {
			continue;
		}

		const cardNumber = patientWithData.cardNumber ?? undefined;

		results.push({
			patient,
			score: scored.score,
			fullNameHighlights: highlightSearchMatches(patient.fullName, query),
			phoneHighlights: highlightSearchMatches(patient.phone, query),
			cardHighlights: cardNumber ? highlightSearchMatches(cardNumber, query) : undefined,
			matchedBy: scored.matchedBy,
			isFuzzy: scored.isFuzzy,
			suggestedName: scored.suggestedName,
		});
	}

	// Sort by highest score first (exact and phone/card matches at the top), then by name
	return results
		.sort((a, b) => b.score - a.score || (a.patient.fullName || "").localeCompare(b.patient.fullName || "", "ru"))
		.slice(0, limit);
}

export interface QuickPatientPrefill {
	readonly fullName: string;
	readonly phone: string;
}

/**
 * Parses a raw search query string into suggested fullName and phone
 * for 1-click quick patient registration / check-in.
 * Mandate 8e & 8n: Zero Dead-Ends for Solo Doctor and Small Clinic Reception.
 */
export function parseSearchQueryForQuickPatient(rawQuery: string): QuickPatientPrefill {
	const query = (rawQuery || "").trim();
	if (!query) {
		return { fullName: "", phone: "" };
	}

	const digits = query.replace(/\D/g, "");
	const hasLetters = /[a-zA-Zа-яА-ЯёЁ]/.test(query);

	// 1. Pure phone numbers or digit fragments (no letters)
	if (!hasLetters && digits.length >= 3) {
		return {
			fullName: "",
			phone: formatPhoneForInput(query, digits),
		};
	}

	// 2. Combined query: name + phone (e.g. "Иванов +79161234567" or "Иван 89260001122")
	if (hasLetters && digits.length >= 7) {
		const phoneMatch =
			query.match(/(?:\+?7|8)?[\s\-(]*\d{3}[\s\-)]*\d{3}[\s\-]*\d{2}[\s\-]*\d{2}/) ||
			query.match(/\d{7,11}/);

		if (phoneMatch) {
			const phonePart = phoneMatch[0];
			const namePart = query.replace(phonePart, "").replace(/[,;]/g, " ").trim();
			const phoneDigits = phonePart.replace(/\D/g, "");
			return {
				fullName: namePart,
				phone: formatPhoneForInput(phonePart, phoneDigits),
			};
		}
	}

	// 3. Primarily letters / name
	return {
		fullName: query,
		phone: "",
	};
}

function formatPhoneForInput(raw: string, digits: string): string {
	if (digits.length === 10) {
		return `+7 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 8)}-${digits.slice(8, 10)}`;
	}
	if (digits.length === 11 && (digits.startsWith("7") || digits.startsWith("8"))) {
		const core = digits.slice(1);
		return `+7 (${core.slice(0, 3)}) ${core.slice(3, 6)}-${core.slice(6, 8)}-${core.slice(8, 10)}`;
	}
	return raw.startsWith("+") ? raw : `+7 ${raw}`;
}

