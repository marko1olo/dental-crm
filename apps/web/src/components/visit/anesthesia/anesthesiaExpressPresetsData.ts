/**
 * anesthesiaExpressPresetsData.ts — Canonical list of chairside express presets
 * Standards: Минздрав РФ, СтАР. Mandates: 8e (Doctor Autonomy), 8b (<= 120 lines).
 */
import type { ExpressAnesthesiaPreset } from "./anesthesiaExpressTypes";

export const EXPRESS_ANESTHESIA_PRESETS: readonly ExpressAnesthesiaPreset[] = [
	{
		id: "infiltration_articaine_1_7",
		title: "Инфильтрация 1.7 мл",
		subtitle: "Артикаин 1:100 000, 30G 21 мм, аспирация отр.",
		fullLabelRu:
			"Инфильтрация 1.7 мл (Артикаин 1:100 000, 30G 21 мм, аспирация отр.)",
		techniqueId: "infiltration_supraperiosteal",
		needleId: "gauge_30_short_21mm",
		drugKey: "articaine_1_100k",
		volumeMl: 1.7,
		isTwoPlaneRequired: false,
		notesRu:
			"Инфильтрационная наднадкостничная анестезия. Аспирационная проба отрицательная. Обезболивание глубокое.",
		aspirationNotesRu:
			"Отрицательная аспирационная проба (кровь в карпуле отсутствует).",
	},
	{
		id: "mandibular_weisbrem_articaine_1_7",
		title: "Мандибулярная 1.7 мл",
		subtitle: "По Вайсбрему, Артикаин 1:100 000, 27G 35 мм, аспирация отр.",
		fullLabelRu:
			"Мандибулярная 1.7 мл (По Вайсбрему, Артикаин 1:100 000, 27G 35 мм, аспирация отр.)",
		techniqueId: "mandibular_weisbrem",
		needleId: "gauge_27_long_35mm",
		drugKey: "articaine_1_100k",
		volumeMl: 1.7,
		isTwoPlaneRequired: true,
		notesRu:
			"Мандибулярная проводниковая блокада по Вайсбрему. Двухплоскостная аспирация отрицательная. Обезболивание глубокое.",
		aspirationNotesRu:
			"Отрицательная аспирационная проба в 2-х плоскостях (0° и 180°). Кровь в карпуле отсутствует.",
	},
	{
		id: "torusal_articaine_1_7",
		title: "Торусальная 1.7 мл",
		subtitle: "Артикаин 1:100 000, 27G 35 мм, аспирация отр.",
		fullLabelRu:
			"Торусальная 1.7 мл (Артикаин 1:100 000, 27G 35 мм, аспирация отр.)",
		techniqueId: "torusal",
		needleId: "gauge_27_long_35mm",
		drugKey: "articaine_1_100k",
		volumeMl: 1.7,
		isTwoPlaneRequired: true,
		notesRu:
			"Торусальная проводниковая блокада нижнечелюстного валика. Двухплоскостная аспирация отрицательная.",
		aspirationNotesRu:
			"Отрицательная аспирационная проба в 2-х плоскостях (0° и 180°). Кровь в карпуле отсутствует.",
	},
	{
		id: "mandibular_cardio_scandonest_1_7",
		title: "Мандибулярная кардио",
		subtitle: "Скандонест 3% без адреналина, 27G 35 мм, аспирация отр.",
		fullLabelRu:
			"Мандибулярная кардио (Скандонест 3% без адреналина, 27G 35 мм, аспирация отр.)",
		techniqueId: "mandibular_weisbrem",
		needleId: "gauge_27_long_35mm",
		drugKey: "mepivacaine_plain_3",
		volumeMl: 1.7,
		isTwoPlaneRequired: true,
		notesRu:
			"Кардио-протокол: Мепивакаин (Скандонест 3%) без вазоконстриктора. Двухплоскостная аспирация отрицательная.",
		aspirationNotesRu:
			"Отрицательная аспирационная проба в 2-х плоскостях (0° и 180°). Кровь в карпуле отсутствует.",
	},
	{
		id: "intraligamentary_articaine_0_4",
		title: "Интралигаментарная 0.4 мл",
		subtitle: "Артикаин 1:100 000, 30G 12 мм, аспирация отр.",
		fullLabelRu:
			"Интралигаментарная 0.4 мл (Артикаин 1:100 000, 30G 12 мм, аспирация отр.)",
		techniqueId: "intraligamentary_pdl",
		needleId: "gauge_30_ultrashort_12mm",
		drugKey: "articaine_1_100k",
		volumeMl: 0.4,
		isTwoPlaneRequired: false,
		notesRu:
			"Интралигаментарная периодонтальная анестезия (PDL). Изолированное обезболивание причинного зуба.",
		aspirationNotesRu:
			"Отрицательная аспирационная проба. Кровь в карпуле отсутствует.",
	},
	{
		id: "mandibular_plus_infiltration_ultracaine_forte",
		title: "Мандибулярная + инфильтрационная 1.7 мл Ультракаин Д-С Форте",
		subtitle:
			"Ультракаин Д-С Форте (1:100 000), 27G 35 мм, 2-пл. аспирация отр.",
		fullLabelRu:
			"Мандибулярная + инфильтрационная 1.7 мл (Ультракаин Д-С Форте 1:100 000, 27G 35 мм, аспирация отр.)",
		techniqueId: "mandibular_weisbrem",
		needleId: "gauge_27_long_35mm",
		drugKey: "articaine_1_100k",
		volumeMl: 1.7,
		isTwoPlaneRequired: true,
		notesRu:
			"Комбинированная мандибулярная проводниковая и инфильтрационная анестезия (Ультракаин Д-С Форте 1:100 000).",
		aspirationNotesRu:
			"Отрицательная аспирационная проба в 2-х плоскостях (0° и 180°). Кровь в карпуле отсутствует.",
	},
	{
		id: "infiltration_septanest_1_7",
		title: "Инфильтрационная 1.7 мл Септанест",
		subtitle: "Септанест 1:100 000, 30G 21 мм, аспирация отр.",
		fullLabelRu:
			"Инфильтрационная 1.7 мл Септанест (Артикаин 4% 1:100 000, 30G 21 мм, аспирация отр.)",
		techniqueId: "infiltration_supraperiosteal",
		needleId: "gauge_30_short_21mm",
		drugKey: "articaine_1_100k",
		volumeMl: 1.7,
		isTwoPlaneRequired: false,
		notesRu:
			"Инфильтрационная наднадкостничная анестезия препаратом Септанест (Артикаин 4% с адреналином 1:100 000).",
		aspirationNotesRu:
			"Отрицательная аспирационная проба. Кровь в карпуле отсутствует.",
	},
];
