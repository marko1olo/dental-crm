import type { PhaseOption } from "../clinicalTasksTypes";

export const PHASE_OPTIONS: readonly PhaseOption[] = [
	{
		code: "PHASE_1_THERAPY",
		buttonLabel: "Завершить терапию — передать на ортопедию",
		hint: "Создаст задачу «Этап II: передача в ортопедию».",
	},
	{
		code: "PHASE_2_SURGERY",
		buttonLabel: "Завершить хирургию — передать на ортопедию",
		hint: "Создаст задачу «Этап II: передача в ортопедию после хирургии».",
	},
];
