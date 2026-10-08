/**
 * DENTE Dental CRM — Statutory Minzdrav Order № 804n Service Catalog & Nomenclature Presets
 *
 * Layer 0: Domain Types, Contracts & Statutory Nomenclature Links
 *
 * Statutory reference: Приказ Минздрава России от 13.10.2017 N 804н
 * "Об утверждении номенклатуры медицинских услуг" (с изменениями и дополнениями).
 */

export type Order804nCategory =
	| 'therapy'
	| 'surgery'
	| 'orthopedics'
	| 'orthodontics'
	| 'pediatric'
	| 'radiology'
	| 'hygiene'
	| 'periodontics'
	| 'anesthesia'
	| 'consultation'
	| 'package'
	| 'other';

export type DoctorSpecialty =
	| 'therapist'
	| 'surgeon'
	| 'orthopedist'
	| 'orthodontist'
	| 'pediatric'
	| 'hygienist'
	| 'radiologist'
	| 'anesthesiologist'
	| 'general';

export type PriceTierKind = 'standard' | 'vip' | 'dms' | 'promo' | 'night_weekend';

export interface ServicePricelistItem {
	readonly id: string;
	readonly code804n: string;
	readonly statutoryTitle804n: string;
	readonly commercialTitle: string;
	readonly category: Order804nCategory;
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

/**
 * Domain alias for clinical preset entries (Mandate 8e/8n autonomy)
 */
export type PricelistItemPreset = ServicePricelistItem;

/**
 * Group of clinical presets grouped by clinical workflow or category
 */
export interface PricelistPresetGroup {
	readonly id: string;
	readonly category: Order804nCategory;
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
	readonly category?: Order804nCategory;
	readonly specialty?: DoctorSpecialty;
	readonly maxPriceRub?: number;
}

/**
 * Result of matching presets
 */
export interface PresetMatchResult {
	readonly item: ServicePricelistItem;
	readonly score: number;
	readonly matchedBy: 'code' | 'icd10' | 'tooth' | 'complaint' | 'tag' | 'specialty';
	readonly matchReason: string;
}

/**
 * Statutory nomenclature cross-link
 */
export interface StatutoryNomenclatureLink {
	readonly code804n: string;
	readonly statutoryTitle: string;
	readonly commercialPresetId: string;
	readonly category: Order804nCategory;
}
