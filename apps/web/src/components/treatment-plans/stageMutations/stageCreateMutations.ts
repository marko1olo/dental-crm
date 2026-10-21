import type { Kopecks } from "@dental/shared";
import type { TreatmentPlanStage, TreatmentPlanStageKind } from "../types.js";
import { romanizeStageNumber } from "../types.js";

export function createNewStageInPlan(
	stages: readonly TreatmentPlanStage[],
	presetKind: "therapy" | "surgery" | "orthopedics" | "orthodontics" | "periodontics" | "custom",
	customTitle?: string,
): { nextStages: TreatmentPlanStage[]; createdTitle: string } {
	const newStageNumber = stages.length > 0 ? Math.max(...stages.map((s) => s.stageNumber)) + 1 : 1;
	let stageKind: TreatmentPlanStageKind = "stage_1_therapy";
	let title = `Этап ${romanizeStageNumber(newStageNumber)}: ${customTitle || "Терапевтический этап"}`;
	let subtitle = "Санация и терапевтические процедуры";
	let clinicalGoal = "Полная санация и купирование воспалительных процессов";

	if (presetKind === "surgery") {
		stageKind = "stage_2_surgery";
		title = `Этап ${romanizeStageNumber(newStageNumber)}: ${customTitle || "Хирургический этап и имплантация"}`;
		subtitle = "Удаление несостоятельных зубов, пластика и имплантация";
		clinicalGoal = "Восстановление костной опоры и подготовка к протезированию";
	} else if (presetKind === "orthopedics") {
		stageKind = "stage_3_orthopedics";
		title = `Этап ${romanizeStageNumber(newStageNumber)}: ${customTitle || "Ортопедическая реабилитация"}`;
		subtitle = "Коронки, мостовидные протезы и функциональная окклюзия";
		clinicalGoal = "Восстановление жевательной функции и эстетики";
	} else if (presetKind === "orthodontics") {
		stageKind = "stage_4_orthodontics";
		title = `Этап ${romanizeStageNumber(newStageNumber)}: ${customTitle || "Ортодонтическое лечение"}`;
		subtitle = "Нормализация окклюзии, исправление прикуса";
		clinicalGoal = "Формирование стабильного правильного прикуса";
	} else if (presetKind === "periodontics") {
		stageKind = "stage_5_periodontics";
		title = `Этап ${romanizeStageNumber(newStageNumber)}: ${customTitle || "Пародонтология и профилактика"}`;
		subtitle = "Вектор-терапия, кюретаж и стабилизация пародонта";
		clinicalGoal = "Купирование воспаления десны и защита от рецидивов";
	} else if (presetKind === "custom") {
		stageKind = "stage_custom";
		title = `Этап ${romanizeStageNumber(newStageNumber)}: ${customTitle || "Индивидуальный клинический этап"}`;
		subtitle = "Специализированный протокол лечения";
		clinicalGoal = "Выполнение индивидуальных клинических назначений";
	}

	const newStage: TreatmentPlanStage = {
		stageNumber: newStageNumber,
		stageKind,
		title,
		subtitle,
		clinicalGoal,
		items: [],
		totalRub: 0,
		totalKopecks: 0 as Kopecks,
		estimatedVisits: 1,
		estimatedWeeks: 2,
		serviceCatalogCodes: [],
		order804nCodes: [],
		status: "agreed",
	};

	return {
		nextStages: [...stages, newStage],
		createdTitle: title,
	};
}
