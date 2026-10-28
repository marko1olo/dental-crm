/**
 * packages/shared/src/sanpin/engine/autoclaveValidation/chamberPointsEvaluation.ts
 * Оценка химических индикаторов в контрольных точках камеры автоклава.
 * Мандат 8b: строго <= 120 строк.
 */

import { STATUTORY_CHAMBER_5_POINTS } from "../sanpinNorms.js";
import type { ChamberPointEvaluation } from "../types.js";

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
			summaryRu: "Контрольные точки камеры не протестированы",
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

	let summaryRu = "Все 5 контрольных точек: СТЕРИЛЬНО (100% переход индикаторов 5 класса)";
	if (!areAllPointsPassed) {
		if (failedIndices.length > 0) {
			summaryRu = `БРАК СТЕРИЛИЗАЦИИ: Индикаторы не сработали в точках: ${failedIndices.map((i) => `КТ-${i}`).join(", ")}`;
		} else {
			summaryRu = `БРАК СТЕРИЛИЗАЦИИ: Проверено только ${points.length} из 5 обязательных точек`;
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

export function createDefault5ChamberPoints(
	indicatorTradeNameRu = "Интеграл-134 (Класс 5)",
	allPassed = true,
): ChamberPointEvaluation[] {
	return STATUTORY_CHAMBER_5_POINTS.map((pt) => ({
		pointIndex: pt.pointIndex,
		code: pt.code,
		nameRu: pt.nameRu,
		indicatorId: "vinar_intetest_5",
		indicatorTradeNameRu,
		status: allPassed ? "passed" : "failed",
		initialColorRu: "Сине-зеленый",
		actualColorRu: allPassed ? "Темно-коричневый" : "Неполный переход",
		notes: allPassed ? "Смена цвета соответствует эталону" : "Недостаточное изменение цвета",
	}));
}
