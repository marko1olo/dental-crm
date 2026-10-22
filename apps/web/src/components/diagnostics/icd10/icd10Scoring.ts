import type { DentalIcd10Item } from "../icd10DentalCatalog";
import { levenshteinDistance } from "./icd10Levenshtein";

export const ICD10_STOP_WORDS = new Set([
	"пациент", "жалуется", "жалобы", "жалоба", "на", "в", "во", "области", "область",
	"характера", "характер", "от", "и", "с", "со", "по", "для", "при", "после",
	"дня", "дней", "зуб", "зуба", "зубов", "полости", "рта", "также", "отмечает",
	"анамнез", "осмотр", "обнаружено", "обнаружена", "клиника", "симптомы",
]);

export interface TextMatchResult {
	readonly score: number;
	readonly matchedTerms: string[];
}

export function calculateItemTextScore(
	item: DentalIcd10Item,
	queryWords: readonly string[],
): TextMatchResult {
	if (queryWords.length === 0) {
		return { score: 0, matchedTerms: [] };
	}

	const itemTitleLower = item.titleRu.toLowerCase();
	const itemShortLower = item.shortTitleRu.toLowerCase();
	const itemDescLower = item.description.toLowerCase();

	let wordsMatchedCount = 0;
	let wordScoreAccumulator = 0;
	const matchedTerms: string[] = [];

	for (const qWord of queryWords) {
		let wordMatched = false;

		// Проверка точного вхождения слова в название
		if (itemTitleLower.includes(qWord) || itemShortLower.includes(qWord)) {
			wordMatched = true;
			wordScoreAccumulator += qWord.length >= 4 ? 300 : 150;
			if (itemShortLower.startsWith(qWord) || itemTitleLower.startsWith(qWord)) {
				wordScoreAccumulator += 100;
			}
			matchedTerms.push(qWord);
		}

		// Проверка совпадения со списком синонимов
		for (const syn of item.synonyms) {
			const synLower = syn.toLowerCase();
			if (synLower.includes(qWord)) {
				wordMatched = true;
				wordScoreAccumulator += 250;
				if (synLower === qWord || synLower.startsWith(qWord)) {
					wordScoreAccumulator += 150;
				}
				matchedTerms.push(qWord);
				break;
			}
		}

		// Проверка описания
		if (!wordMatched && itemDescLower.includes(qWord)) {
			wordMatched = true;
			wordScoreAccumulator += 120;
			matchedTerms.push(qWord);
		}

		// Нечеткий поиск (Fuzzy Levenshtein) для опечаток при длине слова >= 4
		if (!wordMatched && qWord.length >= 4) {
			const candidateWords = [
				...itemTitleLower.split(/[\s,()/-]+/),
				...itemShortLower.split(/[\s,()/-]+/),
				...item.synonyms.flatMap((s) => s.toLowerCase().split(/[\s,()/-]+/)),
			];

			for (const cWord of candidateWords) {
				if (Math.abs(cWord.length - qWord.length) <= 2) {
					const dist = levenshteinDistance(qWord, cWord);
					const maxAllowedDist = qWord.length >= 6 ? 2 : 1;
					if (dist <= maxAllowedDist) {
						wordMatched = true;
						wordScoreAccumulator += 150 - dist * 40;
						matchedTerms.push(qWord);
						break;
					}
				}
			}
		}

		if (wordMatched) {
			wordsMatchedCount++;
		}
	}

	let score = 0;
	if (wordsMatchedCount === queryWords.length && queryWords.length > 0) {
		score = wordScoreAccumulator + 500;
	} else if (wordsMatchedCount > 0) {
		const matchRatio = wordsMatchedCount / queryWords.length;
		score = wordScoreAccumulator * (0.5 + 0.5 * matchRatio);
	}

	return { score, matchedTerms };
}
