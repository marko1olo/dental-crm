import { StaffActionAuditService } from "../../../../services/audit/staffActionAuditService.js";
import { showToast } from "../../../GlobalToast.js";
import {
	applyClinicalBundleToStages,
	type ClinicalBundleDefinition,
	type ClinicalBundleId,
	createBundlePlanItems,
	getClinicalBundleById,
} from "../../treatmentPlanBundlesEngine.js";
import type {
	CashierInvoiceExportData,
	PlanStageMutationContext,
	TreatmentPlanItem,
} from "../types.js";
import { mergeChairsideBundleIntoStages } from "./applyChairsideBundleToStagesHelper.js";

export function createPlanBundleHandlers(ctx: PlanStageMutationContext) {
	const {
		patientId, patientName, stages, currentPlanId, discountPercent,
		onExportToCashier, setCustomStages, setIsChairsideBundlesModalOpen, setDiscountPercent,
	} = ctx;

	const handleApplyClinicalBundle = (bundleId: ClinicalBundleId, toothNumber?: number) => {
		const bundle = getClinicalBundleById(bundleId);
		const updated = applyClinicalBundleToStages(stages, bundleId, toothNumber);
		setCustomStages(updated);
		const toothDesc = bundle?.requiresTooth ? ` (зуб ${toothNumber ?? bundle?.defaultTooth})` : "";
		showToast(`Пакет «${bundle?.shortTitle || bundleId}» успешно добавлен в план${toothDesc}!`, "success", 4000);
	};

	const handleApplyChairsideBundlePlan = (items: TreatmentPlanItem[], bundle: ClinicalBundleDefinition) => {
		const updated = mergeChairsideBundleIntoStages(stages, items, bundle);
		setCustomStages(updated);
		setIsChairsideBundlesModalOpen(false);
	};

	const handleApplyChairsideBundleInvoice = (_invoiceItems: unknown[], bundle: ClinicalBundleDefinition, toothNumber?: number) => {
		if (onExportToCashier) {
			const planItems = createBundlePlanItems(bundle.id, { toothNumber });
			const grossRub = planItems.reduce((acc, it) => acc + it.priceRub, 0);
			const exportData: CashierInvoiceExportData = {
				patientId,
				patientName,
				invoiceId: `inv-chairside-${bundle.id}-${Date.now()}`,
				invoiceNumber: `ПАКЕТ-${Date.now().toString().slice(-6)}`,
				items: planItems,
				grossTotalRub: grossRub,
				discountRub: 0,
				bonusPointsUsedRub: 0,
				bonusPointsUsedKopecks: 0 as any,
				netTotalRub: grossRub,
				netTotalKopecks: Math.round(grossRub * 100) as any,
				notes: `Клинический пакет «${bundle.shortTitle}» у кресла`,
				createdAtIso: new Date().toISOString(),
			};
			onExportToCashier(exportData);
		}
		setIsChairsideBundlesModalOpen(false);
	};

	const handleApplyDiscount = (newDiscountPercent: number, reason?: string) => {
		const oldDiscount = discountPercent;
		setDiscountPercent(newDiscountPercent);
		if (oldDiscount !== newDiscountPercent) {
			StaffActionAuditService.logDiscountApply({
				patientId,
				planId: currentPlanId,
				discountPercent: newDiscountPercent,
				reason: reason ?? `План лечения: изменение скидки с ${oldDiscount}% на ${newDiscountPercent}%`,
			});
		}
	};

	return {
		handleApplyClinicalBundle,
		handleApplyChairsideBundlePlan,
		handleApplyChairsideBundleInvoice,
		handleApplyDiscount,
	};
}
