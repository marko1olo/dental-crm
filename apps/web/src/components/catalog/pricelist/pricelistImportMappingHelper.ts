import type { IngestedMappingItem } from "../../pricing/PriceListMappingDiffView";
import {
	type ParsedPriceProposal,
	rublesToKopecks,
} from "./servicePricelistEngine";
import type {
	DoctorSpecialty,
	Order804nCategory,
	ServicePricelistItem,
} from "./servicePricelistPresets";

export function mapProposalsToDiffItems(
	proposals: readonly ParsedPriceProposal[],
	existingItems: readonly ServicePricelistItem[],
): IngestedMappingItem[] {
	return proposals.map((p, idx): IngestedMappingItem => {
		const existingMatch = existingItems.find(
			(it) =>
				it.code804n === p.detectedCode804n ||
				it.commercialTitle.toLowerCase() === p.commercialTitle.toLowerCase(),
		);
		const numericConfidence =
			p.confidence === "exact_code"
				? 0.95
				: p.confidence === "keyword_match"
					? 0.8
					: 0.5;
		const kind =
			p.confidence === "exact_code"
				? "exact_code"
				: p.confidence === "keyword_match"
					? "high_keyword"
					: "fallback";

		return {
			id: `ingest-${idx}-${Date.now()}`,
			sourceLineNumber: idx + 1,
			rawLine: p.rawLine,
			cleanedTitle: p.commercialTitle,
			code804n: p.detectedCode804n || "A16.07.002",
			statutoryTitle804n: p.statutoryTitle804n || p.commercialTitle,
			category: p.suggestedCategory,
			specialty: p.suggestedSpecialty,
			priceRub: p.priceRub,
			priceKopecks: rublesToKopecks(p.priceRub),
			confidence: numericConfidence,
			confidenceKind: kind,
			matchedExistingServiceId: existingMatch ? existingMatch.id : undefined,
			matchedExistingTitle: existingMatch
				? existingMatch.commercialTitle
				: undefined,
			matchedExistingPriceRub: existingMatch
				? existingMatch.basePriceRub
				: undefined,
			suggestedAction: existingMatch ? "update_existing" : "create_new",
			isApproved: numericConfidence >= 0.7,
		};
	});
}

export function mergeApprovedDiffItems(
	approvedItems: readonly IngestedMappingItem[],
	existingCatalog: readonly ServicePricelistItem[],
): ServicePricelistItem[] {
	const result = [...existingCatalog];
	for (const m of approvedItems) {
		if (m.suggestedAction === "update_existing" && m.matchedExistingServiceId) {
			const idx = result.findIndex((i) => i.id === m.matchedExistingServiceId);
			if (idx !== -1) {
				const existing = result[idx];
				if (existing) {
					result[idx] = {
						...existing,
						basePriceRub: m.priceRub,
						basePriceKopecks: m.priceKopecks || rublesToKopecks(m.priceRub),
					};
				}
				continue;
			}
		}
		result.unshift({
			id: `srv-imp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
			code804n: m.code804n,
			commercialTitle: m.cleanedTitle,
			statutoryTitle804n: m.statutoryTitle804n,
			category: (m.category as Order804nCategory) || "therapy",
			specialty: (m.specialty as DoctorSpecialty) || "therapist",
			basePriceRub: m.priceRub,
			basePriceKopecks: m.priceKopecks || rublesToKopecks(m.priceRub),
			estimatedDurationMin: 30,
			icd10Indications: [],
			tags: [],
			vatRate: 0,
			vatExemptionArticle: "пп. 2 п. 2 ст. 149 НК РФ",
			isActive: true,
			isArchived: false,
		});
	}
	return result;
}
