/**
 * presets.ts — Пресеты 3D рендеринга и идентификаторы вьюпортов (Мандат 8b <= 120 строк).
 */

import { VIEWPORT_IDS as BASE_VIEWPORT_IDS } from "../cornerstoneTypes";

export const VIEWPORT_IDS = {
	...BASE_VIEWPORT_IDS,
	volume3d: "VOLUME_3D",
} as const;

export const DENTAL_SKULL_BONE_PRESET = {
	name: "Dental-Skull-Bone",
	gradientOpacity: "4 0 1 255 1",
	specularPower: "15",
	scalarOpacity: "10 -1000 0 150 0 350 0.25 800 0.70 2000 0.85",
	specular: "0.25",
	shade: "1",
	ambient: "0.15",
	colorTransfer: "20 -1000 0 0 0 150 0.7 0.3 0.2 350 0.85 0.65 0.45 800 0.95 0.88 0.75 2000 1 1 1",
	diffuse: "0.85",
	interpolation: "1",
} as const;

export interface Volume3DPresetSpec {
	id: string;
	name: string;
	label: string;
	description: string;
	huRange: string;
	preset: any;
}

export const VOLUME_3D_PRESETS: readonly Volume3DPresetSpec[] = [
	{
		id: "bone",
		name: "CT-Bone",
		label: "Кость (CT-Bone)",
		description: "Стандартная клиническая реконструкция костной ткани",
		huRange: "150..2000 HU",
		preset: "CT-Bone",
	},
	{
		id: "skull_jaw",
		name: "Dental-Skull-Bone",
		label: "Череп / Челюсти",
		description: "Оптимизировано для челюстно-лицевой хирургии и имплантации",
		huRange: "150..2000 HU",
		preset: DENTAL_SKULL_BONE_PRESET,
	},
	{
		id: "dense_bone",
		name: "CT-Bones",
		label: "Плотная кость / Зубы",
		description: "Высококонтрастная кортикальная пластинка и зубной ряд",
		huRange: "400..3000 HU",
		preset: "CT-Bones",
	},
	{
		id: "tissue_bone",
		name: "CT-Chest-Vessels",
		label: "Ткани + Кость",
		description: "Визуализация мягкотканного контура лица и кости",
		huRange: "-200..1500 HU",
		preset: "CT-Chest-Vessels",
	},
	{
		id: "airway",
		name: "CT-Air",
		label: "Дыхательные пути",
		description: "Просвет воздухоносных путей и верхнечелюстных пазух",
		huRange: "-1000..-200 HU",
		preset: "CT-Air",
	},
] as const;
