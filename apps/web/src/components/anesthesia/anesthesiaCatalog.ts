/**
 * Russian Dental Anesthetics & Vasoconstrictor Pharmacopeia (СтАР / Минздрав РФ)
 * Reference catalog of local anesthetics, vasoconstrictors, needles, and injection techniques.
 * Modular facade compliant with submodules <= 120 lines invariant.
 */

export * from "./catalog/anesthesiaCatalogTypes.js";
export * from "./catalog/anesthesiaPresetsData.js";
export * from "./catalog/anestheticDrugsData.js";
export * from "./catalog/injectionTechniquesData.js";

export const DENTAL_NEEDLES = {
	g27_long_35mm: {
		id: "g27_long_35mm",
		gaugeG: 27,
		lengthMm: 35,
		nameRu: "27G длинная (35 мм)",
	},
	g30_short_21mm: {
		id: "g30_short_21mm",
		gaugeG: 30,
		lengthMm: 21,
		nameRu: "30G короткая (21 мм)",
	},
	g30_ultrashort_12mm: {
		id: "g30_ultrashort_12mm",
		gaugeG: 30,
		lengthMm: 12,
		nameRu: "30G ультракороткая (12 мм)",
	},
} as const;
