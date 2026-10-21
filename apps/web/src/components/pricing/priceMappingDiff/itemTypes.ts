/**
 * DENTE Dental CRM — Types for Price List Mapping & 804n Nomenclature Diff
 * Layer 0: Data Contracts, Enums, and Item Models
 */

export type MappingConfidenceKind =
	| "exact_code"
	| "high_keyword"
	| "medium_keyword"
	| "low_keyword"
	| "fallback";

export type MappingSuggestedAction =
	| "create_new"
	| "update_existing"
	| "link_existing"
	| "identical";

export interface IngestedMappingItem {
	id: string;
	sourceLineNumber: number;
	rawLine: string;
	cleanedTitle: string;
	code804n: string;
	statutoryTitle804n: string;
	category: string;
	specialty: string;
	priceRub: number;
	priceKopecks: number;
	confidence: number;
	confidenceKind: MappingConfidenceKind;
	matchedExistingServiceId?: string | null | undefined;
	matchedExistingTitle?: string | null | undefined;
	matchedExistingPriceRub?: number | null | undefined;
	suggestedAction: MappingSuggestedAction;
	isApproved: boolean;
}

export interface ExistingCatalogReference {
	readonly id: string;
	readonly code?: string;
	readonly title: string;
	readonly basePriceRub?: number;
}

export type PriceMappingDiffFilterTab = "all" | "new" | "update" | "attention";

export interface PriceDiffStats {
	total: number;
	approvedCount: number;
	exactCount: number;
	newCount: number;
	updateCount: number;
	attentionCount: number;
	avgConfidence: number;
}
