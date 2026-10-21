import { type TreatmentPlanStageKind, romanizeStageNumber } from "../types.js";

export interface PhaseMetadata {
	stageKind: TreatmentPlanStageKind;
	title: string;
	subtitle: string;
	clinicalGoal: string;
	estimatedWeeks: number;
}

export function resolvePhaseMetadata(phaseNumber: number): PhaseMetadata {
	if (phaseNumber === 2) {
		return {
			stageKind: "stage_2_surgery",
			title: "Этап II: Хирургия и дентальная имплантация",
			subtitle: "Удаление несостоятельных зубов, пластика кости и установка имплантатов",
			clinicalGoal: "Восстановление костной опоры и подготовка к протезированию",
			estimatedWeeks: 12,
		};
	}
	if (phaseNumber === 3) {
		return {
			stageKind: "stage_3_orthopedics",
			title: "Этап III: Ортопедическая реабилитация",
			subtitle: "Прецизионные коронки, мостовидные протезы и функциональная окклюзия",
			clinicalGoal: "Полное восстановление жевательной эффективности и эстетики",
			estimatedWeeks: 4,
		};
	}
	if (phaseNumber === 4) {
		return {
			stageKind: "stage_4_orthodontics",
			title: "Этап IV: Ортодонтическое лечение",
			subtitle: "Нормализация окклюзии, исправление прикуса и положения зубов",
			clinicalGoal: "Формирование стабильного физиологического прикуса",
			estimatedWeeks: 2,
		};
	}
	if (phaseNumber === 5) {
		return {
			stageKind: "stage_5_periodontics",
			title: "Этап V: Пародонтология и профилактика",
			subtitle: "Вектор-терапия, кюретаж, стабилизация десны и поддерживающий протокол",
			clinicalGoal: "Ликвидация пародонтальных карманов и защита от рецидивов",
			estimatedWeeks: 2,
		};
	}
	if (phaseNumber > 5) {
		return {
			stageKind: "stage_custom",
			title: `Этап ${romanizeStageNumber(phaseNumber)}: Клинический этап`,
			subtitle: "Специализированные процедуры по индивидуальному плану",
			clinicalGoal: "Достижение согласованного клинического результата",
			estimatedWeeks: 2,
		};
	}

	return {
		stageKind: "stage_1_therapy",
		title: `Этап ${romanizeStageNumber(phaseNumber)}: Терапевтическая санация`,
		subtitle: "Купирование очагов воспаления, лечение кариеса и эндодонтия",
		clinicalGoal: "Полная санация полости рта и подготовка к последующим этапам",
		estimatedWeeks: 2,
	};
}
