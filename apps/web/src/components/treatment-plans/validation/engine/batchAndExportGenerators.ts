import type {
	CatalogServiceItem,
	PlanPricePolicyPreset,
	PriceLockResolutionPolicy,
	TreatmentPlanValidationPayload,
} from "../planPriceValidationPresets";
import { validateTreatmentPlanPrices } from "./planValidationEngine";
import type {
	AdminOverrideMetadata,
	PlanPriceValidationReport,
	WorkOrderExportItem,
	WorkOrderValidatedExport,
} from "./types";

/**
 * Пакетное применение единой политики ко всем позициям сметы (1-Click Фиксация или 1-Click Обновление).
 */
export function applyBatchResolutionToAllItems(
	plan: TreatmentPlanValidationPayload,
	catalog: readonly CatalogServiceItem[],
	preset: PlanPricePolicyPreset,
	batchResolution: PriceLockResolutionPolicy,
	adminOverride?: AdminOverrideMetadata,
): PlanPriceValidationReport {
	const itemResolutions: Record<string, PriceLockResolutionPolicy> = {};
	const items = Array.isArray(plan?.items) ? plan.items : [];
	for (const item of items) {
		itemResolutions[item.itemId] = batchResolution;
	}
	return validateTreatmentPlanPrices(
		plan,
		catalog,
		preset,
		itemResolutions,
		undefined,
		adminOverride,
	);
}

/**
 * Экспорт проверенной сметы в структуру Наряд-заказа или Акта выполненных работ.
 */
export function generateWorkOrderExportPayload(
	report: PlanPriceValidationReport,
	orderType: "work_order" | "completed_works_act" = "work_order",
	options?: { suffix?: string },
): WorkOrderValidatedExport {
	const orderPrefix = orderType === "work_order" ? "НЗ" : "АВР";
	const planDigits = report.planNumber.replace(/[^\d]/g, "") || "41";
	const cleanSuffix = options?.suffix || (report.planId ? report.planId.replace(/\D/g, "").slice(0, 4) : "").padStart(4, "0") || "0001";
	const orderNumber = `${orderPrefix}-${planDigits}-${cleanSuffix}`;

	const exportItems: WorkOrderExportItem[] = report.items.map((item) => ({
		itemId: item.itemId,
		toothNumber: item.toothNumber,
		code804n: item.code804n,
		serviceTitle: item.serviceTitle,
		category: item.category,
		quantity: item.quantity,
		appliedUnitPriceRub: item.effectiveUnitPriceRub,
		appliedDiscountRub: item.effectiveDiscountRub,
		lineTotalRub: item.effectiveLineNetRub,
		resolutionPolicyApplied: item.selectedResolution,
		isPriceLockedFromPlan: item.selectedResolution === "LOCK_ORIGINAL_PRICE",
	}));

	return {
		orderNumber,
		orderType,
		planId: report.planId,
		planNumber: report.planNumber,
		patientId: report.patientId,
		patientName: report.patientName,
		doctorFullName: report.doctorFullName,
		validatedAtIso: new Date().toISOString(),
		presetUsed: report.activePreset.title,
		items: exportItems,
		totalPayableRub: report.resolvedNetRub,
		totalDiscountRub: report.resolvedDiscountRub,
		clinicAbsorptionGuaranteeRub: report.totalClinicAbsorptionRub,
		isApprovedByManager: Boolean(report.adminOverride.isAuthorized),
		managerNotes: report.adminOverride.overrideReason,
	};
}
