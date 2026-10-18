import type { Tooth46PresetDef } from "./Tooth46BasePresets";
import { DEFAULT_TOOTH46_LAYERS } from "./tooth46Types";

const def = DEFAULT_TOOTH46_LAYERS;
const noCrown = { crown: false, cusps: false, fissures: false };

export const TOOTH46_CROWN_PRESETS: readonly Tooth46PresetDef[] = [
	{
		id: "crown",
		nameRu: "Коронка: Цирконий (состоятельная)",
		badge: "Цирконий (сост.)",
		description: "Монолитный многослойный фрезерованный цирконий с глазурью",
		layers: {
			...def,
			...noCrown,
			zirconiaCrown: true,
			crownMaterial: "zirconia",
			crownCondition: "adequate",
		},
	},
	{
		id: "crown_defective",
		nameRu: "Коронка: Цирконий (несостоятельная / скол)",
		badge: "Цирконий (скол)",
		description:
			"Скол керамики, краевая расцементировка и окклюзионная перфорация",
		layers: {
			...def,
			...noCrown,
			zirconiaCrown: true,
			crownMaterial: "zirconia",
			crownCondition: "defective",
		},
	},
	{
		id: "crown_pfm",
		nameRu: "Коронка: Металлокерамика (PFM)",
		badge: "PFM",
		description: "Керамика на металле с поддесневой металлической гирляндой",
		layers: {
			...def,
			...noCrown,
			zirconiaCrown: true,
			crownMaterial: "pfm",
			crownCondition: "adequate",
		},
	},
	{
		id: "crown_emax",
		nameRu: "Коронка: Пресс-керамика E-Max",
		badge: "E-Max",
		description: "Стеклокерамика дисиликат лития с опалесценцией",
		layers: {
			...def,
			...noCrown,
			zirconiaCrown: true,
			crownMaterial: "emax",
			crownCondition: "adequate",
		},
	},
	{
		id: "crown_gold",
		nameRu: "Коронка: Цельнолитое золото (18K/24K)",
		badge: "Золото",
		description: "Благородный полированный золотой сплав высокой прочности",
		layers: {
			...def,
			...noCrown,
			zirconiaCrown: true,
			crownMaterial: "gold",
			crownCondition: "adequate",
		},
	},
	{
		id: "crown_metal",
		nameRu: "Коронка: Цельнолитой металл (Co-Cr)",
		badge: "КХС/Металл",
		description: "Клинический кобальт-хромовый сплав со стальным блеском",
		layers: {
			...def,
			...noCrown,
			zirconiaCrown: true,
			crownMaterial: "metal",
			crownCondition: "adequate",
		},
	},
	{
		id: "crown_pmma",
		nameRu: "Коронка: Временная пластмасса (PMMA)",
		badge: "PMMA",
		description: "Временная пластмассовая фрезерованная коронка",
		layers: {
			...def,
			...noCrown,
			zirconiaCrown: true,
			crownMaterial: "pmma",
			crownCondition: "adequate",
		},
	},
];
