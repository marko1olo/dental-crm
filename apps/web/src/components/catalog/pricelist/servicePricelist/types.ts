import type {
	DoctorSpecialty,
	Order804nCategory,
	PriceTierKind,
	ServicePricelistItem,
} from '../servicePricelistPresets';

// =============================================================================
// LAYER 0: DOMAIN TYPES & INTERFACES FOR SERVICE PRICELIST ENGINE
// =============================================================================

export type ProfitabilityLevel = 'high' | 'medium' | 'low' | 'loss';

export interface ServiceProfitability {
	readonly sellingPriceRub: number;
	readonly materialCostRub: number;
	readonly labCostRub: number;
	readonly totalCostRub: number;
	readonly grossProfitRub: number;
	readonly grossProfitKopecks: number;
	readonly marginPercent: number;
	readonly markupPercent: number;
	readonly level: ProfitabilityLevel;
}

export type PriceRoundingMode = 'none' | 'round_10' | 'round_50' | 'round_100' | 'round_500';

export interface BatchMarkupOptions {
	readonly percentChange?: number | undefined; // e.g. +5, +10, -5
	readonly fixedRubChange?: number | undefined; // e.g. +200, -500
	readonly roundMode?: PriceRoundingMode | undefined;
	readonly categoryFilter?: Order804nCategory | 'all' | undefined;
	readonly specialtyFilter?: DoctorSpecialty | 'all' | undefined;
	readonly targetItemIds?: readonly string[] | undefined;
	readonly applyToTiers?: readonly PriceTierKind[] | undefined;
}

export interface SearchPricelistQuery {
	readonly searchTerm?: string | undefined;
	readonly category?: Order804nCategory | 'all' | undefined;
	readonly specialty?: DoctorSpecialty | 'all' | undefined;
	readonly includeArchived?: boolean | undefined;
	readonly minPriceRub?: number | undefined;
	readonly maxPriceRub?: number | undefined;
	readonly profitabilityLevel?: ProfitabilityLevel | 'all' | undefined;
}

export interface CsvExportOptions {
	readonly delimiter?: ';' | ',' | undefined;
}

export interface CsvRowError {
	readonly rowIndex: number;
	readonly code804n?: string | undefined;
	readonly title?: string | undefined;
	readonly error: string;
}

export interface CsvImportResult {
	readonly validItems: readonly ServicePricelistItem[];
	readonly invalidRows: readonly CsvRowError[];
	readonly totalRows: number;
}

export interface ClinicPricelistPrintInfo {
	readonly clinicName: string;
	readonly clinicAddress: string;
	readonly clinicPhone: string;
	readonly clinicLicense: string;
	readonly chiefDoctorName: string;
	readonly effectiveDateRu: string;
	readonly inn?: string | undefined;
	readonly ogrn?: string | undefined;
	readonly isConsumerCornerStand?: boolean | undefined;
}

export interface ParsedPriceProposal {
	readonly rawLine: string;
	readonly commercialTitle: string;
	readonly detectedCode804n: string;
	readonly statutoryTitle804n?: string | undefined;
	readonly suggestedCategory: Order804nCategory;
	readonly suggestedSpecialty: DoctorSpecialty;
	readonly priceRub: number;
	readonly confidence: 'exact_code' | 'keyword_match' | 'fallback';
}

export type PricelistSortField = 'code' | 'title' | 'price' | 'margin' | 'duration';
export type PricelistSortDirection = 'asc' | 'desc';
