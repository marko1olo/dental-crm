/**
 * patientSearchEngine.ts — Fast live patient search with phone fragment, name tokenization,
 * fuzzy Levenshtein scoring, match highlighting, and 150ms debounce scoring for Reception and Schedule.
 */

import type { Patient } from "@dental/shared";
import {
	fuzzyMatchToken,
	isFuzzyNameMatch,
	normalizeCyrillicText,
	normalizePhoneToNational,
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

/**
 * Splits text into matched and non-matched chunks for <mark> visual highlighting.
 * Handles exact substrings, phone digit sequences, swapped order tokens, and fuzzy matched words.
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
	const queryTokens = normalizedQ.split(/\s+/).filter(Boolean);

	// 1. Single exact substring match if query is a single token or matches whole phrase
	if (queryTokens.length <= 1) {
		const singleIndex = normalizedSource.indexOf(normalizedQ);
		if (singleIndex >= 0) {
			const parts: SearchMatchHighlightPart[] = [];
			if (singleIndex > 0) {
				parts.push({ text: text.slice(0, singleIndex), isMatch: false });
			}
			parts.push({
				text: text.slice(singleIndex, singleIndex + q.length),
				isMatch: true,
			});
			if (singleIndex + q.length < text.length) {
				parts.push({ text: text.slice(singleIndex + q.length), isMatch: false });
			}
			return parts;
		}
	}

	const intervals: { start: number; end: number }[] = [];

	// 2. Digit matching for phone numbers
	const queryDigits = q.replace(/\D/g, "");
	const sourceDigits = text.replace(/\D/g, "");
	if (queryDigits.length >= 3 && sourceDigits.length >= 3) {
		let digitIndex = sourceDigits.indexOf(queryDigits);
		let matchLen = queryDigits.length;

		// National 10-digit matching for 11-digit numbers (7 vs 8)
		if (
			digitIndex === -1 &&
			queryDigits.length === 11 &&
			(queryDigits.startsWith("7") || queryDigits.startsWith("8")) &&
			sourceDigits.length === 11 &&
			(sourceDigits.startsWith("7") || sourceDigits.startsWith("8"))
		) {
			digitIndex = 1;
			matchLen = 10;
		}

		// Last 4 digits match
		if (digitIndex === -1 && queryDigits.length >= 4 && sourceDigits.endsWith(queryDigits)) {
			digitIndex = sourceDigits.length - queryDigits.length;
			matchLen = queryDigits.length;
		}

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
					if (digitCounter === digitIndex + matchLen) {
						endCharIdx = i + 1;
						break;
					}
				}
			}

			if (startCharIdx >= 0 && endCharIdx > startCharIdx) {
				intervals.push({ start: startCharIdx, end: endCharIdx });
			}
		}
	}

	// 3. Tokenized words & fuzzy matching
	const wordRegex = /[a-zA-Zа-яА-ЯёЁ0-9]+/g;
	const wordsInText: { word: string; normalized: string; start: number; end: number }[] = [];
	let wMatch: RegExpExecArray | null;
	while ((wMatch = wordRegex.exec(text)) !== null) {
		wordsInText.push({
			word: wMatch[0],
			normalized: wMatch[0].toLowerCase().replaceAll("ё", "е"),
			start: wMatch.index,
			end: wMatch.index + wMatch[0].length,
		});
	}

	for (const qTok of queryTokens) {
		if (qTok.length < 2) continue;

		for (const w of wordsInText) {
			if (w.normalized === qTok || w.normalized.startsWith(qTok)) {
				intervals.push({ start: w.start, end: w.start + Math.min(qTok.length, w.word.length) });
			} else if (qTok.startsWith(w.normalized)) {
				intervals.push({ start: w.start, end: w.end });
			} else {
				const fMatch = fuzzyMatchToken(qTok, w.word);
				if (fMatch.isMatch) {
					intervals.push({ start: w.start, end: w.end });
				}
			}
		}
	}

	if (intervals.length === 0) {
		return [{ text, isMatch: false }];
	}

	// Sort and merge intervals
	intervals.sort((a, b) => a.start - b.start || b.end - a.end);
	const merged: { start: number; end: number }[] = [];
	for (const interval of intervals) {
		if (merged.length === 0) {
			merged.push({ ...interval });
		} else {
			const last = merged[merged.length - 1];
			if (last && interval.start <= last.end) {
				last.end = Math.max(last.end, interval.end);
			} else {
				merged.push({ ...interval });
			}
		}
	}

	const parts: SearchMatchHighlightPart[] = [];
	let cursor = 0;
	for (const { start, end } of merged) {
		if (start > cursor) {
			parts.push({ text: text.slice(cursor, start), isMatch: false });
		}
		parts.push({ text: text.slice(start, end), isMatch: true });
		cursor = end;
	}
	if (cursor < text.length) {
		parts.push({ text: text.slice(cursor), isMatch: false });
	}

	return parts;
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

/**
 * Multi-field duplicate patient detector across patient collection.
 * Evaluates BOTH fullName (>= 3 chars) and phone (digits >= 4) with fuzzy typo tolerance.
 * Returns scored duplicate items with visual match highlights and duplicateReason badges.
 */
export function findPotentialDuplicates(
	patients: readonly Patient[],
	criteria: FindPotentialDuplicatesCriteria,
): PotentialDuplicateItem[] {
	const name = (criteria.fullName ?? "").trim();
	const phone = (criteria.phone ?? "").trim();
	const phoneDigits = phone.replace(/\D/g, "");

	if (name.length < 3 && phoneDigits.length < 4) {
		return [];
	}

	const threshold = criteria.thresholdScore ?? 35;
	const limit = criteria.limit ?? 5;
	const results: PotentialDuplicateItem[] = [];

	for (const patient of patients) {
		let nameDuplicateScore = 0;
		let nameReason: "name" | "fuzzy_name" | null = null;
		let nameIsFuzzy = false;
		let nameSuggested: string | undefined = undefined;

		if (name.length >= 3) {
			const normPatientName = normalizeCyrillicText(patient.fullName);
			const normQueryName = normalizeCyrillicText(name);

			if (normPatientName === normQueryName) {
				nameDuplicateScore = 100;
				nameReason = "name";
			} else if (
				normPatientName.startsWith(normQueryName) ||
				normQueryName.startsWith(normPatientName)
			) {
				nameDuplicateScore = 95;
				nameReason = "name";
			} else {
				const fuzzyCheck = isFuzzyNameMatch(patient.fullName, name);
				if (fuzzyCheck.isMatch) {
					if (fuzzyCheck.isExact) {
						// Swapped word order or exact subset of tokens without any typos
						nameDuplicateScore = 95;
						nameReason = "name";
					} else {
						// Fuzzy typo: distance 1 -> 75, distance 2 -> 65
						nameDuplicateScore = fuzzyCheck.maxDistance === 1 ? 75 : 65;
						nameReason = "fuzzy_name";
						nameIsFuzzy = true;
						nameSuggested = patient.fullName || undefined;
					}
				}
			}
		}

		let phoneDuplicateScore = 0;
		if (phoneDigits.length >= 4) {
			const queryDigits = phoneDigits;
			const patientPhoneDigits = (patient.phone ?? "").replace(/\D/g, "");
			const patientNational = normalizePhoneToNational(patient.phone);
			const queryNational = normalizePhoneToNational(phone);

			if (
				queryDigits.length >= 10 &&
				patientNational &&
				patientNational === queryNational
			) {
				phoneDuplicateScore = 100;
			} else if (
				patientPhoneDigits.length >= 10 &&
				queryDigits.length >= 10 &&
				patientPhoneDigits.slice(-10) === queryDigits.slice(-10)
			) {
				phoneDuplicateScore = 100;
			} else if (patientPhoneDigits.endsWith(phoneDigits)) {
				phoneDuplicateScore = 85;
			} else if (
				patientPhoneDigits.includes(phoneDigits) ||
				(queryNational.length >= 4 && patientNational.includes(queryNational))
			) {
				phoneDuplicateScore = 75;
			} else if (patient.administrativeProfile?.legalRepresentativePhone) {
				const repPhone =
					patient.administrativeProfile.legalRepresentativePhone;
				const repPhoneDigits = repPhone.replace(/\D/g, "");
				const repNational = normalizePhoneToNational(repPhone);
				if (
					queryDigits.length >= 10 &&
					repNational &&
					repNational === queryNational
				) {
					phoneDuplicateScore = 90;
				} else if (
					repPhoneDigits.endsWith(phoneDigits) ||
					repPhoneDigits.includes(phoneDigits)
				) {
					phoneDuplicateScore = 75;
				}
			}
		}

		const nameMatched = nameDuplicateScore >= 35;
		const phoneMatched = phoneDuplicateScore >= 50;

		if (!nameMatched && !phoneMatched) {
			continue;
		}

		let finalScore = 0;
		let duplicateReason: "name" | "phone" | "both" | "fuzzy_name" = "name";
		let matchedBy:
			| "name"
			| "phone"
			| "both"
			| "fuzzy_name"
			| "card"
			| "rep_phone"
			| "birth_date" = "name";
		let isFuzzy = false;
		let suggestedName: string | undefined = undefined;

		if (nameMatched && phoneMatched) {
			finalScore = 100;
			duplicateReason = "both";
			matchedBy = "both";
			isFuzzy = nameIsFuzzy;
			suggestedName = nameSuggested;
		} else if (phoneMatched && !nameMatched) {
			finalScore = phoneDuplicateScore;
			duplicateReason = "phone";
			matchedBy = "phone";
			isFuzzy = false;
		} else {
			finalScore = nameDuplicateScore;
			duplicateReason = nameReason || "name";
			matchedBy = nameIsFuzzy ? "fuzzy_name" : "name";
			isFuzzy = nameIsFuzzy;
			suggestedName = nameSuggested;
		}

		if (finalScore < threshold) {
			continue;
		}

		const fullNameHighlights = name.length >= 2
			? highlightSearchMatches(patient.fullName, name)
			: [{ text: patient.fullName || "Пациент", isMatch: false }];

		const phoneHighlights = phoneDigits.length >= 3
			? highlightSearchMatches(patient.phone, phone)
			: [{ text: patient.phone || "—", isMatch: false }];

		const cardNumber = (patient as SearchablePatient).cardNumber ?? undefined;

		results.push({
			patient,
			score: finalScore,
			fullNameHighlights,
			phoneHighlights,
			cardHighlights: cardNumber ? highlightSearchMatches(cardNumber, name || phone) : undefined,
			matchedBy,
			isFuzzy,
			suggestedName,
			duplicateReason,
		});
	}

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
			query.match(/\+?\d{7,11}/);

		if (phoneMatch) {
			const phonePart = phoneMatch[0];
			const namePart = query.replace(phonePart, "").replace(/[+,;]/g, " ").trim();
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

