/**
 * carpuleDisposalConstants.ts
 * Константы и типы анестетиков для списания карпул по СанПиН 3.3686-21.
 * Выделено из модального окна для автономного импорта без JSX-зависимостей.
 */

export interface AnestheticDrugOption {
	readonly id: string;
	readonly nameRu: string;
	readonly activeSubstanceRu: string;
	readonly defaultVolumeMl: number;
	readonly defaultSeries: string;
	readonly defaultLot: string;
	readonly defaultExp: string;
}

export const COMMON_ANESTHETICS: readonly AnestheticDrugOption[] = [
	{
		id: "articaine_100k",
		nameRu: "Артикаин 4% с адреналином 1:100 000 (Ультракаин Д-С Форте)",
		activeSubstanceRu: "Артикаина гидрохлорид + Эпинефрин",
		defaultVolumeMl: 1.7,
		defaultSeries: "ART-2026",
		defaultLot: "84019",
		defaultExp: "2027-06",
	},
	{
		id: "articaine_200k",
		nameRu: "Артикаин 4% с адреналином 1:200 000 (Ультракаин Д-С)",
		activeSubstanceRu: "Артикаина гидрохлорид + Эпинефрин",
		defaultVolumeMl: 1.7,
		defaultSeries: "ART-2026-L",
		defaultLot: "84022",
		defaultExp: "2027-08",
	},
	{
		id: "mepivacaine_3",
		nameRu: "Мепивакаин 3% без вазоконстриктора (Скандонест)",
		activeSubstanceRu: "Мепивакаина гидрохлорид",
		defaultVolumeMl: 1.7,
		defaultSeries: "MEP-2026",
		defaultLot: "51094",
		defaultExp: "2027-04",
	},
	{
		id: "septanest_100k",
		nameRu: "Септанест 1:100 000 (Септодонт)",
		activeSubstanceRu: "Артикаин + Адреналин",
		defaultVolumeMl: 1.7,
		defaultSeries: "SEP-2026",
		defaultLot: "93108",
		defaultExp: "2027-05",
	},
];
