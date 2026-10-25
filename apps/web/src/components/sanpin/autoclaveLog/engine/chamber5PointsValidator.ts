import {
	STATUTORY_CHAMBER_5_POINTS,
	STATUTORY_CHEMICAL_INDICATORS,
} from "../autoclaveLogPresets.js";
import type { ChamberPointEvaluation } from "./types.js";

/**
 * Оценка результатов химического контроля во всех 5 контрольных точках камеры автоклава.
 * Согласно СанПиН 3.3686-21: если хотя бы в 1 точке индикатор не изменил цвет на эталонный,
 * вся партия инструмента признается нестерильной (брак).
 */
export function evaluate5ChamberPoints(
	points: readonly ChamberPointEvaluation[],
): {
	readonly areAllPointsPassed: boolean;
	readonly passedPointsCount: number;
	readonly failedPointsCount: number;
	readonly failedPointIndices: readonly number[];
	readonly summaryRu: string;
} {
	if (points.length === 0) {
		return {
			areAllPointsPassed: false,
			passedPointsCount: 0,
			failedPointsCount: 0,
			failedPointIndices: [1, 2, 3, 4, 5],
			summaryRu: "Контрольные точки не протестированы",
		};
	}

	const failedIndices: number[] = [];
	let passedCount = 0;

	for (const pt of points) {
		if (pt.status === "passed") {
			passedCount++;
		} else {
			failedIndices.push(pt.pointIndex);
		}
	}

	const areAllPointsPassed = points.length === 5 && passedCount === 5;
	const failedPointsCount = points.length - passedCount;

	let summaryRu = "Все 5 контрольных точек: СТЕРИЛЬНО (100% переход индикаторов)";
	if (!areAllPointsPassed) {
		if (failedIndices.length > 0) {
			summaryRu = `Аварийный цикл стерилизации (БРАК СТЕРИЛИЗАЦИИ): химический термоиндикатор не сработал (цвет не достиг эталона). Партия бракуется. Не сработали контрольные точки: ${failedIndices.map((i) => `№ ${i}`).join(", ")}`;
		} else {
			summaryRu = `Аварийный цикл стерилизации (БРАК СТЕРИЛИЗАЦИИ): химический термоиндикатор не сработал (проверено только ${points.length} из 5 обязательных точек). Партия бракуется.`;
		}
	}

	return {
		areAllPointsPassed,
		passedPointsCount: passedCount,
		failedPointsCount,
		failedPointIndices: failedIndices,
		summaryRu,
	};
}

/**
 * Создает базовый набор 5 контрольных точек для выбранного режима и индикатора.
 */
export function createDefault5ChamberPoints(
	indicatorId = "intetest_v_134_5",
	allPassed = true,
): ChamberPointEvaluation[] {
	const indicator = STATUTORY_CHEMICAL_INDICATORS.find((ind) => ind.id === indicatorId) ?? STATUTORY_CHEMICAL_INDICATORS[0];
	const initialColor = indicator?.initialColorRu ?? "Сине-зеленый";
	const passedColor = indicator?.passedColorRu ?? "Темно-коричневый";
	const failedColor = indicator?.failedColorRu ?? "Неполный переход цвета";
	const indName = indicator?.tradeNameRu ?? "ИнтеТЕСТ-В-134/5";

	return STATUTORY_CHAMBER_5_POINTS.map((pt) => ({
		pointIndex: pt.pointIndex,
		code: pt.code,
		nameRu: pt.nameRu,
		indicatorId: indicator?.id ?? "intetest_v_134_5",
		indicatorTradeNameRu: indName,
		status: allPassed ? "passed" : "failed",
		initialColorRu: initialColor,
		actualColorRu: allPassed ? passedColor : failedColor,
		notes: allPassed ? "Смена цвета соответствует эталону" : "Недостаточное изменение цвета",
	}));
}
