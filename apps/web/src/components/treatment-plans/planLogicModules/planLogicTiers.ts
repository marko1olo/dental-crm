import { useMemo } from "react";
import {
	calculateLoyaltyBonusDeduction,
	generate3TierPlanComparison,
	generateTreatmentPlanStages,
	type CatalogServiceLookupItem,
} from "../treatmentPlanStagesEngine.js";
import { filterStagesBySpecialty } from "../treatmentPlanStageMutations.js";
import type {
	TreatmentPlanSpecialtyFilter,
	TreatmentPlanStage,
	TreatmentPlanTier,
	TreatmentPlanTierId,
} from "./types.js";
import {
	calculateEffectiveSignTier,
	calculateGrandTotalRub,
	calculateTotalItemsCount,
	resolveOrthopedicTeeth,
} from "./planFinancialCalculators.js";

interface TiersParams {
	readonly cbctAutoPlanTiers: [TreatmentPlanTier, TreatmentPlanTier, TreatmentPlanTier] | null;
	readonly effectiveTeethData: Record<number, any>;
	readonly catalog?: CatalogServiceLookupItem[];
	readonly discountPercent: number;
	readonly selectedTierId: TreatmentPlanTierId;
	readonly customStages: TreatmentPlanStage[] | null;
	readonly specialtyFilter: TreatmentPlanSpecialtyFilter;
	readonly patientBalanceRub: number;
	readonly bonusPointsToUseRub: number;
}

export function usePlanTiersComputation({
	cbctAutoPlanTiers,
	effectiveTeethData,
	catalog,
	discountPercent,
	selectedTierId,
	customStages,
	specialtyFilter,
	patientBalanceRub,
	bonusPointsToUseRub,
}: TiersParams) {
	const planTiers = useMemo(() => {
		if (cbctAutoPlanTiers) return cbctAutoPlanTiers;
		return generate3TierPlanComparison(effectiveTeethData, catalog, discountPercent);
	}, [cbctAutoPlanTiers, effectiveTeethData, catalog, discountPercent]);

	const currentTier = useMemo(() => {
		return planTiers.find((t) => t.tierId === selectedTierId) ?? planTiers[2]!;
	}, [planTiers, selectedTierId]);

	const autoStages = useMemo(() => {
		if (currentTier?.stages && currentTier.stages.length > 0) return currentTier.stages;
		return generateTreatmentPlanStages(effectiveTeethData, catalog, discountPercent);
	}, [effectiveTeethData, catalog, discountPercent, currentTier]);

	const stages = customStages ?? autoStages;
	const effectiveSignTier = useMemo(() => calculateEffectiveSignTier(currentTier, stages), [currentTier, stages]);
	const totalItemsCount = useMemo(() => calculateTotalItemsCount(stages), [stages]);
	const grandTotalRub = useMemo(() => calculateGrandTotalRub(stages), [stages]);

	const loyaltyDeduction = useMemo(() => {
		return calculateLoyaltyBonusDeduction(effectiveSignTier.totalKopecks, discountPercent, patientBalanceRub, bonusPointsToUseRub);
	}, [effectiveSignTier.totalKopecks, discountPercent, patientBalanceRub, bonusPointsToUseRub]);

	const orthopedicTeeth = useMemo(() => resolveOrthopedicTeeth(stages, effectiveTeethData), [stages, effectiveTeethData]);
	const visibleStages = useMemo(() => filterStagesBySpecialty(stages, specialtyFilter), [stages, specialtyFilter]);

	return {
		planTiers,
		currentTier,
		autoStages,
		stages,
		effectiveSignTier,
		totalItemsCount,
		grandTotalRub,
		loyaltyDeduction,
		orthopedicTeeth,
		visibleStages,
	};
}
