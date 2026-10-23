/**
 * DENTE Dental CRM — Statutory Service Catalog & Nomenclature
 *
 * Convert Parsed Proposal to ServicePricelistItem
 */

import type { ServicePricelistItem } from "../servicePricelistPresets";
import { rublesToKopecks } from "./currencyMath";
import type { ParsedPriceProposal } from "./types";

export function proposalToPricelistItem(
	proposal: ParsedPriceProposal,
): ServicePricelistItem {
	const idSuffix =
		typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
			? crypto.randomUUID().slice(0, 8)
			: Date.now().toString(36);
	const code = proposal.detectedCode || proposal.detectedCode804n;
	const statTitle = proposal.statutoryTitle || proposal.statutoryTitle804n || proposal.commercialTitle;
	return {
		id: `srv-imp-${Date.now()}-${idSuffix}`,
		statutoryCode: code,
		code804n: code,
		commercialTitle: proposal.commercialTitle,
		statutoryTitle: statTitle,
		statutoryTitle804n: statTitle,
		category: proposal.suggestedCategory,
		specialty: proposal.suggestedSpecialty,
		basePriceRub: proposal.priceRub,
		basePriceKopecks: rublesToKopecks(proposal.priceRub),
		estimatedDurationMin: 30,
		icd10Indications: [],
		vatRate: 0,
		vatExemptionArticle: "пп. 2 п. 2 ст. 149 НК РФ",
		isActive: true,
		isArchived: false,
		tags: ["умный_импорт"],
	};
}
