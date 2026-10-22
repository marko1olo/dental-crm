/**
 * apps/web/src/components/patients/formula/formulaConstants.ts
 *
 * Анатомические константы зубного ряда и штампы (Мандат 8b)
 */

import type { StampOption } from "./formulaTypes";

export const ALL_PERMANENT_TEETH: readonly number[] = [
	18, 17, 16, 15, 14, 13, 12, 11,
	21, 22, 23, 24, 25, 26, 27, 28,
	48, 47, 46, 45, 44, 43, 42, 41,
	31, 32, 33, 34, 35, 36, 37, 38,
];

export const ALL_DECIDUOUS_TEETH: readonly number[] = [
	55, 54, 53, 52, 51,
	61, 62, 63, 64, 65,
	85, 84, 83, 82, 81,
	71, 72, 73, 74, 75,
];

export const WISDOM_TEETH: readonly number[] = [18, 28, 38, 48];

export const STAMP_OPTIONS: readonly StampOption[] = [
	{ state: "Healthy", label: "Норма (N)", colorClass: "bg-emerald-600 text-white" },
	{ state: "Caries", label: "Кариес (C)", colorClass: "bg-rose-500 text-white" },
	{ state: "Pulpitis", label: "Пульпит (P)", colorClass: "bg-amber-600 text-white" },
	{ state: "Periodontitis", label: "Периодонтит (Pt)", colorClass: "bg-purple-600 text-white" },
	{ state: "Filled", label: "Пломба (F)", colorClass: "bg-teal-600 text-white" },
	{ state: "Crown", label: "Коронка (Cr)", colorClass: "bg-blue-600 text-white" },
	{ state: "Implant", label: "Имплант (Im)", colorClass: "bg-indigo-600 text-white" },
	{ state: "Missing", label: "Удален (R)", colorClass: "bg-slate-600 text-white" },
];
