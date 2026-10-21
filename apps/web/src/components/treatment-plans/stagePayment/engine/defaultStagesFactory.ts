import {
	type Kopecks,
	percentageOfKopecks,
	rublesToKopecks,
} from "@dental/shared";
import {
	type StagePaymentKind,
	getStagePresetByKind,
} from "../stagePaymentPresets.js";
import type { MilestoneStage } from "./types";

/**
 * Инициализация стандартных клинических этапов по умолчанию
 */
export function createDefaultMilestoneStages(
	archetypes: readonly StagePaymentKind[] = [
		"stage_1_sanitation_therapy",
		"stage_2_surgery_implant",
		"stage_3_orthopedic_prosthetics",
	],
	customAmounts?: Partial<Record<StagePaymentKind, Kopecks>>,
): MilestoneStage[] {
	const defaultPrices: Record<StagePaymentKind, Kopecks> = {
		stage_1_sanitation_therapy: rublesToKopecks(28500),
		stage_2_surgery_implant: rublesToKopecks(85000),
		stage_3_orthopedic_prosthetics: rublesToKopecks(120000),
		stage_4_orthodontics_braces: rublesToKopecks(180000),
		stage_5_periodontics_maintenance: rublesToKopecks(15000),
	};

	return archetypes.map((kind, idx) => {
		const preset = getStagePresetByKind(kind);
		const totalKopecks = customAmounts?.[kind] ?? defaultPrices[kind];
		const advanceRequiredKopecks = percentageOfKopecks(
			totalKopecks,
			preset.defaultAdvancePercent * 100,
		);

		const labKopecks = preset.cadCamLabSharePercent
			? percentageOfKopecks(totalKopecks, preset.cadCamLabSharePercent * 100)
			: 0;
		const materialsKopecks = preset.implantHardwareSharePercent
			? percentageOfKopecks(totalKopecks, preset.implantHardwareSharePercent * 100)
			: percentageOfKopecks(totalKopecks, 1500); // 15% на терапию

		return {
			id: `stage-${kind}-${idx + 1}`,
			stageNumber: idx + 1,
			kind,
			title: preset.title,
			status: "draft",
			totalKopecks,
			advanceRequiredKopecks,
			advancePaidKopecks: 0,
			escrowLockedKopecks: 0,
			completionPaidKopecks: 0,
			directExpensesKopecks: {
				labKopecks,
				materialsKopecks,
				otherKopecks: 0,
			},
			items: [
				{
					id: `item-${kind}-1`,
					name: preset.defaultItemsSummary,
					quantity: 1,
					priceKopecks: totalKopecks,
					totalKopecks,
					labCostKopecks: labKopecks,
					materialCostKopecks: materialsKopecks,
				},
			],
			notes: `Нормативная база: ${preset.legalBasisRu}`,
		};
	});
}
