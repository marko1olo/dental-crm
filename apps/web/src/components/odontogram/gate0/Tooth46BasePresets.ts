import {
	DEFAULT_TOOTH46_LAYERS,
	type Tooth46ClinicalPreset,
	type Tooth46LayerFlags,
} from "./tooth46Types";

export interface Tooth46PresetDef {
	id: Tooth46ClinicalPreset;
	nameRu: string;
	badge: string;
	description: string;
	layers: Tooth46LayerFlags;
}

const def = DEFAULT_TOOTH46_LAYERS;

export const TOOTH46_BASE_PRESETS: readonly Tooth46PresetDef[] = [
	{
		id: "intact",
		nameRu: "Норма / Интактный",
		badge: "Интактный",
		description: "Здоровая эмаль, 5 рельефных бугров, интактные корни",
		layers: { ...def },
	},
	{
		id: "caries",
		nameRu: "Кариес фиссурный (Class I)",
		badge: "Кариес Class I",
		description:
			"Органическая дендритная деструкция в фиссуре Y-5 и слепая ямка",
		layers: { ...def, caries: true },
	},
	{
		id: "pulpitis",
		nameRu: "Пульпит (острый очаговый)",
		badge: "Пульпит",
		description: "Гиперемия пульпы, 5 пульпарных рогов и капиллярное сплетение",
		layers: { ...def, pulp: true, canals: true, caries: true },
	},
	{
		id: "periodontitis",
		nameRu: "Периодонтит / Гранулема",
		badge: "Гранулема",
		description: "Периапикальная деструкция кости с воспалительным ореолом",
		layers: {
			...def,
			pulp: true,
			canals: true,
			periapicalHalo: true,
			caries: true,
		},
	},
	{
		id: "endodontics",
		nameRu: "Эндодонтия (3 канала)",
		badge: "Обтурация",
		description: "Трехмерная обтурация гуттаперчей с апикальным силером",
		layers: { ...def, canals: true, guttaPercha: true },
	},
	{
		id: "composite",
		nameRu: "Пломба (состоятельная A2/A3)",
		badge: "Пломба (сост.)",
		description: "Анатомический композит, идеальное краевое прилегание",
		layers: { ...def, composite: true, compositeCondition: "adequate" },
	},
	{
		id: "composite_defective",
		nameRu: "Пломба (несостоятельная / втор. кариес)",
		badge: "Пломба (дефект)",
		description: "Краевая разгерметизация, вторичный кариес и скол",
		layers: { ...def, composite: true, compositeCondition: "defective" },
	},
];
