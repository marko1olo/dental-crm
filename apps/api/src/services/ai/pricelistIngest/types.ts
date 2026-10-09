/**
 * DENTE Dental CRM — Price List Ingestion Data Contracts & Types
 * Layer 0: Contracts, Schemas, DTOs (0 runtime dependencies outside Zod)
 */

import { z } from "zod";

// =============================================================================
// SCHEMAS & DATA CONTRACTS
// =============================================================================

export const priceListIngestSourceTypeSchema = z.enum([
	"text",
	"csv",
	"word_extracted",
	"pdf_extracted",
	"ocr_scan",
]);
export type PriceListIngestSourceType = z.infer<typeof priceListIngestSourceTypeSchema>;

export const priceListConfidenceKindSchema = z.enum([
	"exact_code",
	"high_keyword",
	"medium_keyword",
	"low_keyword",
	"fallback",
]);
export type PriceListConfidenceKind = z.infer<typeof priceListConfidenceKindSchema>;

export const priceListSuggestedActionSchema = z.enum([
	"create_new",
	"update_existing",
	"link_existing",
	"identical",
]);
export type PriceListSuggestedAction = z.infer<typeof priceListSuggestedActionSchema>;

export const ingestedPriceProposalSchema = z.object({
	id: z.string(),
	sourceLineNumber: z.number().int().positive(),
	rawLine: z.string(),
	cleanedTitle: z.string(),
	code804n: z.string(),
	statutoryTitle804n: z.string(),
	category: z.string(),
	specialty: z.string(),
	priceRub: z.number().nonnegative(),
	priceKopecks: z.number().int().nonnegative(),
	confidence: z.number().min(0).max(1),
	confidenceKind: priceListConfidenceKindSchema,
	matchedExistingServiceId: z.string().nullable().optional(),
	matchedExistingTitle: z.string().nullable().optional(),
	matchedExistingPriceRub: z.number().nullable().optional(),
	suggestedAction: priceListSuggestedActionSchema,
	isApproved: z.boolean().default(true),
});
export type IngestedPriceProposal = z.infer<typeof ingestedPriceProposalSchema>;

export const priceListIngestionRequestSchema = z.object({
	rawContent: z.string().min(1, "Передайте текст или содержимое файла прейскуранта"),
	sourceType: priceListIngestSourceTypeSchema.default("text"),
	filename: z.string().optional(),
	commit: z.boolean().default(false),
	approvedItems: z.array(ingestedPriceProposalSchema).optional(),
});
export type PriceListIngestionRequest = z.infer<typeof priceListIngestionRequestSchema>;

export const priceListIngestionStatsSchema = z.object({
	totalLines: z.number().int().nonnegative(),
	recognizedCount: z.number().int().nonnegative(),
	exactCodesCount: z.number().int().nonnegative(),
	newServicesCount: z.number().int().nonnegative(),
	updateServicesCount: z.number().int().nonnegative(),
	identicalCount: z.number().int().nonnegative(),
	averageConfidence: z.number().min(0).max(1),
});
export type PriceListIngestionStats = z.infer<typeof priceListIngestionStatsSchema>;

export const priceListIngestionResponseSchema = z.object({
	success: z.boolean(),
	proposals: z.array(ingestedPriceProposalSchema),
	stats: priceListIngestionStatsSchema,
	warnings: z.array(z.string()),
	committedCount: z.number().int().nonnegative().optional(),
});
export type PriceListIngestionResponse = z.infer<typeof priceListIngestionResponseSchema>;

export interface StatutoryNomenclatureEntry {
	readonly code: string;
	readonly title: string;
	readonly category: string;
	readonly specialty: string;
	readonly primaryKeywords: readonly RegExp[];
	readonly secondaryKeywords: readonly RegExp[];
	readonly defaultPriceRub?: number;
}

export interface ExtractedPriceInfo {
	readonly priceRub: number;
	readonly priceKopecks: number;
	readonly rawPriceString: string;
	readonly cleanTitleWithoutPrice: string;
}

export interface NomenclatureMatchResult {
	readonly code804n: string;
	readonly statutoryTitle804n: string;
	readonly category: string;
	readonly specialty: string;
	readonly confidence: number;
	readonly confidenceKind: PriceListConfidenceKind;
	readonly cleanedTitle: string;
}

export interface RawPricelistRow {
	readonly lineNumber: number;
	readonly rawText: string;
	readonly cleanTitle?: string;
	readonly priceRub?: number;
	readonly priceKopecks?: number;
}
