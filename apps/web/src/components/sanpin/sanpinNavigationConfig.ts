import {
	Flame,
	FlaskConical,
	Sparkles,
} from "lucide-react";
import React from "react";

export type SanpinRegisterTab =
	| "autoclave"
	| "pso"
	| "disinfection"
	// Legacy aliases to prevent breakage if referenced
	| "cleaning"
	| "bactericidal"
	| "sterilizers"
	| "kraft"
	| "retroactive_batch"
	| "cabinet_readiness";

export interface SanpinTabDef {
	id: SanpinRegisterTab;
	label: string;
	shortLabel: string;
	icon: React.ComponentType<{ size?: number; color?: string; className?: string }>;
}

export const SANPIN_CANONICAL_TABS: SanpinTabDef[] = [
	{
		id: "autoclave",
		label: "Журнал автоклавирования и стерилизации",
		shortLabel: "Автоклавирование",
		icon: Flame,
	},
	{
		id: "pso",
		label: "Контроль предстерилизационной очистки (азопирамовая проба)",
		shortLabel: "Контроль очистки (азопирам)",
		icon: FlaskConical,
	},
	{
		id: "disinfection",
		label: "Журнал кварцевания и генеральных уборок",
		shortLabel: "Кварцевание и уборки",
		icon: Sparkles,
	},
];

export const SANPIN_TABS: Array<{
	id: SanpinRegisterTab;
	label: string;
	icon: React.ComponentType<{ size?: number; color?: string; className?: string }>;
}> = SANPIN_CANONICAL_TABS.map((t) => ({ id: t.id, label: t.label, icon: t.icon }));

// Backward-compatible category stub for legacy imports
export interface SanpinCategoryDef {
	id: string;
	label: string;
	shortLabel: string;
	icon: React.ComponentType<{ size?: number; color?: string; className?: string }>;
	tabs: SanpinTabDef[];
}

export const SANPIN_CATEGORIES: SanpinCategoryDef[] = [
	{
		id: "sterilization",
		label: "Стерилизация и дезинфекция",
		shortLabel: "Стерилизация",
		icon: Flame,
		tabs: SANPIN_CANONICAL_TABS,
	},
];
