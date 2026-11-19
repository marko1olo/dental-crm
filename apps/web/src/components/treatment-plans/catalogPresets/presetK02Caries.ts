/**
 * presetK02Caries.ts — Клинический пресет сметы: Кариес дентина (МКБ-10: K02).
 * Мандаты 8b, 8e, 8n: Автономия врача, физиологическая норма, 0 блокировок.
 */

import type { TreatmentPlanStage } from "../treatmentPlanTypes";

export function generateCariesPreset(toothNumber?: number): readonly TreatmentPlanStage[] {
	const toothLabel = toothNumber ? ` зуба ${toothNumber}` : "";

	return [
		{
			id: `stage-caries-${toothNumber || "default"}`,
			stageNumber: 1,
			stageKind: "stage_1_therapy",
			title: "Терапевтическое лечение кариеса",
			subtitle: `Анатомическая реставрация${toothLabel}`,
			clinicalGoal: "Иссечение некротизированных тканей и восстановление формы зуба",
			totalRub: 5500,
			totalKopecks: 550000,
			estimatedVisits: 1,
			estimatedWeeks: 1,
			status: "draft",
			items: [
				{
					id: `item-caries-${toothNumber || "default"}`,
					toothNumber,
					code804n: "A16.07.002",
					name: `Восстановление${toothLabel} нанокомпозитом`,
					priceRub: 5500,
					unitPriceRub: 5500,
					discountRub: 0,
					quantity: 1,
					stageKind: "stage_1_therapy",
					isCompleted: false,
				},
			],
		},
	];
}
