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
	TreatmentPlanStage,
} from "../types.js";

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
		const targetStageExists = stages.some(
			(st) => st.stageKind === bundle.stageKind || st.stageNumber === bundle.stageNumber,
		);
		let updated: TreatmentPlanStage[];
		if (!targetStageExists) {
			const stageTitles: Record<1 | 2 | 3, { title: string; subtitle: string; goal: string }> = {
				1: { title: "Этап 1: Неотложная помощь и терапевтическая санация", subtitle: "Санация", goal: "Санация полости рта" },
				2: { title: "Этап 2: Хирургический этап и дентальная имплантация", subtitle: "Хирургия", goal: "Хирургическая санация" },
				3: { title: "Этап 3: Ортопедический этап и протезирование", subtitle: "Ортопедия", goal: "Ортопедическое восстановление" },
			};
			const meta = stageTitles[bundle.stageNumber];
			const stageTotalRub = items.reduce((acc, it) => acc + it.priceRub, 0);
			const newStage: TreatmentPlanStage = {
				stageNumber: bundle.stageNumber,
				stageKind: bundle.stageKind,
				title: meta.title,
				subtitle: meta.subtitle,
				clinicalGoal: meta.goal,
				items,
				totalRub: stageTotalRub,
				totalKopecks: Math.round(stageTotalRub * 100) as any,
				estimatedVisits: Math.max(1, Math.ceil(items.length / 2)),
				estimatedWeeks: 2,
				serviceCatalogCodes: items.map((it) => it.code804n),
				order804nCodes: items.map((it) => it.code804n),
			};
			updated = [...stages, newStage].sort((a, b) => a.stageNumber - b.stageNumber);
		} else {
			updated = stages.map((st) => {
				if (st.stageKind !== bundle.stageKind && st.stageNumber !== bundle.stageNumber) return st;
				const updatedItems = [...st.items, ...items];
				const totalRub = updatedItems.reduce((acc, it) => acc + it.priceRub, 0);
				return {
					...st,
					items: updatedItems,
					totalRub,
					totalKopecks: Math.round(totalRub * 100) as any,
					serviceCatalogCodes: Array.from(new Set([...(st.serviceCatalogCodes || st.order804nCodes || []), ...items.map((it) => it.code804n)])),
					order804nCodes: Array.from(new Set([...(st.serviceCatalogCodes || st.order804nCodes || []), ...items.map((it) => it.code804n)])),
				};
			});
		}
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
