import type { StaffMember } from "@dental/shared";
import { isFuzzyMatch, isFuzzyRootMatch } from "../stringUtils.js";
import type { MatchScoreResult } from "./bookingParserTypes.js";

export function matchDoctorsAndAssistants(words: string[], staff: StaffMember[]): {
	foundDocs: MatchScoreResult[];
	foundAssists: MatchScoreResult[];
} {
	const doctors = staff.filter((u) => u.active && (u.role === "doctor" || u.role === "owner"));
	const assistants = staff.filter((u) => u.active && u.role === "assistant");
	const foundDocs: MatchScoreResult[] = [];
	const foundAssists: MatchScoreResult[] = [];

	for (let i = 0; i < words.length; i++) {
		const word = words[i]!;
		if (word.length < 3 && !/^\d$/.test(word)) continue;
		const prev = (i > 0 ? words[i - 1] : "") ?? "";
		const prevPrev = (i > 1 ? words[i - 2] : "") ?? "";

		for (const doc of doctors) {
			const parts = doc.fullName.toLowerCase().split(" ");
			const specs = doc.specialties || [];
			const matchWords = [...parts, ...specs.flatMap((s: string) => s.toLowerCase().split(" "))];
			if (matchWords.some((p: string) => isFuzzyRootMatch(word, p))) {
				let score = 1;
				let matches = 1;
				const indexes = [i];
				if (i + 1 < words.length && matchWords.some((p: string) => isFuzzyRootMatch(words[i + 1]!, p) && !isFuzzyRootMatch(word, p))) {
					score += 50;
					matches = 2;
					indexes.push(i + 1);
				}
				if (["к", "ко", "врачу", "доктору", "док", "стоматологу", "врач"].includes(prev) || ["к", "ко"].includes(prevPrev)) score += 200;
				if (["пациент", "запиши", "записать"].includes(prev)) score -= 100;

				const existing = foundDocs.find((d) => d.id === doc.id);
				if (!existing || existing.score < score) {
					if (existing) foundDocs.splice(foundDocs.indexOf(existing), 1);
					foundDocs.push({ id: doc.id, score, matches, indexes });
				}
			}
		}

		for (const ast of assistants) {
			const parts = ast.fullName.toLowerCase().split(" ");
			if (parts.some((p: string) => isFuzzyMatch(word, p))) {
				let score = 1;
				let matches = 1;
				const indexes = [i];
				if (i + 1 < words.length && parts.some((p: string) => isFuzzyMatch(words[i + 1]!, p) && !isFuzzyMatch(word, p))) {
					score += 50;
					matches = 2;
					indexes.push(i + 1);
				}
				if (["ассистент", "медсестра", "с"].includes(prev)) score += 100;
				if (["пациент", "запиши", "записать", "к", "ко"].includes(prev)) score -= 100;

				const existing = foundAssists.find((d) => d.id === ast.id);
				if (!existing || existing.score < score) {
					if (existing) foundAssists.splice(foundAssists.indexOf(existing), 1);
					foundAssists.push({ id: ast.id, score, matches, indexes });
				}
			}
		}
	}

	foundDocs.sort((a, b) => b.score - a.score);
	foundAssists.sort((a, b) => b.score - a.score);
	return { foundDocs, foundAssists };
}
