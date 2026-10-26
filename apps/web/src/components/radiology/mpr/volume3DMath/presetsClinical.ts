import type { Volume3DPresetSpec } from "./types";

export const CBCT_CLINICAL_VOLUME_PRESETS: readonly Volume3DPresetSpec[] = [
	{
		id: "cortical_bone",
		label: "Кортикальная кость (+600..+2000 HU)",
		shortLabel: "Кортикал",
		description: "Компактная пластинка альвеолярного отростка и базиса челюсти (+600..+2000 HU)",
		huMin: 600,
		huMax: 2000,
		colorRgb: [255, 250, 240],
	},
	{
		id: "cancellous_bone",
		label: "Губчатая кость (+200..+800 HU)",
		shortLabel: "Губчатая",
		description: "Трабекулярная сеть губчатого вещества челюсти (+200..+800 HU)",
		huMin: 200,
		huMax: 800,
		colorRgb: [238, 224, 204],
	},
	{
		id: "enamel_metal",
		label: "Эмаль зубов и металл (+1500..+3000 HU)",
		shortLabel: "Эмаль/Металл",
		description: "Высокоминерализованная зубная эмаль, дентин и металлические коронки (+1500..+3000 HU)",
		huMin: 1500,
		huMax: 3000,
		colorRgb: [255, 255, 255],
	},
	{
		id: "ez3d_bone",
		label: "Vatech Ez3D Кость (+350..+2200 HU)",
		shortLabel: "Ez3D Кость",
		description: "Канонический пресет кости Vatech Ez3D с двухсторонним диффузным освещением (+350..+2200 HU)",
		huMin: 350,
		huMax: 2200,
		colorRgb: [242, 235, 222],
	},
	{
		id: "ez3d_soft_tissue",
		label: "Vatech Ez3D Мягкие ткани (-150..+350 HU)",
		shortLabel: "Ez3D Ткани",
		description: "Пресет мягких тканей лица и слизистой Vatech Ez3D (-150..+350 HU)",
		huMin: -150,
		huMax: 350,
		colorRgb: [228, 188, 172],
	},
] as const;
