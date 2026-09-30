import type { ToothState, ToothData } from "./ToothChart";
import {
	ALL_ADULT_TEETH_NUMBERS,
	PEDIATRIC_TOP_TEETH,
	PEDIATRIC_BOTTOM_TEETH,
	createDefaultAdultTeethData,
} from "./ToothChart";
import type { PanelSubject } from "../../lib/panelStateText";
import { DEMO_SHOWCASE_TEETH } from "../treatment-plans/treatmentPlanStagesEngine";

/**
 * Состояния зуба, доступные врачу в контекстном меню.
 *
 * Порядок — по частоте записи на приёме: сначала находки, затем
 * выполненные работы, затем план и «здоров».
 *
 * Набор обязан покрывать весь тип ToothState и перечисление
 * toothStateValues на сервере: раньше в меню было шесть состояний из
 * восьми, и «Пломба» с «Имплантат в плане» выставить было нельзя,
 * хотя сервер их принимал и одонтограмма их рисовала.
 */
export const TOOTH_STATE_ACTIONS: ReadonlyArray<{
	state: ToothState;
	label: string;
	className: string;
}> = [
	{
		state: "Caries",
		label: "Кариес (C)",
		className:
			"bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 hover:bg-rose-500/20",
	},
	{
		state: "Pulpitis",
		label: "Пульпит (P)",
		className:
			"bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 hover:bg-rose-500/20",
	},
	{
		state: "Periodontitis",
		label: "Периодонтит (Pt)",
		className:
			"bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20",
	},
	{
		state: "Filled",
		label: "Пломба (F)",
		className:
			"bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 hover:bg-blue-500/20",
	},
	{
		state: "Crown",
		label: "Коронка (Cr)",
		className:
			"bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 hover:bg-blue-500/20",
	},
	{
		state: "Implant",
		label: "Имплант (Imp)",
		className:
			"bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20",
	},
	{
		state: "Planned_Implant",
		label: "Имплант в плане",
		className:
			"bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/20",
	},
	{
		state: "Missing",
		label: "Отсутствует (X)",
		className:
			"bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20 hover:bg-slate-500/20",
	},
	{
		state: "Retained",
		label: "Ретинированный (Р)",
		className:
			"bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 hover:bg-purple-500/20",
	},
	{
		state: "Root",
		label: "Корень (R)",
		className:
			"bg-rose-950/20 text-rose-800 dark:text-rose-300 border-rose-800/30 hover:bg-rose-900/30",
	},
	{
		state: "Healthy",
		label: "Здоров (0)",
		className:
			"bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20",
	},
];

/**
 * Как называется содержимое схемы в трёх её состояниях.
 *
 * Пустоты у формулы своей нет: схема рисует все зубы всегда, и «нет отметок»
 * означает лишь то, что диагнозов пока не ставили. Опасно здесь другое —
 * непрочитанная формула, которая выглядит ровно как формула здорового рта.
 */
export const TEETH_SUBJECT: PanelSubject = {
	notLoadedTitle: "Зубная формула не прочитана",
	accusative: "формулу пациента",
	emptyTitle: "Отметок на зубах пока нет",
	emptyHint: "Нажмите на зуб и выберите состояние — оно попадёт в карту сразу.",
	failureConsequence:
		"Схема ниже показывает зубы БЕЗ отметок — это не значит, что зубы здоровы: диагнозы, пломбы и коронки не прочитаны. Не считайте формулу полной и не печатайте её пациенту, пока она не загрузится.",
};

export function getInitialShowcaseTeeth(pediatricMode?: boolean): ToothData[] {
	const base = pediatricMode
		? [...PEDIATRIC_TOP_TEETH, ...PEDIATRIC_BOTTOM_TEETH].map((toothNumber) => ({
				toothNumber,
				state: "Healthy" as ToothState,
			}))
		: createDefaultAdultTeethData();
	if (pediatricMode) return base;
	return base.map((t) => {
		const demo = DEMO_SHOWCASE_TEETH.find((d) => d.toothNumber === t.toothNumber);
		return demo ? { ...t, ...demo } : t;
	});
}
