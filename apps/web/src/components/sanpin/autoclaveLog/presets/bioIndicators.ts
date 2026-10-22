import type { SterilizerMethodType } from "./sterilizersCatalog";

export interface BioIndicatorDefinition {
	readonly id: string;
	readonly microorganismName: string;
	readonly sporeCount: string;
	readonly suitableMethod: SterilizerMethodType;
	readonly incubationHours: number;
	readonly incubationTempCelsius: number;
	readonly growthSignRu: string;
	readonly sterileSignRu: string;
	readonly periodicityRu: string;
	readonly sanpinNormRefRu: string;
}

export const STATUTORY_BIO_INDICATORS: readonly BioIndicatorDefinition[] = [
	{
		id: "bio_geobacillus_stearothermophilus",
		microorganismName: "Geobacillus stearothermophilus (штамм ATCC 7953 / ВКМ В-718)",
		sporeCount: "1.0 × 10^6 спор на носителе",
		suitableMethod: "steam_autoclave",
		incubationHours: 48,
		incubationTempCelsius: 55,
		growthSignRu: "Помутнение среды и изменение цвета с фиолетового на желтый (БРАК)",
		sterileSignRu: "Среда прозрачная, цвет фиолетовый сохранен (СТЕРИЛЬНО)",
		periodicityRu: "1 раз в 6 месяцев / после ТО автоклава",
		sanpinNormRefRu: "СанПиН 3.3686-21 п. 3642 и МУК 4.2.1990-05",
	},
	{
		id: "bio_bacillus_atrophaeus",
		microorganismName: "Bacillus atrophaeus (штамм ATCC 9372 / ВКМ В-828)",
		sporeCount: "1.0 × 10^6 спор на носителе",
		suitableMethod: "dry_heat_air",
		incubationHours: 48,
		incubationTempCelsius: 37,
		growthSignRu: "Помутнение среды и выпадение хлопьевидного осадка",
		sterileSignRu: "Питательная среда абсолютно прозрачная",
		periodicityRu: "1 раз в 6 месяцев / после ТО сухожара",
		sanpinNormRefRu: "СанПиН 3.3686-21 п. 3642",
	},
];
