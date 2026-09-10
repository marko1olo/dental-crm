/**
 * packages/shared/src/clinical/stomxPricelistTypes.ts
 *
 * StomX Pricelist & Order 804n Nomenclature Types and Interfaces.
 *
 * Compliant with:
 * - Supreme Law: THE HAMMER (Zero Mocks, Absolute Parity)
 * - Mandate 8e: Doctor Autonomy (No false blockers, free doctor discounts 0..100%, 1-click plan application)
 * - Mandate 8i: Specialized Outpatient Bounded Context (Form 043/u, Nomenclature 804n)
 * - Exact kopeck accounting (Mandate 8b / ACID & Exact Math)
 * - exactOptionalPropertyTypes: true compliance
 */

export type StomxPricelistCategory =
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

export interface StomxCategoryDefinition {
	readonly id: StomxPricelistCategory;
	readonly code: string;
	readonly titleRu: string;
	readonly descriptionRu: string;
	readonly defaultDurationMinutes: number;
}

export interface StomxProcedureItem {
	readonly id: string | number;
	readonly code: string;
	readonly name: string;
	readonly category: StomxPricelistCategory;
	readonly categoryName: string;
	readonly price: number;
	readonly priceKopecks: number;
	readonly durationMinutes: number;
	readonly requireTooth: boolean;
	readonly warrantyMonths: number;
	readonly lifetimeMonths: number;
	readonly code804n: string;
	readonly canDiscount: boolean;
	readonly description?: string | undefined;
	readonly stomxId?: number | undefined;
}

export interface StomxSearchOptions {
	readonly category?: StomxPricelistCategory | undefined;
	readonly requireTooth?: boolean | undefined;
	readonly maxPriceRub?: number | undefined;
	readonly minPriceRub?: number | undefined;
	readonly limit?: number | undefined;
}

export interface StomxEstimateItem {
	readonly procedureId: string | number;
	readonly code: string;
	readonly code804n: string;
	readonly name: string;
	readonly category: StomxPricelistCategory;
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

export interface StomxTreatmentPlanItem {
	readonly procedureId: string | number;
	readonly code: string;
	readonly code804n: string;
	readonly name: string;
	readonly category: StomxPricelistCategory;
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
