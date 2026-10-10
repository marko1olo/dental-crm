import {
	Activity,
	Droplets,
	Flame,
	FlaskConical,
	Gauge,
	PackageCheck,
	Recycle,
	ShieldAlert,
	ShieldCheck,
	Sparkles,
	Thermometer,
	Trash2,
	Wind,
} from "lucide-react";
import React from "react";

export type SanpinRegisterTab =
	| "retroactive_batch"
	| "cabinet_readiness"
	| "pso"
	| "autoclave"
	| "kraft"
	| "sterilizers"
	| "bactericidal"
	| "cleaning"
	| "waste"
	| "biohazard"
	| "temperature"
	| "disinfectants"
	| "bac_lab"
	| "needle_disposal";

export type SanpinCategory = "sterilization" | "disinfection" | "waste_climate";

export interface SanpinTabDef {
	id: SanpinRegisterTab;
	label: string;
	shortLabel: string;
	category: SanpinCategory;
	icon: React.ComponentType<{ size?: number; color?: string; className?: string }>;
}

export interface SanpinCategoryDef {
	id: SanpinCategory;
	label: string;
	shortLabel: string;
	icon: React.ComponentType<{ size?: number; color?: string; className?: string }>;
	tabs: SanpinTabDef[];
}

export const SANPIN_CATEGORIES: SanpinCategoryDef[] = [
	{
		id: "sterilization",
		label: "Стерилизация",
		shortLabel: "Стерилизация",
		icon: Flame,
		tabs: [
			{ id: "autoclave", label: "Журнал работы стерилизаторов (автоклавов)", shortLabel: "Автоклавы", category: "sterilization", icon: Flame },
			{ id: "kraft", label: "Крафт-пакеты и маркировка", shortLabel: "Крафт-пакеты", category: "sterilization", icon: PackageCheck },
			{ id: "sterilizers", label: "Парк стерилизаторов", shortLabel: "Оборудование", category: "sterilization", icon: Gauge },
			{ id: "pso", label: "Контроль предстерилизационной очистки (азопирам)", shortLabel: "Контроль ПСО", category: "sterilization", icon: FlaskConical },
			{ id: "cabinet_readiness", label: "Готовность кабинета к приёму", shortLabel: "Готовность кабинета", category: "sterilization", icon: ShieldCheck },
			{ id: "retroactive_batch", label: "Сухожар и пакетное закрытие", shortLabel: "Сухожар", category: "sterilization", icon: Sparkles },
		],
	},
	{
		id: "disinfection",
		label: "Уборки и дезинфекция",
		shortLabel: "Уборки",
		icon: Sparkles,
		tabs: [
			{ id: "disinfectants", label: "Дезсредства и растворы", shortLabel: "Дезсредства", category: "disinfection", icon: Droplets },
			{ id: "bactericidal", label: "Обеззараживание воздуха (рециркуляторы)", shortLabel: "Чистый воздух", category: "disinfection", icon: Wind },
			{ id: "cleaning", label: "Генеральные уборки", shortLabel: "Генуборки", category: "disinfection", icon: Sparkles },
			{ id: "bac_lab", label: "Проверка стерильности (смывы)", shortLabel: "Смывы", category: "disinfection", icon: Activity },
		],
	},
	{
		id: "waste_climate",
		label: "Отходы и микроклимат",
		shortLabel: "Отходы",
		icon: Recycle,
		tabs: [
			{ id: "waste", label: "Утилизация отходов", shortLabel: "Отходы", category: "waste_climate", icon: Recycle },
			{ id: "needle_disposal", label: "Утилизация игл", shortLabel: "Иглы", category: "waste_climate", icon: Trash2 },
			{ id: "temperature", label: "Температура холодильников", shortLabel: "Холодильники", category: "waste_climate", icon: Thermometer },
			{ id: "biohazard", label: "Журнал аварийных ситуаций", shortLabel: "Аварии", category: "waste_climate", icon: ShieldAlert },
		],
	},
];

export const SANPIN_TABS: Array<{
	id: SanpinRegisterTab;
	label: string;
	icon: React.ComponentType<{ size?: number; color?: string; className?: string }>;
}> = SANPIN_CATEGORIES.flatMap((c) => c.tabs);
