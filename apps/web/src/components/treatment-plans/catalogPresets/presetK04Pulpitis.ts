/**
 * presetK04Pulpitis.ts — Клинический пресет сметы: Пульпит и периодонтит (МКБ-10: K04).
 * Мандаты 8b, 8e, 8n: Эндодонтический протокол под микроскопом.
 */

import type { TreatmentPlanStage } from "../treatmentPlanTypes";

export function generatePulpitisPreset(toothNumber?: number): readonly TreatmentPlanStage[] {
	const toothLabel = toothNumber ? ` зуба ${toothNumber}` : "";

	return [
		{
			id: `stage-endo-${toothNumber || "default"}`,
			stageNumber: 1,
			stageKind: "stage_1_therapy",
			title: "Эндодонтическое лечение каналов",
			subtitle: `Механическая и медикаментозная обработка${toothLabel}`,
			clinicalGoal: "Пломбирование корневых каналов гуттаперчей и герметизация",
			totalRub: 12000,
			totalKopecks: 1200000,
			estimatedVisits: 2,
			estimatedWeeks: 2,
			status: "draft",
			items: [
				{
					id: `item-endo-prep-${toothNumber || "default"}`,
					toothNumber,
					code804n: "A16.07.030",
					name: `Обработка корневых каналов${toothLabel} под микроскопом`,
					priceRub: 7500,
					unitPriceRub: 7500,
					discountRub: 0,
					quantity: 1,
					stageKind: "stage_1_therapy",
					isCompleted: false,
				},
				{
					id: `item-endo-fill-${toothNumber || "default"}`,
					toothNumber,
					code804n: "A16.07.002",
					name: `Реставрация коронковой части${toothLabel}`,
					priceRub: 4500,
					unitPriceRub: 4500,
					discountRub: 0,
					quantity: 1,
					stageKind: "stage_1_therapy",
					isCompleted: false,
				},
			],
		},
	];
}
