import type {
	CatalogServiceItem,
	PlanPricePolicyPreset,
	PriceLockResolutionPolicy,
	TreatmentPlanValidationPayload,
} from "../planPriceValidationPresets";
import { PLAN_PRICE_POLICY_PRESETS } from "../planPriceValidationPresets";
import { calculateDaysBetween } from "./catalogLookup";
import { accumulatePlanItemsMetrics } from "./planItemsAccumulator";
import { resolveOverallValidationStatus } from "./overallStatusResolver";
import type { AdminOverrideMetadata, PlanPriceValidationReport } from "./types";

/**
 * Комплексная валидация всей сметы плана лечения с формированием отчета и рекомендаций.
 */
export function validateTreatmentPlanPrices(
	plan: TreatmentPlanValidationPayload,
	catalog: readonly CatalogServiceItem[],
	preset: PlanPricePolicyPreset = PLAN_PRICE_POLICY_PRESETS.standard_30,
	itemResolutions?: Readonly<Record<string, PriceLockResolutionPolicy>> | undefined,
	customPrices?: Readonly<Record<string, number>> | undefined,
	adminOverride?: AdminOverrideMetadata | undefined,
	currentDateIso: string = new Date().toISOString(),
): PlanPriceValidationReport {
	const planCreatedAt = plan?.createdAtIso || currentDateIso;
	const planAgeDays = calculateDaysBetween(planCreatedAt, currentDateIso);
	const isPlanExpired = planAgeDays > preset.validityDays;
	const expiryDaysRemaining = preset.validityDays - planAgeDays;

	const planItems = Array.isArray(plan?.items) ? plan.items : [];
	const m = accumulatePlanItemsMetrics(
		planItems,
		catalog,
		preset,
		isPlanExpired,
		itemResolutions,
		customPrices,
	);

	const totalDeltaRub = m.resolvedNetRub - m.originalPlanNetRub;
	const totalDeltaPercent = m.originalPlanNetRub > 0 ? Number(((totalDeltaRub / m.originalPlanNetRub) * 100).toFixed(1)) : 0;
	const isAuthorizedByAdmin = Boolean(adminOverride?.isAuthorized);

	const { overallStatus, validationMessages } = resolveOverallValidationStatus(
		m.validatedItems,
		isAuthorizedByAdmin,
		m.archivedItemsCount,
		m.notFoundItemsCount,
		m.itemsRequiringAdminOverrideCount,
		isPlanExpired,
		expiryDaysRemaining,
		m.totalClinicAbsorptionRub,
	);

	return {
		planId: plan?.planId || "plan-default",
		planNumber: plan?.planNumber || "1",
		planTitle: plan?.planTitle || "План лечения",
		patientId: plan?.patientId || "",
		patientName: plan?.patientName || "",
		doctorId: plan?.doctorId || "",
		doctorFullName: plan?.doctorFullName || "",
		createdAtIso: plan?.createdAtIso || currentDateIso,
		planAgeDays,
		isPlanExpired,
		expiryDaysRemaining,
		activePreset: preset,
		items: m.validatedItems,
		totalItemsCount: m.validatedItems.length,
		matchedItemsCount: m.matchedItemsCount,
		increasedItemsCount: m.increasedItemsCount,
		decreasedItemsCount: m.decreasedItemsCount,
		archivedItemsCount: m.archivedItemsCount,
		notFoundItemsCount: m.notFoundItemsCount,
		discountedItemsCount: m.discountedItemsCount,
		itemsRequiringAdminOverrideCount: m.itemsRequiringAdminOverrideCount,
		originalPlanGrossRub: m.originalPlanGrossRub,
		originalPlanDiscountRub: m.originalPlanDiscountRub,
		originalPlanNetRub: m.originalPlanNetRub,
		currentCatalogGrossRub: m.currentCatalogGrossRub,
		currentCatalogNetRub: m.currentCatalogNetRub,
		resolvedGrossRub: m.resolvedGrossRub,
		resolvedDiscountRub: m.resolvedDiscountRub,
		resolvedNetRub: m.resolvedNetRub,
		totalDeltaRub,
		totalDeltaPercent,
		totalClinicAbsorptionRub: m.totalClinicAbsorptionRub,
		overallStatus,
		canGenerateWorkOrder: true,
		canGenerateCompletedAct: true,
		validationMessages,
		adminOverride: adminOverride || { isAuthorized: false },
	};
}
