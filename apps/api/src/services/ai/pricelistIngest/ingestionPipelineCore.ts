/**
 * DENTE Dental CRM — Core Ingestion Pipeline & Catalog Cross-Referencing Engine
 * Layer 2: Orchestration Pipeline Core & Catalog Reconciliation
 */

import { parseKopecks, type ServiceCatalogItem } from "@dental/shared";
import type {
	PriceListSuggestedAction,
	IngestedPriceProposal,
	PriceListIngestionRequest,
	PriceListIngestionResponse,
	PriceListIngestionStats,
} from "./types.js";
import { extractLinesFromPriceList, extractPriceAndTitleFromLine } from "./documentTabularParser.js";
import { matchOrder804nNomenclature } from "./nomenclature804nMatcher.js";

// =============================================================================
// CLINIC CATALOG CROSS-REFERENCING ENGINE
// =============================================================================

/**
 * Cross-references an ingested item against the existing clinic database services.
 */
export function crossReferenceWithExistingCatalog(
	proposalCode: string,
	proposalTitle: string,
	proposalPriceRub: number,
	existingItems: readonly ServiceCatalogItem[],
): {
	matchedExistingServiceId?: string | null;
	matchedExistingTitle?: string | null;
	matchedExistingPriceRub?: number | null;
	suggestedAction: PriceListSuggestedAction;
} {
	if (!existingItems || existingItems.length === 0) {
		return {
			matchedExistingServiceId: null,
			matchedExistingTitle: null,
			matchedExistingPriceRub: null,
			suggestedAction: "create_new",
		};
	}

	const normTitle = proposalTitle.toLowerCase().trim();

	// 1. Exact title or code match
	const exactMatch = existingItems.find(
		(it) => it.title.toLowerCase().trim() === normTitle || (Boolean(it.code) && it.code === proposalCode),
	);

	if (exactMatch) {
		const existingPrice = exactMatch.basePriceRub ?? 0;
		const priceMatches = parseKopecks(existingPrice) === parseKopecks(proposalPriceRub);

		return {
			matchedExistingServiceId: exactMatch.id,
			matchedExistingTitle: exactMatch.title,
			matchedExistingPriceRub: existingPrice,
			suggestedAction: priceMatches ? "identical" : "update_existing",
		};
	}

	// 2. Fuzzy substring match (high similarity)
	const fuzzyMatch = existingItems.find((it) => {
		const existingNorm = it.title.toLowerCase().trim();
		return (
			existingNorm.includes(normTitle) ||
			normTitle.includes(existingNorm) ||
			(existingNorm.length > 8 && normTitle.slice(0, 8) === existingNorm.slice(0, 8))
		);
	});

	if (fuzzyMatch) {
		return {
			matchedExistingServiceId: fuzzyMatch.id,
			matchedExistingTitle: fuzzyMatch.title,
			matchedExistingPriceRub: fuzzyMatch.basePriceRub,
			suggestedAction: "link_existing",
		};
	}

	return {
		matchedExistingServiceId: null,
		matchedExistingTitle: null,
		matchedExistingPriceRub: null,
		suggestedAction: "create_new",
	};
}

// =============================================================================
// CORE INGESTION SERVICE PIPELINE
// =============================================================================

/**
 * Main ingestion entrypoint: takes raw price list content, parses lines,
 * extracts prices with kopecks, maps Order 804n nomenclature, cross-references
 * with existing clinic catalog, and produces the verified proposals list.
 */
export async function ingestPriceList(
	request: PriceListIngestionRequest,
	existingCatalog: readonly ServiceCatalogItem[] = [],
): Promise<PriceListIngestionResponse> {
	const rawLines = extractLinesFromPriceList(request.rawContent, request.sourceType);
	const proposals: IngestedPriceProposal[] = [];
	const warnings: string[] = [];

	let exactCodesCount = 0;
	let newServicesCount = 0;
	let updateServicesCount = 0;
	let identicalCount = 0;
	let totalConfidence = 0;

	let lineNumber = 0;
	for (const rawLine of rawLines) {
		lineNumber++;

		// 1. Extract price & title
		const priceInfo = extractPriceAndTitleFromLine(rawLine);
		const cleanedTitle = priceInfo.cleanTitleWithoutPrice;

		if (!cleanedTitle || cleanedTitle.length < 2) {
			continue;
		}

		// 2. Semantic matching with 804n
		const match = matchOrder804nNomenclature(rawLine, cleanedTitle);

		// 3. Cross-reference with existing clinic catalog
		const catalogRef = crossReferenceWithExistingCatalog(
			match.code804n,
			cleanedTitle,
			priceInfo.priceRub,
			existingCatalog,
		);

		if (match.confidenceKind === "exact_code") exactCodesCount++;
		if (catalogRef.suggestedAction === "create_new") newServicesCount++;
		if (catalogRef.suggestedAction === "update_existing") updateServicesCount++;
		if (catalogRef.suggestedAction === "identical") identicalCount++;

		totalConfidence += match.confidence;

		const proposal: IngestedPriceProposal = {
			id: `ingest-item-${lineNumber}-${Date.now().toString(36)}`,
			sourceLineNumber: lineNumber,
			rawLine,
			cleanedTitle: match.cleanedTitle,
			code804n: match.code804n,
			statutoryTitle804n: match.statutoryTitle804n,
			category: match.category,
			specialty: match.specialty,
			priceRub: priceInfo.priceRub,
			priceKopecks: priceInfo.priceKopecks,
			confidence: Math.round(match.confidence * 100) / 100,
			confidenceKind: match.confidenceKind,
			matchedExistingServiceId: catalogRef.matchedExistingServiceId,
			matchedExistingTitle: catalogRef.matchedExistingTitle,
			matchedExistingPriceRub: catalogRef.matchedExistingPriceRub,
			suggestedAction: catalogRef.suggestedAction,
			isApproved: true,
		};

		proposals.push(proposal);
	}

	if (proposals.length === 0) {
		warnings.push("Не удалось распознать ни одной строки прейскуранта с услугами и ценами.");
	}

	const recognizedCount = proposals.length;
	const averageConfidence = recognizedCount > 0 ? Math.round((totalConfidence / recognizedCount) * 100) / 100 : 0;

	const stats: PriceListIngestionStats = {
		totalLines: rawLines.length,
		recognizedCount,
		exactCodesCount,
		newServicesCount,
		updateServicesCount,
		identicalCount,
		averageConfidence,
	};

	return {
		success: proposals.length > 0,
		proposals,
		stats,
		warnings,
	};
}
