/**
 * DENTE Dental CRM — Statutory Service Catalog & Nomenclature
 *
 * Facade: Unstructured Price Text Parser
 */

import { CANONICAL_SERVICE_PRESETS } from "../servicePricelistPresets";
import {
	isSkippablePriceLine,
	extractCodeFromLine,
	extractPriceFromLine,
	cleanCommercialTitle,
} from "./unstructuredPriceLineExtractor";
import { classifyUnstructuredLine } from "./unstructuredPriceClassifier";
import type { ParsedPriceProposal } from "./types";

export * from "./unstructuredPriceLineExtractor";
export * from "./unstructuredPriceClassifier";
export * from "./unstructuredProposalConverter";

export function parseUnstructuredPriceText(
	rawText: string,
): readonly ParsedPriceProposal[] {
	if (!rawText || typeof rawText !== "string") return [];

	const lines = rawText.split(/\r?\n/);
	const results: ParsedPriceProposal[] = [];

	for (const rawLine of lines) {
		const line = rawLine.trim();
		if (isSkippablePriceLine(line)) continue;

		const detectedCode = extractCodeFromLine(line);
		const { priceRub, lineWithoutPrice } = extractPriceFromLine(line);
		const title = cleanCommercialTitle(lineWithoutPrice, detectedCode);
		if (!title || title.length < 2) continue;

		const { finalCode, category, specialty, confidence } = classifyUnstructuredLine(title, detectedCode);

		const matchedPreset = finalCode
			? CANONICAL_SERVICE_PRESETS.find(
					(p) => (p.statutoryCode || p.code804n).toUpperCase() === finalCode.toUpperCase(),
				)
			: undefined;

		const statutoryTitle = matchedPreset?.statutoryTitle || matchedPreset?.statutoryTitle804n;

		results.push({
			rawLine: line,
			commercialTitle: title,
			detectedCode: finalCode,
			detectedCode804n: finalCode,
			statutoryTitle,
			statutoryTitle804n: statutoryTitle,
			suggestedCategory: category,
			suggestedSpecialty: specialty,
			priceRub,
			confidence,
		});
	}

	return results;
}
