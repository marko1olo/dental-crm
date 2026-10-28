import { db as defaultDb } from "../../../../../db/client.js";
import { cosineSimilarity } from "../../embeddingService.js";
import { computeDenseEmbeddingVector, parseClinicalHistoryQuery } from "../embeddingPipeline.js";
import type { MemoryMatchResult, PatientHistoryMemoryChunk, SearchPatientHistoryOptions } from "../types.js";
import type { RankedHistorySearchPayload } from "./retrieverTypes.js";
import { buildPatientHistoryMemoryIndex } from "./timelineSynthesizer.js";

export async function retrieveAndRankHistoryMatches(options: SearchPatientHistoryOptions): Promise<RankedHistorySearchPayload> {
	const topK = options.topK ?? 10;
	const parsedQuery = parseClinicalHistoryQuery(options.query);
	const queryVector = computeDenseEmbeddingVector(options.query);

	let chunks: PatientHistoryMemoryChunk[] = options.preloadedChunks ?? [];
	if (chunks.length === 0) {
		chunks = await buildPatientHistoryMemoryIndex(options.db ?? defaultDb, options.organizationId, options.patientId, { maxAgeYears: options.maxAgeYears ?? 5 });
	}

	const scoredMatches: MemoryMatchResult[] = [];
	for (const chunk of chunks) {
		if (options.categoryFilter && options.categoryFilter.length > 0 && !options.categoryFilter.includes(chunk.category)) continue;
		if (options.toothFilter !== undefined) {
			const matchesTooth = chunk.toothNumber === options.toothFilter || (chunk.toothCodes && chunk.toothCodes.includes(String(options.toothFilter)));
			if (!matchesTooth) continue;
		}

		const cosine = cosineSimilarity(queryVector, chunk.vector);
		let keywordOverlap = 0;
		const highlights: string[] = [];
		const chunkKeywordsSet = new Set(chunk.keywords);

		for (const qk of parsedQuery.extractedKeywords) {
			if (chunkKeywordsSet.has(qk)) {
				keywordOverlap += 1;
				highlights.push(qk);
			} else {
				for (const ck of chunkKeywordsSet) {
					if (ck.startsWith(qk) || qk.startsWith(ck)) {
						keywordOverlap += 0.7;
						highlights.push(ck);
						break;
					}
				}
			}
		}

		const keywordScore = parsedQuery.extractedKeywords.length > 0 ? Math.min(1, keywordOverlap / parsedQuery.extractedKeywords.length) : 0.5;
		let toothBoost = 0.5;
		if (parsedQuery.extractedTeeth.length > 0) {
			for (const queryTooth of parsedQuery.extractedTeeth) {
				if (chunk.toothNumber === queryTooth || (chunk.toothCodes && chunk.toothCodes.includes(String(queryTooth)))) {
					toothBoost = 1.0;
					highlights.push(`Зуб FDI ${queryTooth}`);
					break;
				}
			}
		} else toothBoost = 0.5;

		let categoryBoost = parsedQuery.targetCategory && chunk.category === parsedQuery.targetCategory ? 1.0 : 0.5;
		if (parsedQuery.targetYear !== undefined) {
			const chunkYear = new Date(chunk.date).getFullYear();
			if (!Number.isNaN(chunkYear) && chunkYear === parsedQuery.targetYear) categoryBoost += 0.3;
		}

		const compositeScore = Math.min(1, cosine * 0.4 + keywordScore * 0.3 + toothBoost * 0.2 + categoryBoost * 0.1);
		let relevance: "high" | "medium" | "low" = "low";
		if (compositeScore >= 0.55 || (toothBoost === 1.0 && compositeScore >= 0.45)) relevance = "high";
		else if (compositeScore >= 0.35) relevance = "medium";

		if (compositeScore >= 0.25) {
			scoredMatches.push({
				chunkId: chunk.id, category: chunk.category, score: Number(compositeScore.toFixed(3)),
				relevance, visitDate: chunk.date, toothNumber: chunk.toothNumber, doctorFullName: chunk.doctorFullName,
				diagnosis: chunk.diagnosisCode ? { code: chunk.diagnosisCode, title: chunk.diagnosisTitle } : undefined,
				materials: chunk.materials, anesthesia: chunk.anesthesia, complications: chunk.complications,
				summary: chunk.summary, highlights: Array.from(new Set(highlights)),
			});
		}
	}

	scoredMatches.sort((a, b) => {
		if (Math.abs(b.score - a.score) > 0.05) return b.score - a.score;
		return new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime();
	});

	return { parsedQuery, chunks, topMatches: scoredMatches.slice(0, topK) };
}
