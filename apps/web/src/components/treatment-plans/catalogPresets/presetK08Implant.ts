/**
 * presetK08Implant.ts — Клинический пресет сметы: Адентия и дентальная имплантация (МКБ-10: K08).
 * Мандаты 8b, 8e, 8n: Хирургия + ортопедия на имплантате.
 */

import type { TreatmentPlanStage } from "../treatmentPlanTypes";

export function generateImplantPreset(toothNumber?: number): readonly TreatmentPlanStage[] {
	const toothLabel = toothNumber ? ` в позиции зуба ${toothNumber}` : "";
	const crownToothLabel = toothNumber ? ` ${toothNumber}` : "";

	return [
		{
			id: `stage-surg-${toothNumber || "default"}`,
			stageNumber: 1,
			stageKind: "stage_2_surgery",
			title: "Хирургический этап: дентальная имплантация",
			subtitle: `Установка имплантата${toothLabel}`,
			clinicalGoal: "Остеоинтеграция дентального имплантата",
			totalRub: 48000,
			totalKopecks: 4800000,
			estimatedVisits: 1,
			estimatedWeeks: 12,
			status: "draft",
			items: [
				{
					id: `item-surg-impl-${toothNumber || "default"}`,
					toothNumber,
					code804n: "A16.07.054",
					name: `Установка имплантата${toothLabel}`,
					priceRub: 48000,
					unitPriceRub: 48000,
					discountRub: 0,
					quantity: 1,
					stageKind: "stage_2_surgery",
					isCompleted: false,
				},
			],
		},
		{
			id: `stage-ortho-${toothNumber || "default"}`,
			stageNumber: 2,
			stageKind: "stage_3_orthopedics",
			title: "Ортопедический этап: коронка на имплантате",
			subtitle: `Индивидуальный абатмент и коронка${crownToothLabel}`,
			clinicalGoal: "Полноценное функциональное протезирование",
			totalRub: 35000,
			totalKopecks: 3500000,
			estimatedVisits: 2,
			estimatedWeeks: 2,
			status: "draft",
			items: [
				{
					id: `item-ortho-crown-${toothNumber || "default"}`,
					toothNumber,
					code804n: "A16.07.004",
					name: `Коронка из диоксида циркония на имплантате${crownToothLabel}`,
					priceRub: 35000,
					unitPriceRub: 35000,
					discountRub: 0,
					quantity: 1,
					stageKind: "stage_3_orthopedics",
					isCompleted: false,
				},
			],
		},
	];
}
