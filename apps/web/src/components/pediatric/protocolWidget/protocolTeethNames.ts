import type { PediatricSedationState, PediatricSurfacePreset } from "./types";

export const PEDIATRIC_TEETH_NAMES: Readonly<Record<number, string>> = {
	51: "Верхний правый центральный резец",
	52: "Верхний правый боковой резец",
	53: "Верхний правый клык",
	54: "Верхний правый первый моляр",
	55: "Верхний правый второй моляр",
	61: "Верхний левый центральный резец",
	62: "Верхний левый боковой резец",
	63: "Верхний левый клык",
	64: "Верхний левый первый моляр",
	65: "Верхний левый второй моляр",
	71: "Нижний левый центральный резец",
	72: "Нижний левый боковой резец",
	73: "Нижний левый клык",
	74: "Нижний левый первый моляр",
	75: "Нижний левый второй моляр",
	81: "Нижний правый центральный резец",
	82: "Нижний правый боковой резец",
	83: "Нижний правый клык",
	84: "Нижний правый первый моляр",
	85: "Нижний правый второй моляр",
	16: "Верхний правый первый постоянный моляр",
	26: "Верхний левый первый постоянный моляр",
	36: "Нижний левый первый постоянный моляр",
	46: "Нижний правый первый постоянный моляр",
};

export const PEDIATRIC_SURFACE_PRESETS: readonly PediatricSurfacePreset[] = [
	{ id: "mod", labelRu: "MOD", surfaces: ["M", "O", "D"], descriptionRu: "Медиально-окклюзионно-дистальная" },
	{ id: "mo", labelRu: "MO", surfaces: ["M", "O"], descriptionRu: "Медиально-окклюзионная" },
	{ id: "od", labelRu: "OD", surfaces: ["O", "D"], descriptionRu: "Окклюзионно-дистальная" },
	{ id: "o", labelRu: "O", surfaces: ["O"], descriptionRu: "Окклюзионная" },
	{ id: "v", labelRu: "V", surfaces: ["V"], descriptionRu: "Вестибулярная / пришеечная" },
	{ id: "lp", labelRu: "L/P", surfaces: ["L"], descriptionRu: "Оральная (язычная/небная)" },
] as const;

export const QUICK_PEDIATRIC_TEETH = [
	54, 55, 64, 65, 74, 75, 84, 85, 51, 61, 16, 26, 36, 46,
] as const;

export const DEFAULT_SEDATION_STATE: PediatricSedationState = {
	enabled: false,
	gasRatioN2O: 40,
	gasRatioO2: 60,
	spO2Percent: 99,
	pulseBpm: 92,
	durationMinutes: 20,
	postOxygenationMinutes: 5,
};
