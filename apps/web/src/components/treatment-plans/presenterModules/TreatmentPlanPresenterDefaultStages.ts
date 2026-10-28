import type { TreatmentPlanStage } from "../treatmentPlanTypes";

export const DEFAULT_PRESENTER_STAGES: readonly TreatmentPlanStage[] = [
	{
		id: "st-1",
		stageNumber: 1,
		title: "Этап 1: Терапевтическая подготовка",
		subtitle: "Санация полости рта",
		clinicalGoal: "Устранение воспалительных процессов и кариеса",
		totalRub: 14500,
		items: [
			{ id: "it-1", toothNumber: 16, code804n: "A16.07.002", name: "Восстановление зуба пломбой световой полимеризации", priceRub: 5500, quantity: 1 },
			{ id: "it-2", toothNumber: 26, code804n: "A16.07.030", name: "Эндодонтическое лечение корневого канала", priceRub: 9000, quantity: 1 },
		],
	},
	{
		id: "st-2",
		stageNumber: 2,
		title: "Этап 2: Хирургический этап",
		subtitle: "Установка дентальных имплантатов",
		clinicalGoal: "Восстановление утраченных опорных единиц",
		totalRub: 45000,
		items: [
			{ id: "it-3", toothNumber: 36, code804n: "A16.07.054", name: "Установка дентального имплантата SLA", priceRub: 45000, quantity: 1 },
		],
	},
	{
		id: "st-3",
		stageNumber: 3,
		title: "Этап 3: Ортопедическая реабилитация",
		subtitle: "Постоянные коронки из диоксида циркония",
		clinicalGoal: "Восстановление анатомической формы и жевательной функции",
		totalRub: 26500,
		items: [
			{ id: "it-4", toothNumber: 36, code804n: "A16.07.004", name: "Установка коронки из диоксида циркония на имплантате", priceRub: 26500, quantity: 1 },
		],
	},
];
