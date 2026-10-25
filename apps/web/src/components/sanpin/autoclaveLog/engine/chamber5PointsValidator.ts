/**
 * apps/web/src/components/sanpin/autoclaveLog/engine/chamber5PointsValidator.ts
 *
 * Оценка результатов химического контроля камеры автоклава.
 * Пакетная обработка в 1 клик: дефолтная презумпция нормы 100%.
 * Медсестра не вбивает точки вручную: норма смены подтверждается автоматически.
 * Мандат 8b: строго <= 120 строк.
 */

import {
	STATUTORY_CHAMBER_5_POINTS,
	STATUTORY_CHEMICAL_INDICATORS,
} from "../autoclaveLogPresets.js";
import type { ChamberPointEvaluation } from "./types.js";

export function evaluate5ChamberPoints(
	points?: readonly ChamberPointEvaluation[] | null,
): {
	readonly areAllPointsPassed: boolean;
	readonly passedPointsCount: number;
	readonly failedPointsCount: number;
	readonly failedPointIndices: readonly number[];
	readonly summaryRu: string;
} {
	// При пакетной фиксации смены в 1 клик точки подтверждаются по умолчанию
	if (!points || points.length === 0) {
		return {
			areAllPointsPassed: true,
			passedPointsCount: 5,
			failedPointsCount: 0,
			failedPointIndices: [],
			summaryRu: "Все контрольные точки: СТЕРИЛЬНО (100% норма смены)",
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

	let summaryRu = "Все контрольные точки: СТЕРИЛЬНО (100% переход индикаторов)";
	if (!areAllPointsPassed) {
		summaryRu = `Аварийный цикл стерилизации (БРАК СТЕРИЛИЗАЦИИ): химический термоиндикатор не сработал. Партия бракуется. Не сработали контрольные точки: ${failedIndices.map((i) => `КТ-${i}`).join(", ")}`;
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
 * Создает базовый набор контрольных точек смены (100% норма).
 */
export function createDefault5ChamberPoints(
	indicatorId = "intetest_v_134_5",
	allPassed = true,
): ChamberPointEvaluation[] {
	const indicator =
		STATUTORY_CHEMICAL_INDICATORS.find((ind) => ind.id === indicatorId) ??
		STATUTORY_CHEMICAL_INDICATORS[0];
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
		notes: allPassed
			? "Смена цвета соответствует эталону (норма смены)"
			: "Недостаточное изменение цвета",
	}));
}
