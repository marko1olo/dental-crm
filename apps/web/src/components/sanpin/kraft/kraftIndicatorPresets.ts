/**
 * apps/web/src/components/sanpin/kraft/kraftIndicatorPresets.ts
 * Пресеты химических индикаторов для крафт-пакетов. Мандат 8b: <= 120 строк.
 */

export type ChemicalIndicatorClass = "class_4_multivariable" | "class_5_integrator";

export interface ChemicalIndicatorDefinition {
	readonly id: string;
	readonly indicatorClass: ChemicalIndicatorClass;
	readonly brandNameRu: string;
	readonly manufacturerRu: string;
	readonly standardTargetParamRu: string;
	readonly originalColorHex: string;
	readonly originalColorNameRu: string;
	readonly finalColorHex: string;
	readonly finalColorNameRu: string;
	readonly sanpinNormRefRu: string;
	readonly inspectionTipRu: string;
}

export const SANPIN_CHEMICAL_INDICATORS: readonly ChemicalIndicatorDefinition[] = [
	{
		id: "vinar_steritest_4",
		indicatorClass: "class_4_multivariable",
		brandNameRu: "СтериТЕСТ-В (Класс 4)",
		manufacturerRu: "НПФ «Винар»",
		standardTargetParamRu: "Пар 134°C / 5 минут",
		originalColorHex: "#fb7185",
		originalColorNameRu: "Светло-розовый",
		finalColorHex: "#3b1a0e",
		finalColorNameRu: "Темно-коричневый",
		sanpinNormRefRu: "Класс 4 (многопараметрический)",
		inspectionTipRu: "Цвет метки индикатора совпадает с эталоном или темнее.",
	},
	{
		id: "vinar_intetest_5",
		indicatorClass: "class_5_integrator",
		brandNameRu: "ИнтеТЕСТ-В Интегратор (Класс 5)",
		manufacturerRu: "НПФ «Винар»",
		standardTargetParamRu: "Интегратор пар + температура (134°C / 5 мин)",
		originalColorHex: "#cbd5e1",
		originalColorNameRu: "Серый",
		finalColorHex: "#0f172a",
		finalColorNameRu: "Черный",
		sanpinNormRefRu: "Класс 5 (Интеграторы)",
		inspectionTipRu: "Интегратор подтверждает все критические параметры стерилизации.",
	},
	{
		id: "medtest_medis_4",
		indicatorClass: "class_4_multivariable",
		brandNameRu: "МедИС-134/5 (Класс 4)",
		manufacturerRu: "ООО «Медтест»",
		standardTargetParamRu: "Пар 134°C / 5 минут",
		originalColorHex: "#facc15",
		originalColorNameRu: "Желтый",
		finalColorHex: "#542408",
		finalColorNameRu: "Темно-коричневый",
		sanpinNormRefRu: "Класс 4 (многопараметрический)",
		inspectionTipRu: "При неполном переходе цвета в коричневый пакет бракуется.",
	},
	{
		id: "medtest_is5_integrator",
		indicatorClass: "class_5_integrator",
		brandNameRu: "ИС-134/5 Интегратор (Класс 5)",
		manufacturerRu: "ООО «Медтест»",
		standardTargetParamRu: "Пар 134°C / 5.5 мин / 2.1 бар",
		originalColorHex: "#e2e8f0",
		originalColorNameRu: "Светло-серый",
		finalColorHex: "#020617",
		finalColorNameRu: "Черный эталонный",
		sanpinNormRefRu: "ГОСТ ISO 11140-1 Класс 5",
		inspectionTipRu: "Контроль имплантологических и хирургических наборов.",
	},
];

export function getChemicalIndicatorDefinition(id: string): ChemicalIndicatorDefinition {
	const found = SANPIN_CHEMICAL_INDICATORS.find((i) => i.id === id);
	return found || SANPIN_CHEMICAL_INDICATORS[0]!;
}
