/**
 * treatmentPlanAllOn4.ts — All-on-4 clinical protocols for Upper and Lower jaws.
 *
 * Mandate 8s (SSOT & Anti-Bloat)
 */

import type {
	TreatmentPlanItem,
	TreatmentPlanStage,
} from "../../components/treatment-plans/types";
import {
	type CopilotModificationAuditItem,
	type CopilotModificationResult,
	type CopilotOptimizationOptions,
	recalculateStage,
} from "./treatmentPlanCopilotTypes";

/**
 * Добавить протокол All-on-4 на верхнюю челюсть
 */
export function addAllOn4UpperJaw(
	stages: readonly TreatmentPlanStage[],
	_options: CopilotOptimizationOptions = {},
): CopilotModificationResult {
	const oldTotalRub = stages.reduce((acc, s) => acc + s.totalRub, 0);
	const auditTrail: CopilotModificationAuditItem[] = [];

	const allOn4SurgicalItems: TreatmentPlanItem[] = [
		{
			id: "allon4-upper-surgery-extractions",
			toothNumber: 11,
			code804n: "A16.07.001.002",
			name: "Атравматичное удаление несостоятельных зубов верхней челюсти с кюретажем лунок",
			category: "Хирургия",
			priceRub: 12000,
			unitPriceRub: 3000,
			discountRub: 0,
			quantity: 4,
			phase: 2,
			stageKind: "stage_2_surgery",
			materials: "Люксаторы LM Dental / Коллагеновый конус Parasorb Sombrero",
			clinicalRationale: "Санация альвеолярного отростка верхней челюсти перед установкой имплантатов",
		},
		{
			id: "allon4-upper-implants-4x",
			toothNumber: 14,
			code804n: "A16.07.054.001",
			name: "Установка 4 дентальных имплантатов по протоколу All-on-4 на верхней челюсти (2 аксиальных + 2 дистальных под углом 30-45°)",
			category: "Хирургия",
			priceRub: 152000,
			unitPriceRub: 38000,
			discountRub: 0,
			quantity: 4,
			phase: 2,
			stageKind: "stage_2_surgery",
			materials: "Имплантаты Osstem TS-IV / Nobel Biocare Speedy Groovy",
			clinicalRationale: "Биомеханическая фиксация тотального несъемного протеза в обход верхнечелюстных пазух",
		},
		{
			id: "allon4-upper-multiunits-4x",
			toothNumber: 24,
			code804n: "A16.07.054.003",
			name: "Установка 4 винтовых мультиюнит абатментов Multi-unit на верхней челюсти (прямые и угловые 17°/30°)",
			category: "Хирургия",
			priceRub: 38000,
			unitPriceRub: 9500,
			discountRub: 0,
			quantity: 4,
			phase: 2,
			stageKind: "stage_2_surgery",
			materials: "Титановые абатменты Multi-unit с винтовой фиксацией",
			clinicalRationale: "Компенсация ангуляции имплантатов и создание параллельности шахт фиксации",
		},
	];

	const allOn4OrthopedicItems: TreatmentPlanItem[] = [
		{
			id: "allon4-upper-immediate-provisional-bridge",
			toothNumber: 11,
			code804n: "A16.07.006.002",
			name: "Немедленная нагрузка (день 1-3): Несъемный адаптационный армированный винтовой акрилово-композитный протез All-on-4 на верхнюю челюсть (12 единиц)",
			category: "Ортопедия",
			priceRub: 115000,
			unitPriceRub: 115000,
			discountRub: 0,
			quantity: 1,
			phase: 3,
			stageKind: "stage_3_orthopedics",
			materials: "ПММА фрезерованный диск Yamahachi / Титановая балка армирования / винты Multi-unit",
			clinicalRationale: "Немедленное восстановление жевательной и эстетической функции в протоколе ранней нагрузки",
		},
		{
			id: "allon4-upper-permanent-zirconia-bridge",
			toothNumber: 21,
			code804n: "A16.07.006.001",
			name: "Постоянный несъемный балочный мостовидный протез на 4 имплантатах из диоксида циркония на индивидуальной титановой балке на верхнюю челюсть (через 4-6 мес.)",
			category: "Ортопедия",
			priceRub: 230000,
			unitPriceRub: 230000,
			discountRub: 0,
			quantity: 1,
			phase: 3,
			stageKind: "stage_3_orthopedics",
			materials: "Диоксид циркония Katana HTML Plus / Фрезерованная титановая балка CAD/CAM",
			clinicalRationale: "Окончательное долгосрочное протезирование после завершения остеоинтеграции",
		},
	];

	const updatedStages: TreatmentPlanStage[] = stages.map((stage) => {
		if (stage.stageNumber === 2) {
			const items = [...stage.items, ...allOn4SurgicalItems];
			auditTrail.push({
				action: "added",
				description: "Добавлен хирургический протокол All-on-4 ВЧ (4 имплантата + 4 Multi-unit)",
				stageNumber: 2,
				oldPriceRub: 0,
				newPriceRub: 202000,
				code804n: "A16.07.054.001",
				toothNumber: 14,
			});
			return recalculateStage({
				...stage,
				title: "Этап 2: Хирургический этап (All-on-4 ВЧ)",
				clinicalGoal: "Атравматичная санация и установка 4 имплантатов по протоколу All-on-4 с установкой Multi-unit",
				items,
			});
		}

		if (stage.stageNumber === 3) {
			const items = [...stage.items, ...allOn4OrthopedicItems];
			auditTrail.push({
				action: "added",
				description: "Добавлен ортопедический протокол All-on-4 ВЧ (адаптационный винтовой мост + постоянный циркониевый протез)",
				stageNumber: 3,
				oldPriceRub: 0,
				newPriceRub: 345000,
				code804n: "A16.07.006.002",
				toothNumber: 11,
			});
			return recalculateStage({
				...stage,
				title: "Этап 3: Ортопедический этап (All-on-4 ВЧ)",
				clinicalGoal: "Немедленная нагрузка адаптационным мостом и последующее постоянное циркониевое протезирование",
				items,
			});
		}

		return stage;
	});

	const newTotalRub = updatedStages.reduce((acc, s) => acc + s.totalRub, 0);
	const deltaRub = newTotalRub - oldTotalRub;

	return {
		success: true,
		commandType: "all_on_4_upper",
		commandTitle: "Добавить All-on-4 на верхнюю челюсть",
		explanation: `Протокол тотальной реабилитации All-on-4 на верхней челюсти успешно интегрирован в план лечения. Добавлена установка 4 имплантатов, мультиюнит абатментов и немедленный адаптационный винтовой мост (сдача на 3-й день). Общая стоимость плана: ${newTotalRub.toLocaleString("ru-RU")} ₽.`,
		stages: updatedStages,
		auditTrail,
		oldTotalRub,
		newTotalRub,
		deltaRub,
	};
}

/**
 * Добавить протокол All-on-4 на нижнюю челюсть
 */
export function addAllOn4LowerJaw(
	stages: readonly TreatmentPlanStage[],
	_options: CopilotOptimizationOptions = {},
): CopilotModificationResult {
	const oldTotalRub = stages.reduce((acc, s) => acc + s.totalRub, 0);
	const auditTrail: CopilotModificationAuditItem[] = [];

	const allOn4LowerSurgicalItems: TreatmentPlanItem[] = [
		{
			id: "allon4-lower-surgery-extractions",
			toothNumber: 31,
			code804n: "A16.07.001.002",
			name: "Атравматичное удаление несостоятельных зубов нижней челюсти с кюретажем лунок",
			category: "Хирургия",
			priceRub: 12000,
			unitPriceRub: 3000,
			discountRub: 0,
			quantity: 4,
			phase: 2,
			stageKind: "stage_2_surgery",
			materials: "Люксаторы LM Dental / Коллагеновый конус Parasorb Sombrero",
			clinicalRationale: "Санация альвеолярной части нижней челюсти перед установкой имплантатов",
		},
		{
			id: "allon4-lower-implants-4x",
			toothNumber: 34,
			code804n: "A16.07.054.001",
			name: "Установка 4 дентальных имплантатов по протоколу All-on-4 на нижней челюсти (между ментальными отверстиями с ангуляцией дистальных имплантатов)",
			category: "Хирургия",
			priceRub: 148000,
			unitPriceRub: 37000,
			discountRub: 0,
			quantity: 4,
			phase: 2,
			stageKind: "stage_2_surgery",
			materials: "Имплантаты Osstem TS-III SA / Nobel Biocare Speedy Groovy",
			clinicalRationale: "Биомеханическая фиксация в плотной костной ткани нижней челюсти (D1/D2) с обходом n. alveolaris inferior",
		},
		{
			id: "allon4-lower-multiunits-4x",
			toothNumber: 44,
			code804n: "A16.07.054.003",
			name: "Установка 4 винтовых мультиюнит абатментов Multi-unit на нижней челюсти (прямые и угловые 17°/30°)",
			category: "Хирургия",
			priceRub: 38000,
			unitPriceRub: 9500,
			discountRub: 0,
			quantity: 4,
			phase: 2,
			stageKind: "stage_2_surgery",
			materials: "Титановые абатменты Multi-unit с винтовой фиксацией",
			clinicalRationale: "Компенсация наклона имплантатов и создание параллельности винтовых шахт",
		},
	];

	const allOn4LowerOrthopedicItems: TreatmentPlanItem[] = [
		{
			id: "allon4-lower-immediate-provisional-bridge",
			toothNumber: 31,
			code804n: "A16.07.006.002",
			name: "Немедленная нагрузка (день 1-3): Несъемный адаптационный армированный винтовой акрилово-композитный протез All-on-4 на нижнюю челюсть (12 единиц)",
			category: "Ортопедия",
			priceRub: 110000,
			unitPriceRub: 110000,
			discountRub: 0,
			quantity: 1,
			phase: 3,
			stageKind: "stage_3_orthopedics",
			materials: "ПММА фрезерованный диск Yamahachi / Титановая балка армирования / винты Multi-unit",
			clinicalRationale: "Немедленное восстановление жевательной и речевой функции в протоколе ранней нагрузки",
		},
		{
			id: "allon4-lower-permanent-zirconia-bridge",
			toothNumber: 41,
			code804n: "A16.07.006.001",
			name: "Постоянный несъемный балочный мостовидный протез на 4 имплантатах из диоксида циркония на индивидуальной титановой балке на нижнюю челюсть (через 3-4 мес.)",
			category: "Ортопедия",
			priceRub: 220000,
			unitPriceRub: 220000,
			discountRub: 0,
			quantity: 1,
			phase: 3,
			stageKind: "stage_3_orthopedics",
			materials: "Диоксид циркония Katana HTML Plus / Фрезерованная титановая балка CAD/CAM",
			clinicalRationale: "Окончательное долгосрочное протезирование нижней челюсти после полной остеоинтеграции",
		},
	];

	const updatedStages: TreatmentPlanStage[] = stages.map((stage) => {
		if (stage.stageNumber === 2) {
			const items = [...stage.items, ...allOn4LowerSurgicalItems];
			auditTrail.push({
				action: "added",
				description: "Добавлен хирургический протокол All-on-4 НЧ (4 имплантата + 4 Multi-unit)",
				stageNumber: 2,
				oldPriceRub: 0,
				newPriceRub: 198000,
				code804n: "A16.07.054.001",
				toothNumber: 34,
			});
			return recalculateStage({
				...stage,
				title: "Этап 2: Хирургический этап (All-on-4 НЧ)",
				clinicalGoal: "Атравматичная санация и установка 4 имплантатов по протоколу All-on-4 НЧ с установкой Multi-unit",
				items,
			});
		}

		if (stage.stageNumber === 3) {
			const items = [...stage.items, ...allOn4LowerOrthopedicItems];
			auditTrail.push({
				action: "added",
				description: "Добавлен ортопедический протокол All-on-4 НЧ (адаптационный винтовой мост + постоянный циркониевый протез)",
				stageNumber: 3,
				oldPriceRub: 0,
				newPriceRub: 330000,
				code804n: "A16.07.006.002",
				toothNumber: 31,
			});
			return recalculateStage({
				...stage,
				title: "Этап 3: Ортопедический этап (All-on-4 НЧ)",
				clinicalGoal: "Немедленная нагрузка адаптационным мостом НЧ и последующее постоянное циркониевое протезирование",
				items,
			});
		}

		return stage;
	});

	const newTotalRub = updatedStages.reduce((acc, s) => acc + s.totalRub, 0);
	const deltaRub = newTotalRub - oldTotalRub;

	return {
		success: true,
		commandType: "all_on_4_lower",
		commandTitle: "Добавить All-on-4 на нижнюю челюсть",
		explanation: `Протокол тотальной реабилитации All-on-4 на нижней челюсти успешно интегрирован в план лечения. Добавлена установка 4 имплантатов в межментальной зоне, мультиюнит абатментов и немедленный адаптационный винтовой мост (сдача на 3-й день). Общая стоимость плана: ${newTotalRub.toLocaleString("ru-RU")} ₽.`,
		stages: updatedStages,
		auditTrail,
		oldTotalRub,
		newTotalRub,
		deltaRub,
	};
}
