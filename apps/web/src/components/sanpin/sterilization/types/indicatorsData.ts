import type { SterilizationRegimeCode } from "./regimesData";

export type ChemicalIndicatorClassId =
	| "class4_multivariable"
	| "class5_integrating"
	| "class6_emulating"
	| "bowie_dick_test"
	| "helix_pcd_test";

export interface ChemicalIndicatorPreset {
	readonly id: string;
	readonly tradeNameRu: string;
	readonly indicatorClass: ChemicalIndicatorClassId;
	readonly indicatorClassLabelRu: string;
	readonly targetRegimeId: SterilizationRegimeCode;
	readonly initialColorRu: string;
	readonly finalColorRu: string;
	readonly manufacturerRu: string;
}

export const STATUTORY_CHEMICAL_INDICATORS: readonly ChemicalIndicatorPreset[] = [
	{
		id: "intetest-v-134-5",
		tradeNameRu: "Интетест-В-134/5 (Внутренний)",
		indicatorClass: "class5_integrating",
		indicatorClassLabelRu: "Класс 5 (Интегрирующий индикатор)",
		targetRegimeId: "steam_134_5min",
		initialColorRu: "Желтый / Бежевый",
		finalColorRu: "Темно-коричневый / Черный (эталон)",
		manufacturerRu: "ООО «Винар» (Россия)",
	},
	{
		id: "steritest-v-134-20",
		tradeNameRu: "Стеритест-В-134/20 (Многопеременный)",
		indicatorClass: "class4_multivariable",
		indicatorClassLabelRu: "Класс 4 (Многопеременный индикатор)",
		targetRegimeId: "steam_134_20min_prion",
		initialColorRu: "Светло-голубой",
		finalColorRu: "Темно-синий / Фиолетовый",
		manufacturerRu: "ООО «Винар» (Россия)",
	},
	{
		id: "steritest-v-121-20",
		tradeNameRu: "Стеритест-В-121/20 (Многопеременный)",
		indicatorClass: "class4_multivariable",
		indicatorClassLabelRu: "Класс 4 (Многопеременный индикатор)",
		targetRegimeId: "steam_121_20min",
		initialColorRu: "Оранжевый",
		finalColorRu: "Темно-коричневый",
		manufacturerRu: "ООО «Винар» (Россия)",
	},
	{
		id: "medis-v-180-60",
		tradeNameRu: "МедИС-В-180/60 (Для сухожаровых шкафов)",
		indicatorClass: "class4_multivariable",
		indicatorClassLabelRu: "Класс 4 (Воздушная стерилизация)",
		targetRegimeId: "dry_heat_180_60min",
		initialColorRu: "Синий",
		finalColorRu: "Коричневый (цвет эталона)",
		manufacturerRu: "ООО «Медтест» (Россия)",
	},
	{
		id: "comply-3m-1243",
		tradeNameRu: "3M™ Comply™ 1243 (Химический интегратор)",
		indicatorClass: "class5_integrating",
		indicatorClassLabelRu: "Класс 5 (Интегратор перемещающегося фронта)",
		targetRegimeId: "steam_134_5min",
		initialColorRu: "Полоса в зоне REJECT",
		finalColorRu: "Фронт вошел в зону ACCEPT",
		manufacturerRu: "3M Health Care (USA)",
	},
];

export interface ChamberControlPoint {
	readonly pointIndex: 1 | 2 | 3 | 4 | 5;
	readonly code: string;
	readonly labelRu: string;
	readonly locationRu: string;
	readonly indicatorPassed: boolean;
	readonly indicatorColorObservedRu: string;
}

export const DEFAULT_CHAMBER_POINTS_TEMPLATE: readonly {
	readonly pointIndex: 1 | 2 | 3 | 4 | 5;
	readonly code: string;
	readonly labelRu: string;
	readonly locationRu: string;
}[] = [
	{ pointIndex: 1, code: "КТ-1", labelRu: "Верхний передний правый угол", locationRu: "Верхняя полка у дверцы камеры" },
	{ pointIndex: 2, code: "КТ-2", labelRu: "Нижний задний левый угол", locationRu: "Нижняя полка у задней стенки (критическая зона)" },
	{ pointIndex: 3, code: "КТ-3", labelRu: "Геометрический центр камеры", locationRu: "Центральная полка в толще загрузки" },
	{ pointIndex: 4, code: "КТ-4", labelRu: "Зона выхода конденсата / дренаж", locationRu: "Нижняя точка камеры у сливного фильтра" },
	{ pointIndex: 5, code: "КТ-5", labelRu: "Верхняя задняя зона", locationRu: "Верхняя полка у датчика температуры камеры" },
];
