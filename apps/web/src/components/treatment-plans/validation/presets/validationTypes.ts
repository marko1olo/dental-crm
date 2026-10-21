/**
 * apps/web/src/components/treatment-plans/validation/presets/validationTypes.ts
 *
 * Контракты и структуры данных валидации прайс-листов и фиксации цен.
 */

export type PriceLockResolutionPolicy =
	| "LOCK_ORIGINAL_PRICE"
	| "UPDATE_TO_CURRENT_PRICE"
	| "REQUIRE_ADMIN_OVERRIDE"
	| "CUSTOM_PRICE_OVERRIDE"
	| "REPLACE_WITH_804N_ANALOGUE";

export type PriceDiscrepancyKind =
	| "PRICE_MATCH"
	| "PRICE_INCREASED"
	| "PRICE_DECREASED"
	| "SERVICE_ARCHIVED"
	| "SERVICE_NOT_FOUND"
	| "DISCOUNT_EXPIRED_OR_INVALID"
	| "PLAN_EXPIRED";

export type ValidationSeverity = "info" | "success" | "warning" | "error";

export type PlanPricePolicyPresetId =
	| "standard_30"
	| "ortho_implant_90"
	| "long_term_vip_180"
	| "flexible_clinic";

export interface PlanPricePolicyPreset {
	readonly id: PlanPricePolicyPresetId;
	readonly title: string;
	readonly subtitle: string;
	readonly validityDays: number;
	readonly inflationThresholdPercent: number;
	readonly allowAutoLockWithinValidity: boolean;
	readonly disallowArchivedServices: boolean;
	readonly requireManagerOverrideAboveThreshold: boolean;
	readonly maxDoctorDiscountPercent: number;
	readonly defaultResolutionForPriceIncrease: PriceLockResolutionPolicy;
	readonly defaultResolutionForPriceDecrease: PriceLockResolutionPolicy;
	readonly defaultResolutionForExpiredPlan: PriceLockResolutionPolicy;
}

export interface CatalogServiceItem {
	readonly id: string;
	readonly code804n: string;
	readonly title: string;
	readonly category: string;
	readonly basePriceRub: number;
	readonly active: boolean;
	readonly isArchived?: boolean;
	readonly updatedAtIso?: string;
	readonly vatPercent?: number;
}

export interface TreatmentPlanItemValidationContext {
	readonly itemId: string;
	readonly toothNumber?: number | undefined;
	readonly code804n: string;
	readonly serviceTitle: string;
	readonly category: string;
	readonly planUnitPriceRub: number;
	readonly planDiscountRub: number;
	readonly planDiscountPercent: number;
	readonly quantity: number;
	readonly planLineTotalRub: number;
	readonly serviceId?: string | undefined;
	readonly phase?: number | undefined;
	readonly clinicalRationale?: string | undefined;
}

export interface TreatmentPlanValidationPayload {
	readonly planId: string;
	readonly planNumber: string;
	readonly planTitle: string;
	readonly patientId: string;
	readonly patientName: string;
	readonly patientChartNumber?: string | undefined;
	readonly doctorId: string;
	readonly doctorFullName: string;
	readonly createdAtIso: string;
	readonly validUntilIso?: string | undefined;
	readonly items: readonly TreatmentPlanItemValidationContext[];
	readonly notes?: string | undefined;
}
