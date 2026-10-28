/**
 * packages/shared/src/sanpin/packagingSsot/chemicalIndicators.ts
 * Химические индикаторы 4, 5, 6 классов стерилизации (ГОСТ ISO 11140-1-2011).
 * Мандат 8b: строго <= 120 строк.
 */

export type ChemicalIndicatorClass = 4 | 5 | 6;

export interface ChemicalIndicatorDefinition {
	readonly classNumber: ChemicalIndicatorClass;
	readonly titleRu: string;
	readonly gostTypeRu: string;
	readonly descriptionRu: string;
	readonly clinicalSignificanceRu: string;
}

export const SANPIN_CHEMICAL_INDICATOR_CLASSES: readonly ChemicalIndicatorDefinition[] = [
	{
		classNumber: 4,
		titleRu: "Класс 4 — Многопараметрические индикаторы",
		gostTypeRu: "ГОСТ ISO 11140-1-2011 Класс 4",
		descriptionRu: "Контролируют два или более критических параметра цикла (температуру и время).",
		clinicalSignificanceRu: "Применяются для рутинного внутрикамерного и внешнего контроля упаковок.",
	},
	{
		classNumber: 5,
		titleRu: "Класс 5 — Интегрирующие индикаторы (интеграторы)",
		gostTypeRu: "ГОСТ ISO 11140-1-2011 Класс 5",
		descriptionRu: "Реагируют на все критические параметры процесса со скоростью инактивации биотестов.",
		clinicalSignificanceRu: "Золотой стандарт стоматологии. Размещаются внутри каждого крафт-пакета.",
	},
	{
		classNumber: 6,
		titleRu: "Класс 6 — Эмулирующие индикаторы-имитаторы",
		gostTypeRu: "ГОСТ ISO 11140-1-2011 Класс 6",
		descriptionRu: "Строго откалиброваны под конкретный режим (134°C / 5 мин). Реагируют при 100% параметров.",
		clinicalSignificanceRu: "Применяются для контрольных проверок циклов автоклавов B-класса.",
	},
];
