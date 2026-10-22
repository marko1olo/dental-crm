export interface ChamberControlPointDefinition {
	readonly pointIndex: 1 | 2 | 3 | 4 | 5;
	readonly code: string;
	readonly nameRu: string;
	readonly physicalLocationRu: string;
	readonly thermodynamicRiskFactorRu: string;
	readonly coordinateX: number;
	readonly coordinateY: number;
	readonly coordinateZ: number;
}

export const STATUTORY_CHAMBER_5_POINTS: readonly ChamberControlPointDefinition[] = [
	{
		pointIndex: 1,
		code: "КТ-1",
		nameRu: "Точка 1: Верхний передний угол",
		physicalLocationRu: "Верхняя полка загрузочной клети, левый передний угол камеры",
		thermodynamicRiskFactorRu: "Зона скопления неконденсируемых газов и воздушных карманов",
		coordinateX: 22,
		coordinateY: 20,
		coordinateZ: 25,
	},
	{
		pointIndex: 2,
		code: "КТ-2",
		nameRu: "Точка 2: Нижний угол у стока конденсата",
		physicalLocationRu: "Нижняя полка, правый передний угол у дренажного отверстия",
		thermodynamicRiskFactorRu: "Холодная точка скопления охлажденного конденсата",
		coordinateX: 78,
		coordinateY: 80,
		coordinateZ: 25,
	},
	{
		pointIndex: 3,
		code: "КТ-3",
		nameRu: "Точка 3: Геометрический центр камеры",
		physicalLocationRu: "Центральная корзина, ядро стерилизационной загрузки",
		thermodynamicRiskFactorRu: "Максимальная плотность упаковки и замедленный прогрев",
		coordinateX: 50,
		coordinateY: 50,
		coordinateZ: 50,
	},
	{
		pointIndex: 4,
		code: "КТ-4",
		nameRu: "Точка 4: Зона уплотнителя дверцы",
		physicalLocationRu: "Передний край нижней/средней полки, 3-5 см от силиконовой прокладки двери",
		thermodynamicRiskFactorRu: "Теплопотери через металлическую дверь и уплотнитель",
		coordinateX: 50,
		coordinateY: 82,
		coordinateZ: 10,
	},
	{
		pointIndex: 5,
		code: "КТ-5",
		nameRu: "Точка 5: Задняя стенка у паровыпускного клапана",
		physicalLocationRu: "Задняя часть камеры у парораспределительного коллектора",
		thermodynamicRiskFactorRu: "Перепады давления и градиент насыщения сухого пара",
		coordinateX: 50,
		coordinateY: 25,
		coordinateZ: 90,
	},
];
