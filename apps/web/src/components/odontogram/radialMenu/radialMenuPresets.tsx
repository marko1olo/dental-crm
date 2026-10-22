import React from "react";
import { AlertTriangle, Sparkles, Trash2 } from "lucide-react";
import {
	DentalCrown,
	DentalImplant,
	EndoFileCanal,
	ToothCaries,
	ToothDeciduous,
	ToothExtractForceps,
	ToothMolar,
	ToothPulpitis,
} from "../../icons/DentalIcons";
import type { RadialMenuItem } from "./radialMenuTypes";

export const SURFACE_CHIPS = [
	{ label: "O", surfs: ["O"], title: "Окклюзионная (O/Жевательная)" },
	{ label: "M", surfs: ["M"], title: "Медиальная (M)" },
	{ label: "D", surfs: ["D"], title: "Дистальная (D)" },
	{ label: "V", surfs: ["V"], title: "Вестибулярная (V)" },
	{ label: "L", surfs: ["L"], title: "Язычная / Нёбная (L)" },
	{ label: "MOD", surfs: ["M", "O", "D"], title: "Медиально-окклюзионно-дистальная (MOD)" },
	{ label: "MO", surfs: ["M", "O"], title: "Медиально-окклюзионная (MO)" },
	{ label: "OD", surfs: ["O", "D"], title: "Окклюзионно-дистальная (OD)" },
] as const;

export function buildPrimaryRadialItems(isPrimary: boolean): RadialMenuItem[] {
	return [
		{
			id: "healthy", label: "Здоров / Интактный (0)", shortLabel: "Здоров", state: "Healthy",
			icon: isPrimary ? <ToothDeciduous size={18} className="text-emerald-500 shrink-0" /> : <ToothMolar size={18} className="text-emerald-500 shrink-0" />,
			color: "text-emerald-600 dark:text-emerald-400", bgGradient: "", hotkey: "0",
		},
		{
			id: "caries", label: "Кариес (C)", shortLabel: "Кариес", state: "Caries",
			icon: <ToothCaries size={18} className="text-amber-500 shrink-0" />,
			color: "text-amber-600 dark:text-amber-400", bgGradient: "", hotkey: "К",
		},
		{
			id: "filled", label: "Пломба / Реставрация (F)", shortLabel: "Пломба", state: "Filled",
			icon: <Sparkles size={18} className="text-sky-500 shrink-0" />,
			color: "text-sky-600 dark:text-sky-400", bgGradient: "", hotkey: "П",
		},
		{
			id: "pulpitis", label: "Пульпит / Эндодонтия (P)", shortLabel: "Пульпит", state: "Pulpitis",
			icon: <ToothPulpitis size={18} className="text-rose-500 shrink-0" />,
			color: "text-rose-600 dark:text-rose-400", bgGradient: "", hotkey: "Ф",
		},
		{
			id: "crown", label: "Коронка / Протезирование (Cr)", shortLabel: "Коронка", state: "Crown",
			icon: <DentalCrown size={18} className="text-teal-500 shrink-0" />,
			color: "text-teal-600 dark:text-teal-400", bgGradient: "", hotkey: "Ц",
		},
		{
			id: "missing", label: "Удален / Отсутствует (X)", shortLabel: "Удален", state: "Missing",
			icon: <Trash2 size={18} className="text-slate-400 shrink-0" />,
			color: "text-slate-600 dark:text-slate-300", bgGradient: "", hotkey: "X",
		},
	];
}

export function buildSecondaryRadialItems(): RadialMenuItem[] {
	return [
		{
			id: "periodontitis", label: "Периодонтит (Pt)", shortLabel: "Периодонтит", state: "Periodontitis",
			icon: <EndoFileCanal size={16} className="text-orange-500 shrink-0" />,
			color: "text-orange-600 dark:text-orange-400", bgGradient: "", hotkey: "Е",
		},
		{
			id: "implant", label: "Имплант (Imp)", shortLabel: "Имплант", state: "Implant",
			icon: <DentalImplant size={16} className="text-indigo-500 shrink-0" />,
			color: "text-indigo-600 dark:text-indigo-400", bgGradient: "", hotkey: "И",
		},
		{
			id: "root", label: "Разрушенный корень (R)", shortLabel: "Корень", state: "Root",
			icon: <ToothExtractForceps size={16} className="text-rose-600 shrink-0" />,
			color: "text-rose-700 dark:text-rose-300", bgGradient: "", hotkey: "R",
		},
		{
			id: "retained", label: "Ретинированный зуб (Р)", shortLabel: "Ретинирован", state: "Retained",
			icon: <AlertTriangle size={16} className="text-purple-500 shrink-0" />,
			color: "text-purple-600 dark:text-purple-400", bgGradient: "", hotkey: "Р",
		},
	];
}
