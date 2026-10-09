/**
 * patientSearchEngine.ts — Layer 2: Движок быстрого поиска пациентов с ранжированием и нормализацией.
 */

import type { Patient } from "@dental/shared";
import type { PatientSearchableFields, PatientSearchResultItem } from "./types";
import { scorePatientSearch, highlightSearchMatches } from "./fuzzyScoring";
import { extractPatientCardNumbers, extractPatientPhones } from "./stringNormalizers";

export {
	extractPatientCardNumbers,
	extractPatientPhones,
	normalizeCardQuery,
} from "./stringNormalizers";

// ============================================================================
// БЫСТРЫЙ ПОИСК ПАЦИЕНТОВ С РАНЖИРОВАНИЕМ
// ============================================================================

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
		const scored = scorePatientSearch(patient as PatientSearchableFields, query);
		if (!scored.isMatch) {
			continue;
		}

		const cardNumbers = extractPatientCardNumbers(patient as PatientSearchableFields);
		const cardNumber = cardNumbers[0] ?? undefined;
		const displayPhone = extractPatientPhones(patient as PatientSearchableFields)[0] ?? patient.phone ?? undefined;

		results.push({
			patient,
			score: scored.score,
			fullNameHighlights: highlightSearchMatches(patient.fullName, query),
			phoneHighlights: highlightSearchMatches(displayPhone, query),
			cardHighlights: cardNumber ? highlightSearchMatches(cardNumber, query) : undefined,
			matchedBy: scored.matchedBy,
			isFuzzy: scored.isFuzzy,
			suggestedName: scored.suggestedName,
		});
	}

	return results
		.sort(
			(a, b) =>
				b.score - a.score ||
				(a.patient.fullName || "").localeCompare(b.patient.fullName || "", "ru"),
		)
		.slice(0, limit);
}
