/**
 * DENTE Dental CRM — Service Catalog & Pricing Presets
 *
 * Layer 0: Domain Types, Contracts & Nomenclature Links
 */

export type ServiceCategory =
	| "therapy"
	| "surgery"
	| "orthopedics"
	| "orthodontics"
	| "pediatric"
	| "radiology"
	| "hygiene"
	| "periodontics"
	| "anesthesia"
	| "consultation"
	| "package"
	| "other";

/** Backwards-compatible alias for Mandate 8x/8ap */
export type Order804nCategory = ServiceCategory;

export type DoctorSpecialty =
	| "therapist"
	| "surgeon"
	| "orthopedist"
	| "orthodontist"
	| "pediatric"
	| "hygienist"
	| "radiologist"
	| "anesthesiologist"
	| "general";

export type PriceTierKind =
	| "standard"
	| "vip"
	| "dms"
	| "promo"
	| "night_weekend";

export interface ServicePricelistItem {
	readonly id: string;
	readonly statutoryCode?: string;
	/** Backwards-compatible alias */
	readonly code804n: string;
	readonly statutoryTitle?: string;
	/** Backwards-compatible alias */
	readonly statutoryTitle804n: string;
	readonly commercialTitle: string;
	readonly category: ServiceCategory;
	readonly specialty: DoctorSpecialty;
	readonly basePriceRub: number;
	readonly basePriceKopecks: number;
	readonly materialCostRub?: number | undefined;
	readonly labCostRub?: number | undefined;
	readonly tierPrices?: Partial<Record<PriceTierKind, number>> | undefined;
	readonly vatRate: 0;
	readonly vatExemptionArticle: string;
	readonly icd10Indications: readonly string[];
	readonly estimatedDurationMin: number;
	readonly isAnatomicalCanalScalable?: boolean | undefined;
	readonly isClinicPackage?: boolean | undefined;
	readonly isActive: boolean;
	readonly isArchived: boolean;
	readonly tags: readonly string[];
}

export type {
	PricelistItemPreset,
	PricelistPresetGroup,
	PresetMatcherCriteria,
	PresetMatchResult,
	StatutoryNomenclatureLink,
} from "./presetMatcherTypes";
