/**
 * types.ts — Type definitions, interfaces, and constants for Clinical RAG Knowledge Store.
 */

export type KnowledgeCategory =
	| "price_804n"
	| "clinical_protocol"
	| "guarantee"
	| "sanpin"
	| "faq";

export interface KnowledgeItem {
	readonly id: string;
	readonly organizationId: string;
	readonly category: KnowledgeCategory;
	readonly title: string;
	readonly content: string;
	readonly code804n?: string | undefined;
	readonly icd10Code?: string | undefined;
	readonly priceRub?: number | undefined;
	readonly durationMinutes?: number | undefined;
	readonly metadata?: Record<string, unknown> | undefined;
	readonly embedding: readonly number[];
	readonly stems: ReadonlySet<string>;
	readonly updatedAt: string;
}

export interface KnowledgeItemInput {
	readonly id?: string | undefined;
	readonly organizationId: string;
	readonly category: KnowledgeCategory;
	readonly title: string;
	readonly content: string;
	readonly code804n?: string | undefined;
	readonly icd10Code?: string | undefined;
	readonly priceRub?: number | undefined;
	readonly durationMinutes?: number | undefined;
	readonly metadata?: Record<string, unknown> | undefined;
	readonly embedding?: readonly number[] | undefined;
}

export interface KnowledgeSearchResult {
	readonly item: KnowledgeItem;
	readonly score: number;
}

export interface PriceGroundingResult {
	readonly found: boolean;
	readonly matchedService?: KnowledgeItem | undefined;
	readonly score: number;
	readonly priceRub?: number | undefined;
	readonly code804n?: string | undefined;
	readonly message: string;
}

export interface KnowledgeSearchOptions {
	readonly organizationId: string;
	readonly category?: KnowledgeCategory | undefined;
	readonly limit?: number | undefined;
	readonly threshold?: number | undefined;
	readonly queryVector?: readonly number[] | undefined;
}

export interface SemanticCluster {
	readonly name: string;
	readonly keywords: readonly string[];
	readonly dimStart: number;
	readonly dimEnd: number;
	readonly weight: number;
}

export const VECTOR_DIMENSION = 256;
export const DEFAULT_SIMILARITY_THRESHOLD = 0.75;
export const PRICE_NOT_FOUND_MESSAGE = "Услуга не найдена в официальном прайсе клиники";
