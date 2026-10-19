import type { Tooth16Preset } from "./tooth16Types";

export const TOOTH16_BASE_PRESETS: Tooth16Preset[] = [
	{
		id: "intact",
		title: "Интактный (Здоров)",
		description:
			"Физиологическая норма: ромбовидная коронка, Crista Obliqua, Карабелли, 3 корня",
		badge: "Норма",
		layers: {
			roots: true,
			crown: true,
			cusps: true,
			fissures: true,
			cristaObliqua: true,
			carabelli: true,
		},
	},
	{
		id: "caries",
		title: "Кариес (Фиссурный)",
		description:
			"Кариес в центральной ямке и дистальной борозде + меловое пятно на бугорке Карабелли",
		badge: "Кариес",
		layers: {
			roots: true,
			crown: true,
			cusps: true,
			fissures: true,
			caries: true,
			cristaObliqua: true,
			carabelli: true,
		},
	},
	{
		id: "pulpitis",
		title: "Острый пульпит",
		description: "Кариозная перфорация в рог ML пульпы с гиперемией 4 каналов",
		badge: "Пульпит",
		layers: {
			roots: true,
			crown: true,
			cusps: true,
			fissures: true,
			caries: true,
			pulp: true,
			canals: true,
		},
	},
	{
		id: "periodontitis",
		title: "Периодонтит / Гранулема",
		description:
			"Некроз пульпы с периапикальной костной деструкцией на 3 апексах",
		badge: "Периодонтит",
		layers: {
			roots: true,
			crown: true,
			cusps: true,
			fissures: true,
			caries: true,
			pulp: true,
			canals: true,
			periapicalHalo: true,
		},
	},
	{
		id: "endo",
		title: "Эндодонтия (4 канала)",
		description:
			"Плотная 3D-обтурация гуттаперчей каналов MB1, MB2, Palatal и DB",
		badge: "Эндо (4К)",
		layers: {
			roots: true,
			crown: true,
			cusps: true,
			fissures: true,
			canals: true,
			pulp: true,
			guttaPercha: true,
		},
	},
];
