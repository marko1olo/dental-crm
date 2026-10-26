import type { Volume3DPresetId, Volume3DPresetSpec } from "./types";
import { CBCT_CLINICAL_VOLUME_PRESETS } from "./presetsClinical";

export { CBCT_CLINICAL_VOLUME_PRESETS };

export const CBCT_VOLUME_3D_PRESETS: readonly Volume3DPresetSpec[] = [
	{
		id: "skull",
		label: "Череп (Кость / Челюсть)",
		shortLabel: "Череп",
		description: "Челюстно-лицевой скелет, нижняя и верхняя челюсти, костные структуры (350+ HU)",
		huMin: 350,
		huMax: 2000,
		colorRgb: [242, 232, 214],
	},
	{
		id: "dense_bone",
		label: "Плотная кость / Зубы",
		shortLabel: "Плотная",
		description: "Кортикальная пластинка, зубной ряд, эмаль и дентин (550+ HU)",
		huMin: 550,
		huMax: 3000,
		colorRgb: [255, 252, 240],
	},
	{
		id: "soft_tissue",
		label: "Мягкие ткани (-100..+300 HU)",
		shortLabel: "Ткани",
		description: "Слизистая оболочка, десна и контуры мягких тканей лица (-100..+300 HU)",
		huMin: -100,
		huMax: 300,
		colorRgb: [225, 185, 170],
	},
	{
		id: "mip",
		label: "MIP (Макс. интенсивность)",
		shortLabel: "MIP",
		description: "Проекция максимальной интенсивности по всей глубине объема (250+ HU)",
		huMin: 250,
		huMax: 3000,
		colorRgb: [220, 240, 255],
	},
] as const;

export const CBCT_EXTENDED_VOLUME_3D_PRESETS: readonly Volume3DPresetSpec[] = [
	CBCT_VOLUME_3D_PRESETS[0]!,
	CBCT_VOLUME_3D_PRESETS[1]!,
	{
		id: "hard_bone",
		label: "Hard Bone (Твердая кость / Эмаль)",
		shortLabel: "Hard Bone",
		description: "Высокоминерализованные структуры челюсти, альвеолярный край и зубы (700+ HU)",
		huMin: 700,
		huMax: 3000,
		colorRgb: [255, 255, 250],
	},
	CBCT_VOLUME_3D_PRESETS[3]!,
	CBCT_VOLUME_3D_PRESETS[2]!,
	{
		id: "transparent_skull",
		label: "Прозрачный череп (X-Ray VR)",
		shortLabel: "Прозрачный",
		description: "Полупрозрачный рентгенологический вид черепа для оценки корней и синусов (200..1600 HU)",
		huMin: 200,
		huMax: 1600,
		colorRgb: [195, 215, 235],
	},
	{
		id: "vessels",
		label: "Сосуды и контраст (+40..+450 HU)",
		shortLabel: "Сосуды",
		description: "Сосудистое русло, мягкотканные инфильтраты и контрастирование (+40..+450 HU)",
		huMin: 40,
		huMax: 450,
		colorRgb: [230, 80, 70],
	},
	{
		id: "airway",
		label: "Дыхательные пути (Airway VR)",
		shortLabel: "Воздух",
		description: "Селективное выделение воздушного столба носоглотки и ротоглотки (-1024..-650 HU)",
		huMin: -1000,
		huMax: -650,
		colorRgb: [6, 182, 212],
	},
] as const;

export const ALL_CBCT_VOLUME_3D_PRESETS: readonly Volume3DPresetSpec[] = [
	...CBCT_EXTENDED_VOLUME_3D_PRESETS,
	...CBCT_CLINICAL_VOLUME_PRESETS.filter(
		(cp) => !CBCT_EXTENDED_VOLUME_3D_PRESETS.some((bp) => bp.id === cp.id),
	),
];

export function getVolume3DPreset(id: Volume3DPresetId): Volume3DPresetSpec {
	return (
		ALL_CBCT_VOLUME_3D_PRESETS.find((p) => p.id === id) ??
		CBCT_VOLUME_3D_PRESETS.find((p) => p.id === id) ??
		CBCT_VOLUME_3D_PRESETS[0]!
	);
}
