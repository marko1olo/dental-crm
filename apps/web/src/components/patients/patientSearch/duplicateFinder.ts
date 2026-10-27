import type { Patient } from "@dental/shared";
import type { FindPotentialDuplicatesCriteria, PotentialDuplicateItem } from "./types";
import { highlightSearchMatches } from "./fuzzyScoring";
import { scoreNameDuplicate, scorePhoneDuplicate, isBirthDateMatch } from "./duplicateScorer";

export function findPotentialDuplicates(
	patients: readonly Patient[],
	criteria: FindPotentialDuplicatesCriteria,
): PotentialDuplicateItem[] {
	const name = (criteria.fullName ?? "").trim();
	const phone = (criteria.phone ?? "").trim();
	const birthDate = (criteria.birthDate ?? "").trim();
	const phoneDigits = phone.replace(/\D/g, "");
	if (name.length < 3 && phoneDigits.length < 4 && !birthDate) return [];

	const threshold = criteria.thresholdScore ?? 35;
	const limit = criteria.limit ?? 5;
	const results: PotentialDuplicateItem[] = [];

	for (const patient of patients) {
		if ((patient as any).mergedIntoPatientId || patient.status === "archived") continue;

		const nameRes = scoreNameDuplicate(patient.fullName, name);
		const phoneScore = scorePhoneDuplicate(patient, phoneDigits, phone);
		const dobMatched = isBirthDateMatch(patient.birthDate, birthDate);
		const nameMatched = nameRes.score >= 35;
		const phoneMatched = phoneScore >= 50;
		if (!nameMatched && !phoneMatched && !dobMatched) continue;

		let finalScore = 0;
		let duplicateReason: "name" | "phone" | "both" | "fuzzy_name" | "birth_date_and_name" = "name";
		let matchedBy: "name" | "phone" | "both" | "fuzzy_name" | "card" | "rep_phone" | "birth_date" = "name";
		let isFuzzy = false;
		let suggestedName: string | undefined;
		let explanation = "";

		if (nameMatched && phoneMatched) {
			finalScore = 100;
			duplicateReason = "both";
			matchedBy = "both";
			isFuzzy = nameRes.isFuzzy;
			suggestedName = nameRes.suggestedName;
			explanation = "Совпадение по ФИО и телефонному номеру";
		} else if (dobMatched && nameMatched) {
			finalScore = Math.max(90, nameRes.score);
			duplicateReason = "birth_date_and_name";
			matchedBy = nameRes.isFuzzy ? "fuzzy_name" : "birth_date";
			isFuzzy = nameRes.isFuzzy;
			suggestedName = nameRes.suggestedName;
			explanation = `Совпадение даты рождения (${patient.birthDate}) и ФИО`;
		} else if (phoneMatched && !nameMatched) {
			finalScore = phoneScore;
			duplicateReason = "phone";
			matchedBy = "phone";
			explanation = "Совпадение по номеру телефона";
		} else {
			finalScore = nameRes.score;
			duplicateReason = nameRes.reason || "name";
			matchedBy = nameRes.isFuzzy ? "fuzzy_name" : "name";
			isFuzzy = nameRes.isFuzzy;
			suggestedName = nameRes.suggestedName;
			explanation = nameRes.isFuzzy ? "Похожее ФИО (вероятная опечатка)" : "Совпадение по ФИО";
		}

		if (finalScore < threshold) continue;

		const fullNameHighlights = name.length >= 2
			? highlightSearchMatches(patient.fullName, name)
			: [{ text: patient.fullName || "Пациент", isMatch: false }];
		const phoneHighlights = phoneDigits.length >= 3
			? highlightSearchMatches(patient.phone, phone)
			: [{ text: patient.phone || "—", isMatch: false }];
		const cardNumber = (patient as any).cardNumber ?? undefined;

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
			explanation,
		});
	}

	return results
		.sort((a, b) => b.score - a.score || (a.patient.fullName || "").localeCompare(b.patient.fullName || "", "ru"))
		.slice(0, limit);
}
