/**
 * apps/web/src/components/sanpin/sanpinNavigationConfig.ts
 *
 * Каноническая конфигурация навигации СанПиН и стерилизации (Мандаты 8b, 8x).
 * - Живой клинический язык: «Журнал автоклавирования», «Контроль очистки инструментов»,
 *   «Учет ламп и уборок», «Оборудование стерилизационной».
 * - Никаких советских номеров приказов и форм.
 */

import {
	Flame,
	FlaskConical,
	Sparkles,
	Trash2,
	Settings,
} from "lucide-react";
import React from "react";

export type SanpinRegisterTab =
	| "autoclave"
	| "pso"
	| "cleaning"
	| "disinfection"
	| "uv_cleaning"
	| "waste"
	| "sterilizers"
	| "fleet"
	// Legacy aliases to prevent breakage if referenced
	| "bactericidal"
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
		label: "Журнал автоклавов",
		shortLabel: "Автоклав",
		icon: Flame,
	},
	{
		id: "pso",
		label: "Контроль очистки (ПСО)",
		shortLabel: "Очистка",
		icon: FlaskConical,
	},
	{
		id: "disinfection",
		label: "Уборка и дезинфекция",
		shortLabel: "Уборка и лампы",
		icon: Sparkles,
	},
	{
		id: "waste",
		label: "Медицинские отходы",
		shortLabel: "Медотходы",
		icon: Trash2,
	},
	{
		id: "sterilizers",
		label: "Оборудование ЦСО",
		shortLabel: "Оборудование",
		icon: Settings,
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
