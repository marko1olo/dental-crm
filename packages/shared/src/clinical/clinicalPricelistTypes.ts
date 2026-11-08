/**
 * packages/shared/src/clinical/clinicalPricelistTypes.ts
 *
 * DENTE Clinical Pricelist & Order 804n Nomenclature Types and Interfaces.
 *
 * Compliant with:
 * - Supreme Law: THE HAMMER (Zero Mocks, Absolute Parity)
 * - Mandate 8e: Doctor Autonomy (No false blockers, free doctor discounts 0..100%, 1-click plan application)
 * - Mandate 8i: Specialized Outpatient Bounded Context (Form 043/u, Nomenclature 804n)
 * - Mandate 8ap: Zero Foreign CRM Contamination
 * - Exact kopeck accounting (Mandate 8b / ACID & Exact Math)
 * - exactOptionalPropertyTypes: true compliance
 */

export type ClinicalPricelistCategory =
	| "therapy"
	| "orthopedics"
	| "surgery"
	| "implantology"
	| "orthodontics"
	| "periodontics"
	| "hygiene"
	| "radiology"
	| "anesthesiology"
	| "ztl";

/** @deprecated Use ClinicalPricelistCategory */
export type StomxPricelistCategory = ClinicalPricelistCategory;

export interface ClinicalCategoryDefinition {
	readonly id: ClinicalPricelistCategory;
	readonly code: string;
	readonly titleRu: string;
	readonly descriptionRu: string;
	readonly defaultDurationMinutes: number;
}

/** @deprecated Use ClinicalCategoryDefinition */
export type StomxCategoryDefinition = ClinicalCategoryDefinition;

export interface ClinicalProcedureItem {
	readonly id: string | number;
	readonly code: string;
	readonly name: string;
	readonly category: ClinicalPricelistCategory;
	readonly categoryName: string;
	readonly price: number;
	readonly priceKopecks: number;
	readonly durationMinutes: number;
	readonly requireTooth: boolean;
	readonly warrantyMonths: number;
	readonly lifetimeMonths: number;
	readonly serviceCode?: string | undefined; // Canonical clean domain alias per Mandate 8ap
	readonly code804n: string;
	readonly canDiscount: boolean;
	readonly description?: string | undefined;
	readonly stomxId?: number | undefined;
	readonly denteId?: number | undefined;
}

/** @deprecated Use ClinicalProcedureItem */
export type StomxProcedureItem = ClinicalProcedureItem;

export interface ClinicalSearchOptions {
	readonly category?: ClinicalPricelistCategory | undefined;
	readonly requireTooth?: boolean | undefined;
	readonly maxPriceRub?: number | undefined;
	readonly minPriceRub?: number | undefined;
	readonly limit?: number | undefined;
}

/** @deprecated Use ClinicalSearchOptions */
export type StomxSearchOptions = ClinicalSearchOptions;

export interface ClinicalEstimateItem {
	readonly procedureId: string | number;
	readonly code: string;
	readonly serviceCode?: string | undefined; // Canonical clean domain alias per Mandate 8ap
	readonly code804n: string;
	readonly name: string;
	readonly category: ClinicalPricelistCategory;
	readonly priceRub: number;
	readonly priceKopecks: number;
	readonly quantity: number;
	readonly discountPercent: number;
	readonly totalRub: number;
	readonly totalKopecks: number;
	readonly toothNumber?: number | undefined;
	readonly surfaces?: readonly string[] | undefined;
	readonly durationMinutes: number;
	readonly warrantyMonths: number;
	readonly lifetimeMonths: number;
	readonly notes?: string | undefined;
}

/** @deprecated Use ClinicalEstimateItem */
export type StomxEstimateItem = ClinicalEstimateItem;

export interface ClinicalTreatmentPlanItem {
	readonly procedureId: string | number;
	readonly code: string;
	readonly serviceCode?: string | undefined; // Canonical clean domain alias per Mandate 8ap
	readonly code804n: string;
	readonly name: string;
	readonly category: ClinicalPricelistCategory;
	readonly priceRub: number;
	readonly priceKopecks: number;
	readonly quantity: number;
	readonly discountPercent: number;
	readonly totalRub: number;
	readonly totalKopecks: number;
	readonly toothNumber?: number | undefined;
	readonly surfaces?: readonly string[] | undefined;
	readonly phaseNumber: number;
	readonly status: "planned" | "in_progress" | "completed" | "cancelled";
	readonly durationMinutes: number;
	readonly warrantyMonths: number;
	readonly lifetimeMonths: number;
	readonly notes?: string | undefined;
}

/** @deprecated Use ClinicalTreatmentPlanItem */
export type StomxTreatmentPlanItem = ClinicalTreatmentPlanItem;
