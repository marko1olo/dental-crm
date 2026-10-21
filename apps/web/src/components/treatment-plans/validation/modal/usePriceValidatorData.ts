import { useEffect, useMemo, useState } from "react";
import { isDemoShowcaseMode } from "../../../../lib/demoMode.js";
import type { TreatmentPlanStage } from "../../types.js";
import {
	type CatalogServiceItem,
	SAMPLE_CURRENT_PRICELIST,
	SAMPLE_TREATMENT_PLAN_FOR_VALIDATION,
	type TreatmentPlanValidationPayload,
} from "../planPriceValidationPresets.js";
import { validateTreatmentPlanStarProtocols } from "../starProtocolValidationEngine.js";

const EMPTY_PLAN_PAYLOAD: TreatmentPlanValidationPayload = {
	planId: "",
	planNumber: "",
	planTitle: "План лечения",
	patientId: "",
	patientName: "",
	doctorId: "",
	doctorFullName: "",
	createdAtIso: new Date().toISOString(),
	items: [],
};

export function usePriceValidatorData(
	planId?: string,
	propPlanPayload?: TreatmentPlanValidationPayload,
	propCatalogPricelist?: readonly CatalogServiceItem[],
	stages?: readonly TreatmentPlanStage[],
) {
	const isDemo = isDemoShowcaseMode();
	const [liveCatalog, setLiveCatalog] = useState<CatalogServiceItem[] | null>(null);
	const [livePlan, setLivePlan] = useState<TreatmentPlanValidationPayload | null>(null);

	useEffect(() => {
		if (isDemo) return;
		let isCancelled = false;

		const fetchPricelist = async () => {
			if (propCatalogPricelist && propCatalogPricelist.length > 0) return;
			try {
				const res = await fetch("/api/pricelists");
				if (!res.ok) return;
				const data = (await res.json()) as { items?: any[] };
				if (!isCancelled && Array.isArray(data.items)) {
					const mapped: CatalogServiceItem[] = data.items.map((it) => ({
						id: String(it.id ?? ""),
						code804n: String(it.code ?? ""),
						title: String(it.title ?? ""),
						category: String(it.category ?? "other"),
						basePriceRub: Number(it.basePriceRub ?? 0),
						active: Boolean(it.active ?? it.isActive ?? true),
						isArchived: it.active === false || it.isActive === false,
					}));
					setLiveCatalog(mapped);
				}
			} catch (err) {
				console.error("[PriceValidator] Failed to fetch catalog:", err);
			}
		};

		const fetchPlan = async () => {
			if (propPlanPayload || !planId) return;
			try {
				const res = await fetch(`/api/treatment-plans/${encodeURIComponent(planId)}`);
				if (!res.ok) return;
				const data = (await res.json()) as { validationPayload?: TreatmentPlanValidationPayload };
				if (!isCancelled && data.validationPayload) {
					setLivePlan(data.validationPayload);
				}
			} catch (err) {
				console.error("[PriceValidator] Failed to fetch plan:", err);
			}
		};

		void fetchPricelist();
		void fetchPlan();
		return () => { isCancelled = true; };
	}, [isDemo, planId, propCatalogPricelist, propPlanPayload]);

	const planPayload = propPlanPayload ?? livePlan ?? (isDemo ? SAMPLE_TREATMENT_PLAN_FOR_VALIDATION : EMPTY_PLAN_PAYLOAD);
	const catalogPricelist = propCatalogPricelist ?? liveCatalog ?? (isDemo ? SAMPLE_CURRENT_PRICELIST : []);

	const starValidation = useMemo(() => {
		if (stages && stages.length > 0) return validateTreatmentPlanStarProtocols(stages);
		const items = Array.isArray(planPayload?.items) ? planPayload.items : [];
		if (items.length === 0) return validateTreatmentPlanStarProtocols([]);

		const syntheticStage: TreatmentPlanStage = {
			stageNumber: 1,
			stageKind: "stage_1_therapy",
			title: "Комплексный этап лечения",
			subtitle: "Все манипуляции плана",
			clinicalGoal: "Санация и реабилитация",
			items: items.map((it) => ({
				id: it.itemId,
				...(it.toothNumber !== undefined ? { toothNumber: it.toothNumber } : {}),
				code804n: it.code804n,
				name: it.serviceTitle,
				category: it.category,
				priceRub: Math.max(0, it.planUnitPriceRub - it.planDiscountRub) * it.quantity,
				unitPriceRub: it.planUnitPriceRub,
				discountRub: it.planDiscountRub * it.quantity,
				quantity: it.quantity,
				phase: 1,
				stageKind: "stage_1_therapy",
			})),
			totalRub: items.reduce((acc, it) => acc + Math.max(0, it.planUnitPriceRub - it.planDiscountRub) * it.quantity, 0),
			totalKopecks: 0 as any,
			estimatedVisits: 3,
			estimatedWeeks: 4,
			serviceCatalogCodes: items.map((i) => i.code804n),
			order804nCodes: items.map((i) => i.code804n),
		};
		return validateTreatmentPlanStarProtocols([syntheticStage]);
	}, [stages, planPayload]);

	return { planPayload, catalogPricelist, starValidation };
}
