/**
 * packages/shared/src/pricelist/order804n/types.ts
 * Layer 0: Contracts, DTOs & Interfaces for Minzdrav Order 804n Statutory Nomenclature.
 *
 * Implements Mandates 8b, 8c, 8e, 8l, 8n, 8s, 8t, 8z.
 * Pure Layer 0 types with 0 runtime side-effects.
 */

import type { DentalSpecialty, ServiceCategory } from "../../schemas/aiAndEgiszSchemas.js";

/**
 * Canonical entry in the statutory Order 804n nomenclature classifier.
 */
export interface StatutoryNomenclatureEntry {
	readonly code: string;
	readonly title: string;
	readonly category: ServiceCategory;
	readonly specialty: DentalSpecialty;
	readonly primaryKeywords: readonly RegExp[];
	readonly secondaryKeywords: readonly RegExp[];
	readonly defaultPriceRub: number;
	readonly defaultDurationMinutes: number;
	readonly taxDeductible: boolean;
}

/**
 * Standard Order 804n service item used across templates, EMR, and fiscal receipts.
 */
export interface Order804nServiceItem {
	readonly code: string;
	readonly nameRu?: string;
	readonly title?: string;
	readonly isMandatory?: boolean;
	readonly defaultQuantity?: number;
	readonly priceKopecks?: number;
	readonly defaultPriceRub?: number;
	readonly category?: ServiceCategory;
	readonly specialty?: DentalSpecialty;
	readonly taxDeductible?: boolean;
}

/**
 * Filter and tuning options for statutory 804n nomenclature search.
 */
export interface Order804nSearchOptions {
	readonly categoryFilter?: ServiceCategory | readonly ServiceCategory[];
	readonly specialtyFilter?: DentalSpecialty | readonly DentalSpecialty[];
	readonly maxResults?: number;
	readonly threshold?: number;
	readonly codeHint?: string;
}

/**
 * Match result from search804nRegistry.
 */
export interface Order804nSearchResult {
	readonly entry: StatutoryNomenclatureEntry;
	readonly score: number;
	readonly matchType: "exact_code" | "prefix_code" | "primary_keyword" | "secondary_keyword" | "fuzzy";
	readonly matchedTerm?: string | undefined;
}

/**
 * Validation result for Minzdrav Order 804n codes.
 */
export interface Order804nValidationResult {
	readonly isValid: boolean;
	readonly normalizedCode: string;
	readonly entry?: StatutoryNomenclatureEntry;
	readonly error?: string;
}

/**
 * Service category summary for 804n reporting and analytics.
 */
export interface Order804nCategorySummary {
	readonly category: ServiceCategory;
	readonly count: number;
	readonly totalAveragePriceRub: number;
}
