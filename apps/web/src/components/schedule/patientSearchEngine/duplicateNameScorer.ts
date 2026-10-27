/**
 * duplicateNameScorer.ts — Name duplicate score evaluation with fuzzy typo tolerance.
 */

import {
	isFuzzyNameMatch,
	normalizeCyrillicText,
} from "../../../utils/patientSearchUtils";

export interface NameDuplicateResult {
	score: number;
	reason: "name" | "fuzzy_name" | null;
	isFuzzy: boolean;
	suggestedName?: string | undefined;
}

export function scoreNameDuplicate(
	patientFullName: string | null | undefined,
	searchName: string,
): NameDuplicateResult {
	if (!searchName || searchName.length < 3 || !patientFullName) {
		return { score: 0, reason: null, isFuzzy: false };
	}

	const normPatientName = normalizeCyrillicText(patientFullName);
	const normQueryName = normalizeCyrillicText(searchName);

	if (normPatientName === normQueryName) {
		return { score: 100, reason: "name", isFuzzy: false };
	}

	if (
		normPatientName.startsWith(normQueryName) ||
		normQueryName.startsWith(normPatientName)
	) {
		return { score: 95, reason: "name", isFuzzy: false };
	}

	const fuzzyCheck = isFuzzyNameMatch(patientFullName, searchName);
	if (fuzzyCheck.isMatch) {
		if (fuzzyCheck.isExact) {
			return { score: 95, reason: "name", isFuzzy: false };
		}
		return {
			score: fuzzyCheck.maxDistance === 1 ? 75 : 65,
			reason: "fuzzy_name",
			isFuzzy: true,
			suggestedName: patientFullName,
		};
	}

	return { score: 0, reason: null, isFuzzy: false };
}
