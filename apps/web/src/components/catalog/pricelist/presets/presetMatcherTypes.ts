/**
 * DENTE Dental CRM — Service Catalog & Pricing Presets
 *
 * Layer 0: Clinical Preset Grouping & Matcher Contracts
 */

import type {
	DoctorSpecialty,
	PriceTierKind,
	ServiceCategory,
	ServicePricelistItem,
} from "./types";

/**
 * Domain alias for clinical preset entries (Mandate 8e/8n autonomy)
 */
export type PricelistItemPreset = ServicePricelistItem;

/**
 * Group of clinical presets grouped by clinical workflow or category
 */
export interface PricelistPresetGroup {
	readonly id: string;
	readonly category: ServiceCategory;
	readonly specialty: DoctorSpecialty;
	readonly title: string;
	readonly description?: string;
	readonly items: readonly ServicePricelistItem[];
}

/**
 * Query criteria for auto-matching clinical services
 */
export interface PresetMatcherCriteria {
	readonly complaintText?: string;
	readonly icd10Code?: string;
	readonly toothNumber?: number;
	readonly canalCount?: number;
	readonly category?: ServiceCategory;
	readonly specialty?: DoctorSpecialty;
	readonly maxPriceRub?: number;
}

/**
 * Result of matching presets
 */
export interface PresetMatchResult {
	readonly item: ServicePricelistItem;
	readonly score: number;
	readonly matchedBy:
		| "code"
		| "icd10"
		| "tooth"
		| "complaint"
		| "tag"
		| "specialty";
	readonly matchReason: string;
}

/**
 * Statutory nomenclature cross-link
 */
export interface StatutoryNomenclatureLink {
	readonly statutoryCode: string;
	readonly code804n?: string;
	readonly statutoryTitle: string;
	readonly commercialPresetId: string;
	readonly category: ServiceCategory;
}
