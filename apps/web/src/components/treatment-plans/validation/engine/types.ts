import type {
	CatalogServiceItem,
	PlanPricePolicyPreset,
	PriceDiscrepancyKind,
	PriceLockResolutionPolicy,
	ValidationSeverity,
} from "../planPriceValidationPresets";

export * from "./workOrderExportTypes";

export interface ValidatedPlanItem {
	readonly itemId: string;
	readonly toothNumber?: number | undefined;
	readonly code804n: string;
	readonly serviceTitle: string;
	readonly category: string;
	readonly quantity: number;
	readonly planUnitPriceRub: number;
	readonly planDiscountPercent: number;
	readonly planDiscountRub: number;
	readonly planLineGrossRub: number;
	readonly planLineNetRub: number;
	readonly catalogService: CatalogServiceItem | null;
	readonly currentCatalogPriceRub: number;
	readonly currentCatalogActive: boolean;
	readonly isArchived: boolean;
	readonly isNotFound: boolean;
	readonly unitPriceDeltaRub: number;
	readonly unitPriceDeltaPercent: number;
	readonly lineTotalDeltaRub: number;
	readonly discrepancyKind: PriceDiscrepancyKind;
	readonly severity: ValidationSeverity;
	readonly statusBadgeText: string;
	readonly requiresAdminOverride: boolean;
	readonly suggestedResolution: PriceLockResolutionPolicy;
	readonly selectedResolution: PriceLockResolutionPolicy;
	readonly customPriceRub?: number | undefined;
	readonly effectiveUnitPriceRub: number;
	readonly effectiveDiscountRub: number;
	readonly effectiveLineGrossRub: number;
	readonly effectiveLineNetRub: number;
	readonly clinicAbsorptionRub: number;
	readonly resolutionReason?: string | undefined;
}

export type OverallValidationStatus =
	| "APPROVED_PRICE_LOCKED"
	| "APPROVED_CURRENT_PRICELIST"
	| "PENDING_ADMIN_OVERRIDE"
	| "BLOCKED_ARCHIVED_SERVICE";

export interface AdminOverrideMetadata {
	readonly isAuthorized: boolean;
	readonly authorizedByAdminName?: string | undefined;
	readonly authorizationPinOrToken?: string | undefined;
	readonly overrideReason?: string | undefined;
	readonly authorizedAtIso?: string | undefined;
}

export interface PlanPriceValidationReport {
	readonly planId: string;
	readonly planNumber: string;
	readonly planTitle: string;
	readonly patientId: string;
	readonly patientName: string;
	readonly doctorId: string;
	readonly doctorFullName: string;
	readonly createdAtIso: string;
	readonly planAgeDays: number;
	readonly isPlanExpired: boolean;
	readonly expiryDaysRemaining: number;
	readonly activePreset: PlanPricePolicyPreset;
	readonly items: readonly ValidatedPlanItem[];
	readonly totalItemsCount: number;
	readonly matchedItemsCount: number;
	readonly increasedItemsCount: number;
	readonly decreasedItemsCount: number;
	readonly archivedItemsCount: number;
	readonly notFoundItemsCount: number;
	readonly discountedItemsCount: number;
	readonly itemsRequiringAdminOverrideCount: number;
	readonly originalPlanGrossRub: number;
	readonly originalPlanDiscountRub: number;
	readonly originalPlanNetRub: number;
	readonly currentCatalogGrossRub: number;
	readonly currentCatalogNetRub: number;
	readonly resolvedGrossRub: number;
	readonly resolvedDiscountRub: number;
	readonly resolvedNetRub: number;
	readonly totalDeltaRub: number;
	readonly totalDeltaPercent: number;
	readonly totalClinicAbsorptionRub: number;
	readonly overallStatus: OverallValidationStatus;
	readonly canGenerateWorkOrder: boolean;
	readonly canGenerateCompletedAct: boolean;
	readonly validationMessages: readonly string[];
	readonly adminOverride: AdminOverrideMetadata;
}

export type TreatmentPlanPriceValidationReport = PlanPriceValidationReport;
