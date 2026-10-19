import type { Tooth16Preset } from "./tooth16Types";

export const TOOTH16_PATHOLOGY_PRESETS: Tooth16Preset[] = [
	{
		id: "composite",
		title: "Пломба (сост.)",
		description:
			"Нанокомпозит A2/A3, прецизионное краевое прилегание 0.6px, анатомия фиссур",
		badge: "Пломба",
		layers: {
			roots: true,
			crown: true,
			cusps: true,
			fissures: true,
			composite: true,
			compositeCondition: "adequate",
			cristaObliqua: true,
		},
	},
	{
		id: "composite_defective",
		title: "Пломба (несост.)",
		description:
			"Разгерметизация шва, затек вторичного кариеса, скол краевого валика",
		badge: "Пломба ⚠️",
		layers: {
			roots: true,
			crown: true,
			cusps: true,
			fissures: true,
			composite: true,
			compositeCondition: "defective",
			cristaObliqua: true,
		},
	},
	{
		id: "abfraction",
		title: "Клиновидный дефект",
		description:
			"V-образная цервикальная эрозия эмали у шейки CEJ с обнажением дентина",
		badge: "Клин",
		layers: {
			roots: true,
			crown: true,
			cusps: true,
			fissures: true,
			abfraction: true,
		},
	},
	{
		id: "post_core",
		title: "Штифт + Культя",
		description:
			"Стекловолоконный штифт в нёбном корне + композитная культя под коронку",
		badge: "Штифт",
		layers: {
			roots: true,
			crown: true,
			canals: true,
			guttaPercha: true,
			postCore: true,
		},
	},
	{
		id: "implant",
		title: "Титановый имплант",
		description:
			"Grade-5 титановый конический винт 5.5мм с широкой платформой под моляр",
		badge: "Имплант",
		layers: {
			implant: true,
			crown: true,
			zirconiaCrown: true,
			crownMaterial: "zirconia",
		},
	},
	{
		id: "missing",
		title: "Удаленный зуб",
		description: "Адентия / экстракция зуба, клинический красный маркер X",
		badge: "Удален",
		layers: { missing: true },
	},
];
