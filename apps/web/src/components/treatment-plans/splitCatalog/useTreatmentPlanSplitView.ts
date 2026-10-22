import { useMemo, useState } from "react";
import type { CatalogServiceLookupItem } from "../treatmentPlanPricingEngine";
import type { TreatmentPlanItem, TreatmentPlanStage } from "../types";

export interface UseTreatmentPlanSplitViewParams {
	readonly stages: readonly TreatmentPlanStage[];
	readonly onQuickAddService: (targetStageNumber: number, itemData: Partial<TreatmentPlanItem>) => void;
}

export function useTreatmentPlanSplitView({
	stages,
	onQuickAddService,
}: UseTreatmentPlanSplitViewParams) {
	const [activeStageNumber, setActiveStageNumber] = useState<number>(stages[0]?.stageNumber ?? 1);
	const [selectedTooth, setSelectedTooth] = useState<number | null>(null);

	const activeStage = useMemo(() => {
		return stages.find((s) => s.stageNumber === activeStageNumber) || stages[0] || null;
	}, [stages, activeStageNumber]);

	const stageItemCountsMap = useMemo<Record<string, number>>(() => {
		if (!activeStage) return {};
		const map: Record<string, number> = {};
		activeStage.items.forEach((it) => {
			const code = it.code804n || it.serviceCode || it.id;
			map[code] = (map[code] || 0) + (it.quantity || 1);
		});
		return map;
	}, [activeStage]);

	const handleCatalogAdd = (service: CatalogServiceLookupItem, toothNum: number | null) => {
		const targetStageNum = activeStage?.stageNumber ?? 1;
		const basePrice = service.basePriceRub || 0;
		const code = service.order804nCode || service.code || service.id;

		onQuickAddService(targetStageNum, {
			serviceCode: code,
			code804n: code,
			name: service.title,
			category: service.category || "Общее",
			...(toothNum ? { toothNumber: toothNum } : {}),
			quantity: 1,
			unitPriceRub: basePrice,
			priceRub: basePrice,
			discountRub: 0,
		});
	};

	const totalPlanRub = useMemo(() => {
		return stages.reduce((sum, s) => sum + (s.totalRub || 0), 0);
	}, [stages]);

	return {
		activeStageNumber,
		setActiveStageNumber,
		selectedTooth,
		setSelectedTooth,
		activeStage,
		stageItemCountsMap,
		handleCatalogAdd,
		totalPlanRub,
	};
}
