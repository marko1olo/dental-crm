import type { IncisorPresetDefinition, IncisorStandLayers } from "./incisorStandTypes";

export const DEFAULT_INCISOR_STAND_LAYERS: Readonly<IncisorStandLayers> = {
	crown: true,
	roots: true,
	mamelons: true,
	cingulum: true,
	sulcusLongitudinalis: true,
	marginalRidges: true,
	lingualFossa: true,
	developmentalLobes: true,
	pulp: false,
	canals: false,
	guttaPercha: false,
	periapicalHalo: false,
	veneer: false,
	trauma: "none",
	wearDegree: 0,
	abfraction: false,
	splinting: false,
	fiberPost: false,
	zirconiaCrown: false,
	implant: false,
	missing: false,
	cej: true,
	grooves: true,
};

export const INCISOR_CLINICAL_PRESETS: readonly IncisorPresetDefinition[] = [
	{
		id: "intact",
		badge: "Интактный / Мамелоны",
		title: "Интактный резец с анатомическими мамелонами",
		layers: {
			...DEFAULT_INCISOR_STAND_LAYERS,
			mamelons: true,
		},
	},
	{
		id: "veneer",
		badge: "Винир E-Max",
		title: "Керамический винир E-Max с полупрозрачным краем",
		layers: {
			...DEFAULT_INCISOR_STAND_LAYERS,
			veneer: true,
		},
	},
	{
		id: "trauma",
		badge: "Скол Эллис II",
		title: "Травма режущего края Ellis Class II",
		layers: {
			...DEFAULT_INCISOR_STAND_LAYERS,
			mamelons: false,
			trauma: "ellis_class_2_mesial",
		},
	},
	{
		id: "attrition",
		badge: "Стираемость III ст.",
		title: "Патологическая стираемость с обнажением дентина",
		layers: {
			...DEFAULT_INCISOR_STAND_LAYERS,
			mamelons: false,
			wearDegree: 3,
		},
	},
	{
		id: "endo",
		badge: "Эндодонтия",
		title: "Обтурация канала коралловой гуттаперчей",
		layers: {
			...DEFAULT_INCISOR_STAND_LAYERS,
			pulp: true,
			canals: true,
			guttaPercha: true,
			periapicalHalo: true,
		},
	},
	{
		id: "splinting",
		badge: "Фронтальная шина",
		title: "Пародонтальное шинирование подвижных резцов",
		layers: {
			...DEFAULT_INCISOR_STAND_LAYERS,
			splinting: true,
		},
	},
];
