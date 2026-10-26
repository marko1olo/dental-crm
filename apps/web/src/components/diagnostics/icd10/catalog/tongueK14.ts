import type { DentalIcd10Item } from "../../icd10Types";

export const TONGUE_K14: readonly DentalIcd10Item[] = [
	{
		code: "K14.0",
		rubric: "K14",
		titleRu: "Глоссит (воспаление языка)",
		shortTitleRu: "Глоссит",
		synonyms: [
			"глоссит",
			"воспаление языка",
			"язвы на языке",
			"глоссит катаральный",
			"glossitis",
		],
		requiresTooth: false,
		specialty: "therapy",
		severity: "medium",
		popular: false,
		description: "Воспалительный процесс тканей языка инфекционного или соматического происхождения.",
		recommendations: [
			"Санация полости рта",
			"Антисептические и обезболивающие полоскания",
			"Лечение сопутствующей патологии ЖКТ",
		],
	},
	{
		code: "K14.6",
		rubric: "K14",
		titleRu: "Глоссодиния (синдром жжения языка / полости рта)",
		shortTitleRu: "Глоссодиния (жжение языка)",
		synonyms: [
			"глоссодиния",
			"жжение языка",
			"синдром жжения рта",
			"стомалгия",
			"боли в языке",
			"glossodynia",
		],
		requiresTooth: false,
		specialty: "therapy",
		severity: "medium",
		popular: false,
		description: "Нейростоматологический синдром парестезий и жжения языка при отсутствии видимых органических изменений слизистой.",
		recommendations: [
			"Консультация невролога и эндокринолога",
			"Седативная и нейропротекторная терапия",
			"Исключение гальванизма полости рта",
		],
	},
];
