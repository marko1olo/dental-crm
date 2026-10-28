import type { Chair, Dashboard, Patient, StaffMember } from "@dental/shared";
import { isFuzzyMatch } from "../stringUtils.js";
import { parsePatientDictationLocal } from "../smartPatientParser.js";
import type { AppointmentScheduleDraft, MatchScoreResult } from "./bookingParserTypes.js";

export function matchPatientsAndChairs(
	words: string[],
	patients: Patient[],
	chairs: Chair[],
): { foundPats: MatchScoreResult[]; foundChairs: MatchScoreResult[] } {
	const foundPats: MatchScoreResult[] = [];
	const foundChairs: MatchScoreResult[] = [];

	for (let i = 0; i < words.length; i++) {
		const word = words[i]!;
		if (word.length < 3 && !/^\d$/.test(word)) continue;
		const prev = (i > 0 ? words[i - 1] : "") ?? "";
		const prevPrev = (i > 1 ? words[i - 2] : "") ?? "";

		for (const pat of patients) {
			const parts = pat.fullName.toLowerCase().split(" ");
			if (parts.some((p: string) => isFuzzyMatch(word, p))) {
				let score = 1; let matches = 1; const indexes = [i];
				if (i + 1 < words.length && parts.some((p: string) => isFuzzyMatch(words[i + 1]!, p) && !isFuzzyMatch(word, p))) {
					score += 50; matches = 2; indexes.push(i + 1);
				}
				if (["запиши", "записать", "пациент", "пациента", "ребенка", "мальчика", "девочку"].includes(prev)) score += 200;
				if (["отмени", "удали", "перенеси"].includes(prev)) score += 200;
				if (["к", "ко"].includes(prev) || ["к", "ко"].includes(prevPrev)) score -= 200;

				const existing = foundPats.find((p) => p.id === pat.id);
				if (!existing || existing.score < score) {
					if (existing) foundPats.splice(foundPats.indexOf(existing), 1);
					foundPats.push({ id: pat.id, score, matches, indexes });
				}
			}
		}

		for (const chair of chairs) {
			if (!chair.active) continue;
			const parts = chair.name.toLowerCase().split(" ");
			if (parts.some((p: string) => isFuzzyMatch(word, p))) {
				let score = 1; const indexes = [i];
				if (["кресло", "кабинет"].includes(prev)) score += 100;
				const existing = foundChairs.find((c) => c.id === chair.id);
				if (!existing || existing.score < score) {
					if (existing) foundChairs.splice(foundChairs.indexOf(existing), 1);
					foundChairs.push({ id: chair.id, score, indexes });
				}
			}
		}
	}

	foundPats.sort((a, b) => b.score - a.score);
	foundChairs.sort((a, b) => b.score - a.score);
	return { foundPats, foundChairs };
}

export function resolveParticipants(
	foundDocs: MatchScoreResult[],
	foundPats: MatchScoreResult[],
	foundAssists: MatchScoreResult[],
	foundChairs: MatchScoreResult[],
): { doctorUserId?: string; patientId?: string; assistantUserId?: string; chairId?: string } {
	const res: { doctorUserId?: string; patientId?: string; assistantUserId?: string; chairId?: string } = {};
	const bestDoc = foundDocs[0];
	const bestPat = foundPats[0];

	if (bestDoc && bestPat && bestDoc.indexes.some((idx) => bestPat.indexes.includes(idx))) {
		if (bestDoc.score > bestPat.score) {
			res.doctorUserId = bestDoc.id;
			const otherPat = foundPats.find((p) => !p.indexes.some((idx) => bestDoc.indexes.includes(idx)));
			if (otherPat) res.patientId = otherPat.id;
		} else {
			res.patientId = bestPat.id;
			const otherDoc = foundDocs.find((d) => !d.indexes.some((idx) => bestPat.indexes.includes(idx)));
			if (otherDoc) res.doctorUserId = otherDoc.id;
		}
	} else {
		if (bestDoc && bestDoc.score >= 0) res.doctorUserId = bestDoc.id;
		if (bestPat && bestPat.score >= 0) res.patientId = bestPat.id;
	}

	const bestAssist = foundAssists[0];
	if (bestAssist && bestAssist.score >= 0) {
		if (!res.patientId || !bestAssist.indexes.some((idx) => bestPat?.indexes.includes(idx) || false)) {
			res.assistantUserId = bestAssist.id;
		}
	}

	const firstChair = foundChairs[0];
	if (foundChairs.length > 0 && firstChair?.id) res.chairId = firstChair.id;
	return res;
}

export function removeExtractedWords(text: string, wordsToRemove: string[]): string {
	let remaining = text;
	wordsToRemove.forEach((p) => {
		if (p.length > 3) {
			remaining = remaining.replace(new RegExp(`(?:^|[^а-яёa-z0-9])${p.substring(0, Math.max(3, p.length - 2))}[а-я]*`, "ig"), " ");
		} else {
			remaining = remaining.replace(new RegExp(`(?:^|[^а-яёa-z0-9])${p}(?:[^а-яёa-z0-9]|$)`, "ig"), " ");
		}
	});
	return remaining;
}
