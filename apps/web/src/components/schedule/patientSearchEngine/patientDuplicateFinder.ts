/**
 * patientDuplicateFinder.ts — Multi-field duplicate patient detector with fuzzy typo tolerance.
 */

import type { Patient } from "@dental/shared";
import { scoreNameDuplicate } from "./duplicateNameScorer";
import { scorePhoneDuplicate } from "./duplicatePhoneScorer";
import { highlightSearchMatches } from "./searchMatchHighlighter";
import type {
	FindPotentialDuplicatesCriteria,
	PotentialDuplicateItem,
	SearchablePatient,
} from "./searchEngineTypes";

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
		const nameRes = scoreNameDuplicate(patient.fullName, name);
		const phoneScore = scorePhoneDuplicate(patient, phoneDigits, phone);

		const nameMatched = nameRes.score >= 35;
		const phoneMatched = phoneScore >= 50;

		if (!nameMatched && !phoneMatched) continue;

		let finalScore = 0;
		let duplicateReason: "name" | "phone" | "both" | "fuzzy_name" = "name";
		let matchedBy: "name" | "phone" | "both" | "fuzzy_name" | "card" | "rep_phone" | "birth_date" = "name";
		let isFuzzy = false;
		let suggestedName: string | undefined = undefined;

		if (nameMatched && phoneMatched) {
			finalScore = 100;
			duplicateReason = "both";
			matchedBy = "both";
			isFuzzy = nameRes.isFuzzy;
			suggestedName = nameRes.suggestedName;
		} else if (phoneMatched && !nameMatched) {
			finalScore = phoneScore;
			duplicateReason = "phone";
			matchedBy = "phone";
			isFuzzy = false;
		} else {
			finalScore = nameRes.score;
			duplicateReason = nameRes.reason || "name";
			matchedBy = nameRes.isFuzzy ? "fuzzy_name" : "name";
			isFuzzy = nameRes.isFuzzy;
			suggestedName = nameRes.suggestedName;
		}

		if (finalScore < threshold) continue;

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
