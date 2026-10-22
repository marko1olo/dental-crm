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
		manufacturerRu: "НПФ «Винар», Россия",
		standardTargetParamRu: "Пар 134°C / 5 минут или 121°C / 20 минут",
		originalColorHex: "#fb7185",
		originalColorNameRu: "Светло-розовый",
		finalColorHex: "#3b1a0e",
		finalColorNameRu: "Темно-коричневый / черный",
		sanpinNormRefRu: "ГОСТ ISO 11140-1 Класс 4, СанПиН 3.3686-21 п. 3638",
		inspectionTipRu: "Цвет метки индикатора внутри пакета должен строго совпадать с эталоном сравнения или быть темнее.",
	},
	{
		id: "medtest_medis_4",
		indicatorClass: "class_4_multivariable",
		brandNameRu: "МедИС-134/5 (Класс 4)",
		manufacturerRu: "ООО «Медтест», Россия",
		standardTargetParamRu: "Пар 134°C / 5 минут",
		originalColorHex: "#facc15",
		originalColorNameRu: "Желтый",
		finalColorHex: "#542408",
		finalColorNameRu: "Темно-коричневый",
		sanpinNormRefRu: "ГОСТ ISO 11140-1 Класс 4, СанПиН 3.3686-21 п. 3638",
		inspectionTipRu: "При неполном переходе цвета в коричневый цикл признается недействительным, пакет бракуется.",
	},
	{
		id: "vinar_intetest_5",
		indicatorClass: "class_5_integrator",
		brandNameRu: "ИнтеТЕСТ-В Интегратор (Класс 5)",
		manufacturerRu: "НПФ «Винар», Россия",
		standardTargetParamRu: "Интегратор пар + температура + время (SV: 134°C / 5 мин)",
		originalColorHex: "#cbd5e1",
		originalColorNameRu: "Светло-бежевый / серый",
		finalColorHex: "#0f172a",
		finalColorNameRu: "Глубокий сине-черный",
		sanpinNormRefRu: "ГОСТ ISO 11140-1 Класс 5 (Интеграторы), СанПиН 3.3686-21 п. 3639",
		inspectionTipRu: "Интегратор реагирует на все критические параметры паровой стерилизации с точностью биологического теста.",
	},
	{
		id: "medtest_is5_integrator",
		indicatorClass: "class_5_integrator",
		brandNameRu: "ИС-134/5 Интегратор (Класс 5)",
		manufacturerRu: "ООО «Медтест», Россия",
		standardTargetParamRu: "Пар 134°C / 5.5 мин / 2.1 бар",
		originalColorHex: "#e2e8f0",
		originalColorNameRu: "Светло-серый",
		finalColorHex: "#020617",
		finalColorNameRu: "Черный эталонный",
		sanpinNormRefRu: "ГОСТ ISO 11140-1 Класс 5, СанПиН 3.3686-21",
		inspectionTipRu: "Обязателен при контроле имплантологических и хирургических критических наборов.",
	},
];
