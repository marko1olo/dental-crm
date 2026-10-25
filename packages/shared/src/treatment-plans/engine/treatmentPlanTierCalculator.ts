/**
 * treatmentPlanTierCalculator.ts — Расчет варианта сметы (Tier) по 3 клиническим этапам DENTE.
 */

import { sumKopecks, formatKopecksRu } from "../../utils/money.js";
import {
	PLAN_STAGE_METADATA,
	PLAN_TIER_CONFIGS,
	type PlanTierKey,
	type PlanStageKind,
	type TreatmentPlanItemInput,
	type TreatmentPlanStageSummary,
	type TreatmentPlanTierEstimate,
} from "./types.js";
import { normalizeTreatmentPlanItem } from "./treatmentPlanItemNormalizer.js";
import {
	calculateTierInstallments,
	calculateTierNdflDeduction,
} from "./financialWarrantyCalculator.js";

export function calculateSingleTierEstimate(
	tierKey: PlanTierKey,
	rawItems: readonly TreatmentPlanItemInput[],
): TreatmentPlanTierEstimate {
	const config = PLAN_TIER_CONFIGS[tierKey];
	const filteredInputs = rawItems.filter((it) => !it.tierKey || it.tierKey === tierKey);
	const normalizedItems = filteredInputs.map((it, idx) => normalizeTreatmentPlanItem(it, tierKey, idx));

	const stageKinds: PlanStageKind[] = ["stage_1_therapy", "stage_2_surgery", "stage_3_orthopedics"];
	const stages: TreatmentPlanStageSummary[] = stageKinds.map((kind) => {
		const meta = PLAN_STAGE_METADATA[kind];
		const stageItems = normalizedItems.filter((it) => it.stageKind === kind);
		const grossCostKopecks = sumKopecks(stageItems.map((it) => it.grossCostKopecks));
		const discountKopecks = sumKopecks(stageItems.map((it) => it.discountKopecks));
		const laborKopecks = sumKopecks(stageItems.map((it) => it.laborKopecks));
		const materialsKopecks = sumKopecks(stageItems.map((it) => it.materialsKopecks));
		const stageCostKopecks = sumKopecks(stageItems.map((it) => it.netCostKopecks));

		const treatedTeethSet = new Set<number>();
		for (const it of stageItems) {
			if (it.toothNumber !== null) treatedTeethSet.add(it.toothNumber);
		}

		const orderCodesSet = new Set<string>();
		for (const it of stageItems) {
			if (it.code804n) orderCodesSet.add(it.code804n);
		}

		const estimatedVisits = stageItems.length === 0 ? 0 : Math.max(1, Math.ceil(stageItems.length / 2));
		const estimatedDurationDays = estimatedVisits === 0 ? 0 : (estimatedVisits - 1) * 7 + 1;
		const isPennyExact = (laborKopecks + materialsKopecks === stageCostKopecks) &&
			(grossCostKopecks - discountKopecks === stageCostKopecks);

		return {
			stageNumber: meta.stageNumber, stageKind: kind, titleRu: meta.titleRu, subtitleRu: meta.subtitleRu,
			clinicalGoalRu: meta.clinicalGoalRu, items: stageItems, itemCount: stageItems.length,
			grossCostKopecks, discountKopecks, laborKopecks, materialsKopecks, stageCostKopecks,
			estimatedVisits, estimatedDurationDays, serviceCatalogCodes: Array.from(orderCodesSet),
			order804nCodes: Array.from(orderCodesSet), treatedTeeth: Array.from(treatedTeethSet).sort((a, b) => a - b),
			isPennyExact,
		};
	});

	const grossCostKopecks = sumKopecks(stages.map((s) => s.grossCostKopecks));
	const discountKopecks = sumKopecks(stages.map((s) => s.discountKopecks));
	const laborKopecks = sumKopecks(stages.map((s) => s.laborKopecks));
	const materialsKopecks = sumKopecks(stages.map((s) => s.materialsKopecks));
	const totalCostKopecks = sumKopecks(stages.map((s) => s.stageCostKopecks));
	const totalVisits = stages.reduce((acc, s) => acc + s.estimatedVisits, 0);
	const totalDurationDays = stages.reduce((acc, s) => acc + s.estimatedDurationDays, 0);
	const totalItemsCount = normalizedItems.length;
	const ndflDeduction = calculateTierNdflDeduction(normalizedItems);
	const installments = calculateTierInstallments(totalCostKopecks);

	const isPennyExact = stages.every((s) => s.isPennyExact) &&
		(laborKopecks + materialsKopecks === totalCostKopecks) &&
		(grossCostKopecks - discountKopecks === totalCostKopecks);

	return {
		tierKey, tierNameRu: config.tierNameRu, badgeRu: config.badgeRu, descriptionRu: config.descriptionRu,
		warrantyYears: config.warrantyYears, isRecommended: config.isRecommended,
		materialsHeadlineRu: config.defaultMaterialsHeadlineRu, keyAdvantagesRu: config.keyAdvantagesRu,
		stages, totalItemsCount, grossCostKopecks, discountKopecks, laborKopecks, materialsKopecks,
		totalCostKopecks, totalCostRu: formatKopecksRu(totalCostKopecks), totalVisits, totalDurationDays,
		ndflDeduction, installments, isPennyExact,
	};
}
