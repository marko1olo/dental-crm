import { DENTAL_ICD10_CATALOG, type DentalIcd10Item } from "../icd10DentalCatalog";
import type { Icd10SearchOptions, Icd10SearchResult } from "./icd10Types";
import { parseQuery } from "./icd10QueryParser";
import { ICD10_STOP_WORDS, calculateItemTextScore } from "./icd10Scoring";

function filterCatalog(catalog: readonly DentalIcd10Item[], options: Icd10SearchOptions): DentalIcd10Item[] {
	let res = [...catalog];
	if (options.specialty) {
		res = res.filter((item) => item.specialty === options.specialty);
	}
	if (options.rubric) {
		const normalizedRubric = options.rubric.toUpperCase().replace(/^К/, "K");
		res = res.filter((item) => item.rubric === normalizedRubric);
	}
	if (options.severity) {
		res = res.filter((item) => item.severity === options.severity);
	}
	if (options.requiresToothOnly) {
		res = res.filter((item) => item.requiresTooth);
	}
	return res;
}

export function search(rawQuery: string, options: Icd10SearchOptions = {}): Icd10SearchResult[] {
	const parsed = parseQuery(rawQuery);
	const query = parsed.cleanedQuery.toLowerCase();
	const codeCandidate = parsed.normalizedCodeCandidate;
	const activeTooth = options.selectedToothNumber ?? parsed.extractedToothNumber;
	const limit = options.limit ?? 50;

	const catalog = filterCatalog(DENTAL_ICD10_CATALOG, options);

	if (!query && !codeCandidate) {
		return catalog
			.map((item) => {
				let score = item.popular ? 100 : 50;
				if (activeTooth && item.requiresTooth) score += 20;
				return { item, score, matchedBy: "title" as const, highlightedTerms: [] };
			})
			.sort((a, b) => b.score - a.score)
			.slice(0, limit);
	}

	const rawWords = query.split(/[\s,.;:!?()/-]+/).filter((w) => w.length > 0);
	const filteredWords = rawWords.filter((w) => !ICD10_STOP_WORDS.has(w));
	const queryWords = filteredWords.length > 0 ? filteredWords : rawWords;
	const results: Icd10SearchResult[] = [];

	for (const item of catalog) {
		let maxScore = 0;
		let matchedBy: Icd10SearchResult["matchedBy"] = "fuzzy";
		const matchedTerms: string[] = [];

		const itemCodeNorm = item.code.toUpperCase();
		const itemRubricNorm = item.rubric.toUpperCase();

		if (codeCandidate) {
			if (itemCodeNorm === codeCandidate) {
				maxScore = 2000;
				matchedBy = "code";
				matchedTerms.push(item.code);
			} else if (itemCodeNorm.startsWith(codeCandidate)) {
				maxScore = 1500;
				matchedBy = "code";
				matchedTerms.push(item.code);
			} else if (itemRubricNorm === codeCandidate || itemRubricNorm === codeCandidate.slice(0, 3)) {
				maxScore = 800;
				matchedBy = "rubric";
				matchedTerms.push(item.rubric);
			}
		}

		if (itemCodeNorm.toLowerCase().includes(query)) {
			const codeScore = 1200 + (itemCodeNorm.toLowerCase() === query ? 500 : 0);
			if (codeScore > maxScore) {
				maxScore = codeScore;
				matchedBy = "code";
				matchedTerms.push(item.code);
			}
		}

		const textMatch = calculateItemTextScore(item, queryWords);
		if (textMatch.score > maxScore) {
			maxScore = textMatch.score;
			matchedBy = matchedBy === "code" ? "code" : "title";
			matchedTerms.push(...textMatch.matchedTerms);
		}

		if (maxScore > 0) {
			if (item.popular) maxScore += 40;
			if (activeTooth && item.requiresTooth) maxScore += 60;
			if ((item.severity === "critical" || item.severity === "high") && /(остр|бол|гной|пульп|ночн|срочн|приступ)/i.test(query)) {
				maxScore += 150;
			}
			results.push({
				item,
				score: Math.round(maxScore),
				matchedBy,
				highlightedTerms: Array.from(new Set(matchedTerms)),
			});
		}
	}

	return results.sort((a, b) => b.score - a.score).slice(0, limit);
}
