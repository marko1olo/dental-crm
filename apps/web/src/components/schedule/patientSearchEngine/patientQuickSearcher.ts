/**
 * patientQuickSearcher.ts — Fast patient search index execution with scored ranking.
 */

import type { Patient } from "@dental/shared";
import { scorePatientSearch } from "../../../utils/patientSearchUtils";
import { highlightSearchMatches } from "./searchMatchHighlighter";
import type {
	PatientSearchResultItem,
	SearchablePatient,
} from "./searchEngineTypes";

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

	return results
		.sort((a, b) => b.score - a.score || (a.patient.fullName || "").localeCompare(b.patient.fullName || "", "ru"))
		.slice(0, limit);
}
