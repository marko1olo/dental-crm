import type { PatientSearchableFields, PatientSearchScoredResult } from "./types";
import { normalizeCyrillicText, normalizePhoneToNational } from "./stringNormalizers";
import { isFuzzyNameMatch } from "./fuzzyNameMatcher";
import {
	checkBirthDateMatch,
	checkCardMatch,
	checkPhoneMatch,
	checkSnilsAndPolicyMatch,
} from "./searchScoringRules";

export function scorePatientSearch(
	patient: PatientSearchableFields | null | undefined,
	rawQuery: string,
): PatientSearchScoredResult {
	if (!patient) return { isMatch: false, score: 0, matchedBy: "name", isExact: false, isFuzzy: false };

	const query = rawQuery.trim();
	if (!query) return { isMatch: true, score: 0, matchedBy: "name", isExact: true, isFuzzy: false };

	const queryDigits = query.replace(/\D/g, "");
	const queryNational = normalizePhoneToNational(query);
	const normalizedQuery = normalizeCyrillicText(query);
	const normalizedFullName = normalizeCyrillicText(patient.fullName);

	const phoneMatch = checkPhoneMatch(patient, queryDigits, queryNational);
	if (phoneMatch) return phoneMatch;

	const cardMatch = checkCardMatch(patient, query, normalizedQuery, queryDigits);
	if (cardMatch) return cardMatch;

	const birthMatch = checkBirthDateMatch(patient, query, queryDigits);
	if (birthMatch) return birthMatch;

	if (normalizedFullName && normalizedQuery) {
		if (normalizedFullName === normalizedQuery) return { isMatch: true, score: 95, matchedBy: "name", isExact: true, isFuzzy: false };
		if (normalizedFullName.startsWith(normalizedQuery)) return { isMatch: true, score: 90, matchedBy: "name", isExact: true, isFuzzy: false };
		if (normalizedFullName.includes(normalizedQuery)) return { isMatch: true, score: 70, matchedBy: "name", isExact: true, isFuzzy: false };
	}

	const repName = patient.administrativeProfile?.legalRepresentativeFullName;
	if (repName && normalizedQuery) {
		const normRepName = normalizeCyrillicText(repName);
		if (normRepName.includes(normalizedQuery)) return { isMatch: true, score: 65, matchedBy: "name", isExact: true, isFuzzy: false };
	}

	const nameMatch = isFuzzyNameMatch(patient.fullName, query);
	if (nameMatch.isMatch) {
		if (nameMatch.isExact) return { isMatch: true, score: 70, matchedBy: "name", isExact: true, isFuzzy: false };
		return { isMatch: true, score: nameMatch.maxDistance === 1 ? 45 : 35, matchedBy: "fuzzy_name", isExact: false, isFuzzy: true, suggestedName: patient.fullName || undefined };
	}

	if (repName) {
		const repMatch = isFuzzyNameMatch(repName, query);
		if (repMatch.isMatch) {
			return { isMatch: true, score: repMatch.isExact ? 50 : 30, matchedBy: repMatch.isExact ? "name" : "fuzzy_name", isExact: repMatch.isExact, isFuzzy: !repMatch.isExact, suggestedName: repName };
		}
	}

	const snilsOrPolicyMatch = checkSnilsAndPolicyMatch(patient, normalizedQuery, queryDigits);
	if (snilsOrPolicyMatch) return snilsOrPolicyMatch;

	if (patient.tags) {
		const tagsList = Array.isArray(patient.tags) ? patient.tags : [String(patient.tags)];
		for (const t of tagsList) {
			const normTag = normalizeCyrillicText(t);
			if (normTag.includes(normalizedQuery)) return { isMatch: true, score: 75, matchedBy: "tag", isExact: normTag === normalizedQuery, isFuzzy: false };
		}
	}

	if (patient.notes && normalizedQuery.length >= 3) {
		const normNotes = normalizeCyrillicText(patient.notes);
		if (normNotes.includes(normalizedQuery)) return { isMatch: true, score: 60, matchedBy: "notes", isExact: false, isFuzzy: false };
	}

	return { isMatch: false, score: 0, matchedBy: "name", isExact: false, isFuzzy: false };
}

export function matchesPatientSearch(
	patient: PatientSearchableFields | null | undefined,
	rawQuery: string,
): boolean {
	return scorePatientSearch(patient, rawQuery).isMatch;
}
