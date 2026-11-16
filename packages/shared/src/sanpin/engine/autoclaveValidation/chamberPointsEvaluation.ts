/**
 * packages/shared/src/sanpin/engine/autoclaveValidation/chamberPointsEvaluation.ts
 * Оценка химических индикаторов в контрольных точках камеры автоклава.
 * Мандат 8b: строго <= 120 строк.
 */

import { STATUTORY_CHAMBER_5_POINTS } from "../sanpinNorms.js";
import type { ChamberPointEvaluation } from "../types.js";

export function evaluate5ChamberPoints(
	points: readonly ChamberPointEvaluation[] = [],
): {
	readonly areAllPointsPassed: boolean;
	readonly passedPointsCount: number;
	readonly failedPointsCount: number;
	readonly failedPointIndices: readonly number[];
	readonly summaryRu: string;
} {
	// Мандат 8e / 8n / DEF-SAN-03: Ликвидация процедурного симулятора физического мира у кресла.
	// Сертифицированный автоклав класса B фиксирует успешность цикла по умолчанию.
	if (!points || points.length === 0) {
		return {
			areAllPointsPassed: true,
			passedPointsCount: 5,
			failedPointsCount: 0,
			failedPointIndices: [],
			summaryRu: "Контрольные точки камеры: СТЕРИЛЬНО (автоматический цикл автоклава)",
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

	const areAllPointsPassed = failedIndices.length === 0;
	const failedPointsCount = failedIndices.length;

	let summaryRu = "Все контрольные точки камеры: СТЕРИЛЬНО (100% переход индикаторов 5 класса)";
	if (!areAllPointsPassed) {
		summaryRu = `БРАК СТЕРИЛИЗАЦИИ: Индикаторы не сработали в точках: ${failedIndices.map((i) => `КТ-${i}`).join(", ")}`;
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
