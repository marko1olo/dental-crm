import type { Tooth16Preset } from "./tooth16Types";

export const TOOTH16_CROWN_PRESETS: Tooth16Preset[] = [
	{
		id: "crown_zirconia",
		title: "Цирконий (сост.)",
		description:
			"Фрезерованный диоксид циркония Multi-Layer, рельеф 4 бугров и Crista Obliqua",
		badge: "ZrO2",
		layers: {
			roots: true,
			crown: true,
			zirconiaCrown: true,
			crownMaterial: "zirconia",
			crownCondition: "adequate",
			cristaObliqua: true,
		},
	},
	{
		id: "crown_zirconia_defective",
		title: "Цирконий (несост.)",
		description:
			"Скол керамики на MB бугре, окклюзионная перфорация гребня, краевая щель уступа",
		badge: "ZrO2 ⚠️",
		layers: {
			roots: true,
			crown: true,
			zirconiaCrown: true,
			crownMaterial: "zirconia",
			crownCondition: "defective",
			cristaObliqua: true,
		},
	},
	{
		id: "crown_pfm",
		title: "Металлокерамика (сост.)",
		description:
			"Фарфоровая облицовка с металлической гирляндой у пришеечного уступа",
		badge: "PFM",
		layers: {
			roots: true,
			crown: true,
			zirconiaCrown: true,
			crownMaterial: "pfm",
			crownCondition: "adequate",
			cristaObliqua: true,
		},
	},
	{
		id: "crown_emax",
		title: "E-Max пресс (сост.)",
		description:
			"Дисиликат лития с голубоватой опалесценцией и естественной полупрозрачностью",
		badge: "E-Max",
		layers: {
			roots: true,
			crown: true,
			zirconiaCrown: true,
			crownMaterial: "emax",
			crownCondition: "adequate",
			cristaObliqua: true,
		},
	},
	{
		id: "crown_gold",
		title: "Золотая коронка (сост.)",
		description:
			"Цельнолитое полированное золото 18K/24K со спекулярным блеском",
		badge: "Gold",
		layers: {
			roots: true,
			crown: true,
			zirconiaCrown: true,
			crownMaterial: "gold",
			crownCondition: "adequate",
			cristaObliqua: true,
		},
	},
	{
		id: "crown_metal",
		title: "КХС Металл (сост.)",
		description: "Цельнолитой кобальт-хромовый сплав, зеркальная полировка",
		badge: "КХС",
		layers: {
			roots: true,
			crown: true,
			zirconiaCrown: true,
			crownMaterial: "metal",
			crownCondition: "adequate",
			cristaObliqua: true,
		},
	},
	{
		id: "crown_pmma",
		title: "PMMA Временная (сост.)",
		description:
			"Фрезерованная полимерная временная коронка на период интеграции",
		badge: "PMMA",
		layers: {
			roots: true,
			crown: true,
			zirconiaCrown: true,
			crownMaterial: "pmma",
			crownCondition: "adequate",
			cristaObliqua: true,
		},
	},
];
