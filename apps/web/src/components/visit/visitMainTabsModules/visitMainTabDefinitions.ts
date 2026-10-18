import React from "react";
import { Activity, FileText, Stethoscope, Image as ImageIcon, ShieldCheck } from "lucide-react";

export type VisitSubViewTab =
	| "emk"
	| "odontogram"
	| "anamnesis"
	| "diagnostics"
	| "consents";

export interface TabItemConfig {
	readonly id: VisitSubViewTab;
	readonly testId: string;
	readonly icon: React.ComponentType<{ size?: number; className?: string }>;
	readonly shortLabel: string;
	readonly fullLabel: string;
	readonly minHeightClass?: string;
}

export const VISIT_MAIN_TAB_ITEMS: readonly TabItemConfig[] = [
	{
		id: "odontogram",
		testId: "visit-subtab-odontogram",
		icon: Activity,
		shortLabel: "Формула",
		fullLabel: "Зубная формула и Дневник",
		minHeightClass: "min-h-[38px] sm:min-h-[32px] h-9 sm:h-8",
	},
	{
		id: "emk",
		testId: "visit-subtab-emk",
		icon: FileText,
		shortLabel: "Карта",
		fullLabel: "ЭМК и Диктовка",
		minHeightClass: "min-h-[38px] sm:min-h-[32px] h-9 sm:h-8",
	},
	{
		id: "anamnesis",
		testId: "visit-subtab-anamnesis",
		icon: Stethoscope,
		shortLabel: "Анамнез",
		fullLabel: "Анамнез и Жалобы",
		minHeightClass: "min-h-[38px] sm:min-h-[32px] h-9 sm:h-8",
	},
	{
		id: "diagnostics",
		testId: "visit-subtab-diagnostics",
		icon: ImageIcon,
		shortLabel: "Снимки",
		fullLabel: "Рентгены и Диагностика",
		minHeightClass: "min-h-[38px] sm:min-h-[32px] h-9 sm:h-8",
	},
	{
		id: "consents",
		testId: "visit-subtab-consents",
		icon: ShieldCheck,
		shortLabel: "Согласия",
		fullLabel: "Согласия",
		minHeightClass: "min-h-[44px] sm:min-h-[32px] h-11 sm:h-8",
	},
] as const;
