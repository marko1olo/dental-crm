import type { DentalSpecialty, ServiceCatalogItem, ServiceCategory } from "../index.js";
import type { ColumnMappingConfig, PricelistVendorSignature } from "../clinical/pricelistBatchImport.js";
import type { MatchConfidenceKind } from "./matcher804n.js";

export type ScannedInputFormat = "tabular_excel" | "tabular_csv" | "unstructured_text";

export interface ScannedPriceItem {
	readonly id: string;
	readonly rowNumber: number; // 1-based
	readonly rawInput: string;
	readonly cleanedTitle: string;
	readonly code?: string | undefined;
	readonly code804n: string;
	readonly statutoryTitle804n: string;
	readonly category: ServiceCategory;
	readonly specialty: DentalSpecialty;
	readonly priceRub: number;
	readonly priceKopecks: number;
	readonly costRub?: number | undefined;
	readonly durationMinutes: number;
	readonly warrantyMonths?: number | undefined;
	readonly confidence: number;
	readonly confidenceKind: MatchConfidenceKind;
	readonly validationStatus: "valid" | "warning" | "error";
	readonly validationMessage?: string | undefined;
	readonly suggestedAction: "create_new" | "update_existing" | "identical";
	readonly matchedExistingServiceId?: string | null | undefined;
	readonly matchedExistingTitle?: string | null | undefined;
	readonly matchedExistingPriceRub?: number | null | undefined;
	isApproved: boolean;
}

export interface ScannedPricelistValidationError {
	readonly rowNumber: number;
	readonly field: string;
	readonly message: string;
	readonly rawInput?: string | undefined;
}

export interface ScannedPricelistSummary {
	readonly formatDetected: ScannedInputFormat;
	readonly vendorSignature?: PricelistVendorSignature | undefined;
	readonly vendorLabel?: string | undefined;
	readonly detectedMapping?: ColumnMappingConfig | undefined;
	readonly totalLinesOrRows: number;
	readonly recognizedItemsCount: number;
	readonly validItemsCount: number;
	readonly errorItemsCount: number;
	readonly exactCodesCount: number;
	readonly averageConfidence: number;
	readonly priceAccuracyRate: number; // 0..100%
	readonly categoryAccuracyRate: number; // 0..100%
	readonly stats: {
		readonly newCount: number;
		readonly updateCount: number;
		readonly identicalCount: number;
	};
}

export interface ScannedPricelistResult {
	readonly success: boolean;
	readonly items: readonly ScannedPriceItem[];
	readonly summary: ScannedPricelistSummary;
	readonly errors: readonly ScannedPricelistValidationError[];
	readonly warnings: readonly string[];
}

export interface ScanPricelistOptions {
	readonly customMapping?: Partial<ColumnMappingConfig> | undefined;
	readonly existingCatalog?: readonly ServiceCatalogItem[] | undefined;
	readonly forceFormat?: ScannedInputFormat | undefined;
}
