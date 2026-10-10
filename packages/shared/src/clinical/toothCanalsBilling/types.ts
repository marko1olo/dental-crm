/**
 * DENTE Dental CRM — Anatomical Root Canals & Minzdrav Order 804n Types
 * Layer 0: Pure Data Contracts & Type Definitions
 */

import type { Kopecks } from "../../utils/money.js";
import type { ToothSurface } from "../../documents/forms043u.js";

export type AnatomicalCanalCount = 1 | 2 | 3 | 4;

export type ToothCanalVariation =
	| "MB2"
	| "radix_entomolaris"
	| "c_shaped"
	| "lateral_canal"
	| "standard";

export interface ToothCanalConfig {
	readonly fdiNumber: number;
	readonly defaultCanals: AnatomicalCanalCount;
	readonly isPrimary: boolean;
	readonly isMultiRooted: boolean;
	readonly commonVariations?: readonly ToothCanalVariation[];
	readonly descriptionRu: string;
}

export interface Order804nEndoItem {
	readonly code: string;
	readonly title: string;
	readonly category: string;
	readonly price: number;
	readonly canalCount: AnatomicalCanalCount;
}

export interface EndodonticOrder804nPair {
	readonly canalCount: AnatomicalCanalCount;
	readonly instrumentation: Order804nEndoItem;
	readonly obturation: Order804nEndoItem;
	readonly combinedPrice: number;
}

export interface EndodonticFullTreatmentPlanItem {
	readonly fdiNumber: number;
	readonly isMultiRooted: boolean;
	readonly canalCount: AnatomicalCanalCount;
	readonly instrumentation: Order804nEndoItem;
	readonly obturation: Order804nEndoItem;
	readonly medication?: Order804nEndoItem | undefined;
	readonly totalCompositePrice: number;
}

export interface Order804nBillingLineItem {
	readonly code: string;
	readonly title: string;
	readonly category: string;
	readonly priceRub: number;
	readonly priceKopecks: Kopecks;
	readonly quantity: number;
	readonly totalRub: number;
	readonly totalKopecks: Kopecks;
	readonly totalPriceKopecks?: Kopecks;
	readonly isMandatory: boolean;
	readonly toothNumber?: number | string | null;
	readonly canalCount?: AnatomicalCanalCount | null;
}

export interface ClinicalCase804nOptions {
	readonly fdiNumber?: number | string | null;
	readonly toothNumber?: number | string | null;
	readonly icd10Code: string;
	readonly surfaces?: readonly ToothSurface[] | null;
	readonly canalCount?: number | null | undefined;
	readonly clinicalCanalCount?: number | null | undefined;
	readonly specialty?: string | null | undefined;
	readonly isMultiVisit?: boolean | undefined;
	readonly endoVisitStage?:
		| "access_instrumentation_temporary_calcium"
		| "final_obturation_restoration"
		| "single_visit_complete"
		| undefined;
	readonly isRetreatment?: boolean | undefined;
	readonly isDifficultExtraction?: boolean | undefined;
	readonly isRetracted?: boolean | undefined;
	readonly isDeciduous?: boolean | undefined;
	readonly includeAnesthesia?: boolean | undefined;
	readonly includeRvg?: boolean | undefined;
	readonly includeSutures?: boolean | undefined;
	readonly anesthesiaType?: "infiltration" | "mandibular" | "torus" | "application" | undefined;
	readonly cavityClass?: string | null | undefined;
}

export interface Order804nBillingEstimateResult {
	readonly fdiNumber?: number | null;
	readonly icd10Code: string;
	readonly canalCount?: AnatomicalCanalCount | null;
	readonly items: readonly Order804nBillingLineItem[];
	readonly lineItems: readonly Order804nBillingLineItem[];
	readonly totalKopecks: Kopecks;
	readonly totalRub: number;
	readonly formattedTotal: string;
	readonly invoiceLines: readonly {
		readonly code: string;
		readonly title: string;
		readonly unitPriceRub: number;
		readonly quantity: number;
		readonly totalRub: number;
		readonly toothNumber?: string | null;
	}[];
}

/**
 * Категории стоматологических услуг по Приказу Минздрава РФ № 804н.
 */
export type Order804nNomenclatureCategory =
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

export interface EndoTreatmentPriceOptions {
	readonly fdiNumber: number | string;
	readonly canalCount?: number | null;
	readonly includeAnesthesia?: boolean;
	readonly anesthesiaType?: "infiltration" | "mandibular" | "torus" | "application";
	readonly includeCofferdam?: boolean;
	readonly includeMedicationCaOH2?: boolean;
	readonly isRetreatment?: boolean;
	readonly includeRestoration?: boolean;
	readonly isMultiSurfaceRestoration?: boolean;
}

export interface EndoTreatmentPriceCalculationResult {
	readonly fdiNumber: number;
	readonly canalCount: AnatomicalCanalCount;
	readonly instrumentationPriceKopecks: Kopecks;
	readonly obturationPriceKopecks: Kopecks;
	readonly anesthesiaPriceKopecks: Kopecks;
	readonly cofferdamPriceKopecks: Kopecks;
	readonly medicationPriceKopecks: Kopecks;
	readonly unsealingPriceKopecks: Kopecks;
	readonly restorationPriceKopecks: Kopecks;
	readonly totalPriceKopecks: Kopecks;
	readonly totalRub: number;
	readonly lineItems: readonly Order804nBillingLineItem[];
}
