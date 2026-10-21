import type { StandardAnesthesiaPreset } from "./anesthesiaCatalogTypes.js";

export const STANDARD_ANESTHESIA_PRESETS: Record<
	string,
	StandardAnesthesiaPreset
> = {
	ultracain_ds_forte: {
		id: "ultracain_ds_forte",
		labelRu:
			"Ультракаин Д-С Форте 1.7 мл инфильтрационная (1:100 000, 1 карпула, осложнений нет)",
		shortLabelRu: "Ультракаин Д-С Форте 1.7 мл",
		testId: "btn-anesthesia-preset-ultracain-ds-forte",
		drugId: "articaine_1_100k",
		carpulesCount: 1.0,
		techniqueId: "infiltration",
		needleType: "g30_short_21mm",
		descriptionRu:
			"Стандартная инфильтрационная анестезия (Ультракаин Д-С Форте 1:100 000, 1 карпула 1.7 мл, осложнений нет)",
		isAdrenalineFree: false,
		hasCardioRisk: false,
		defaultWeightKg: 70,
	},
	ubistesin_forte: {
		id: "ubistesin_forte",
		labelRu:
			"Убистезин форте 1:100 000 — 1 карпула 1.7 мл (инфильтрация, осложнений нет)",
		shortLabelRu: "Убистезин форте 1:100k",
		testId: "btn-anesthesia-preset-ubistesin-forte",
		drugId: "articaine_1_100k",
		carpulesCount: 1.0,
		techniqueId: "infiltration",
		needleType: "g30_short_21mm",
		descriptionRu:
			"Инфильтрационная анестезия Sol. Ubistesini forte 4% — 1.7 ml (1:100 000), осложнений нет",
		isAdrenalineFree: false,
		hasCardioRisk: false,
		defaultWeightKg: 70,
	},
	septanest_200k: {
		id: "septanest_200k",
		labelRu:
			"Септанест 1:200 000 — 1 карпула 1.7 мл (инфильтрация, осложнений нет)",
		shortLabelRu: "Септанест 1:200k",
		testId: "btn-anesthesia-preset-septanest-200k",
		drugId: "articaine_1_200k",
		carpulesCount: 1.0,
		techniqueId: "infiltration",
		needleType: "g30_short_21mm",
		descriptionRu:
			"Инфильтрационная анестезия Sol. Septanest 4% с адреналином 1:200 000 — 1.7 ml, осложнений нет",
		isAdrenalineFree: false,
		hasCardioRisk: false,
		defaultWeightKg: 70,
	},
	ultracain_ds: {
		id: "ultracain_ds",
		labelRu:
			"Ультракаин Д-С 1:200 000 (1 карпула 1.7 мл, инфильтрация, осложнений нет)",
		shortLabelRu: "Ультракаин Д-С 1:200k",
		testId: "btn-anesthesia-preset-ultracain-ds",
		drugId: "articaine_1_200k",
		carpulesCount: 1.0,
		techniqueId: "infiltration",
		needleType: "g30_short_21mm",
		descriptionRu:
			"Стандартная инфильтрационная анестезия (1 карпула 1.7 мл, осложнений нет)",
		isAdrenalineFree: false,
		hasCardioRisk: false,
		defaultWeightKg: 70,
	},
	articaine_mandibular: {
		id: "articaine_mandibular",
		labelRu:
			"Артикаин 4% 1:100 000 (1 карпула 1.7 мл, мандибулярная проводниковая, анестезия наступила через 3 мин)",
		shortLabelRu: "Артикаин 1:100k (мандибулярная)",
		testId: "btn-anesthesia-preset-articaine-mandibular",
		drugId: "articaine_1_100k",
		carpulesCount: 1.0,
		techniqueId: "mandibular_torus",
		needleType: "g27_long_35mm",
		descriptionRu:
			"Мандибулярная проводниковая анестезия по Вейсбрему (1 карпула 1.7 мл, анестезия наступила через 3 мин)",
		isAdrenalineFree: false,
		hasCardioRisk: false,
		defaultWeightKg: 70,
	},
	mepivacaine_plain: {
		id: "mepivacaine_plain",
		labelRu:
			"Мепивакаин 3% без вазоконстриктора (1 карпула 1.7 мл, препарат выбора при ССЗ и бета-блокаторах)",
		shortLabelRu: "Мепивакаин 3% (без адреналина)",
		testId: "btn-anesthesia-preset-mepivacaine-plain",
		drugId: "mepivacaine_plain",
		carpulesCount: 1.0,
		techniqueId: "infiltration",
		needleType: "g30_short_21mm",
		descriptionRu:
			"Анестезия без вазоконстриктора (Мепивакаин 3%, 1.7 мл, препарат выбора при ССЗ и приеме бета-блокаторов)",
		isAdrenalineFree: true,
		hasCardioRisk: true,
		defaultWeightKg: 70,
	},
};
