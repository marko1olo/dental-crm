/**
 * ============================================================================
 * SANPIN 3.3686-21 STERILIZATION CYCLE & SENSORS VALIDATOR (LAYER 1)
 * Валидация физических параметров цикла, оценка 5 контрольных точек камеры,
 * биоконтроль спорами бацилл и расчет дедлайнов по СанПиН 3.3686-21.
 * ============================================================================
 */

import {
	STATUTORY_CHAMBER_5_POINTS,
	STATUTORY_CHEMICAL_INDICATORS,
	STATUTORY_STERILIZATION_REGIMES,
	type SterilizationRegimeId,
} from "../autoclaveLogPresets.js";
import type {
	BiologicalControlTestRecord,
	ChamberPointEvaluation,
	PhysicalSensorsData,
	SterilizationCycleCompliance,
} from "./types.js";

// ─────────────────────────────────────────────────────────────────────────────
// 1. CYCLE COMPLIANCE & PHYSICAL SENSORS EVALUATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Проверка соответствия физических параметров цикла стерилизации нормам СанПиН 3.3686-21:
 * - Температура: отклонение не ниже target, не выше max tolerance (обычно target <= T <= target + 4°C).
 * - Давление: отклонение не ниже target tolerance (для паровых режимов).
 * - Время выдержки: время не может быть меньше нормативного.
 */
export function evaluateCycleParameters(
	regimeId: SterilizationRegimeId,
	sensors: PhysicalSensorsData,
): SterilizationCycleCompliance {
	const regime = STATUTORY_STERILIZATION_REGIMES.find((r) => r.id === regimeId);
	if (!regime) {
		return {
			isCompliant: false,
			isTempCompliant: false,
			isPressureCompliant: false,
			isTimeCompliant: false,
			tempDelta: 0,
			pressureDelta: 0,
			timeDelta: 0,
			failureReasons: [`Неизвестный режим стерилизации: ${regimeId}`],
		};
	}

	const failureReasons: string[] = [];

	// Проверка на физически невозможные / бессмысленные значения
	if (sensors.actualExposureMinutes <= 0) {
		failureReasons.push(
			`Физически невозможное время экспозиции: ${sensors.actualExposureMinutes} мин (выдержка должна быть больше 0 мин)`,
		);
	}
	if (sensors.actualTemperatureCelsius <= 0) {
		failureReasons.push(
			`Физически невозможная температура: ${sensors.actualTemperatureCelsius}°C (температура должна быть больше 0°C)`,
		);
	}
	if (sensors.actualPressureBar < 0) {
		failureReasons.push(
			`Физически невозможное отрицательное давление: ${sensors.actualPressureBar} бар`,
		);
	}

	// Термодинамические проверки насыщенного пара и сухожара
	if (regime.methodType === "steam_autoclave") {
		if (sensors.actualTemperatureCelsius >= 120 && sensors.actualPressureBar <= 0.1) {
			failureReasons.push(
				`Физически невозможные параметры насыщенного пара: температура ${sensors.actualTemperatureCelsius}°C при давлении 0 бар (насыщенный водяной пар в автоклаве требует избыточного давления)`,
			);
		}
		if (sensors.actualTemperatureCelsius <= 105 && sensors.actualPressureBar >= 1.5) {
			failureReasons.push(
				`Физически невозможные термодинамические параметры: температура ${sensors.actualTemperatureCelsius}°C при давлении ${sensors.actualPressureBar} бар (насыщенный пар не может иметь такое соотношение)`,
			);
		}
	} else if (regime.methodType === "dry_heat_air") {
		if (sensors.actualPressureBar > 0.1) {
			failureReasons.push(
				`Физически несовместимый параметр: в сухожаровом шкафу (воздушный метод) давление не создается (зафиксировано избыточное давление ${sensors.actualPressureBar} бар)`,
			);
		}
		if (sensors.actualTemperatureCelsius <= 105 && sensors.actualPressureBar >= 1.0) {
			failureReasons.push(
				`Физически невозможные параметры: сухожар не работает под избыточным давлением ${sensors.actualPressureBar} бар при температуре ${sensors.actualTemperatureCelsius}°C`,
			);
		}
	}

	// Проверка температуры
	const isTempCompliant =
		sensors.actualTemperatureCelsius >= regime.tempToleranceCelsius.min &&
		sensors.actualTemperatureCelsius <= regime.tempToleranceCelsius.max;
	const tempDelta = Number((sensors.actualTemperatureCelsius - regime.targetTemperatureCelsius).toFixed(1));
	if (!isTempCompliant) {
		failureReasons.push(
			`Температура вне нормы: ${sensors.actualTemperatureCelsius}°C (норма ${regime.tempToleranceCelsius.min}–${regime.tempToleranceCelsius.max}°C, отклонение ${tempDelta > 0 ? `+${tempDelta}` : tempDelta}°C)`,
		);
	}

	// Проверка давления (для парового метода и сухожара)
	let isPressureCompliant = true;
	let pressureDelta = 0;
	if (regime.methodType === "steam_autoclave") {
		isPressureCompliant =
			sensors.actualPressureBar >= regime.pressureToleranceBar.min &&
			sensors.actualPressureBar <= regime.pressureToleranceBar.max;
		pressureDelta = Number((sensors.actualPressureBar - regime.targetPressureBar).toFixed(2));
		if (!isPressureCompliant) {
			failureReasons.push(
				`Давление пара вне нормы: ${sensors.actualPressureBar} бар (норма ${regime.pressureToleranceBar.min}–${regime.pressureToleranceBar.max} бар, отклонение ${pressureDelta > 0 ? `+${pressureDelta}` : pressureDelta} бар)`,
			);
		}
	} else if (regime.methodType === "dry_heat_air") {
		isPressureCompliant = sensors.actualPressureBar <= 0.1;
		pressureDelta = sensors.actualPressureBar;
	}

	// Проверка времени экспозиции
	const isTimeCompliant = sensors.actualExposureMinutes >= regime.exposureTimeMinutes;
	const timeDelta = Number((sensors.actualExposureMinutes - regime.exposureTimeMinutes).toFixed(1));
	if (!isTimeCompliant) {
		failureReasons.push(
			`Недостаточная экспозиция: ${sensors.actualExposureMinutes} мин (требуется не менее ${regime.exposureTimeMinutes} мин)`,
		);
	}

	const isCompliant = isTempCompliant && isPressureCompliant && isTimeCompliant && failureReasons.length === 0;

	return {
		isCompliant,
		isTempCompliant,
		isPressureCompliant,
		isTimeCompliant,
		tempDelta,
		pressureDelta,
		timeDelta,
		failureReasons,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. 5 CHAMBER CONTROL POINTS EVALUATION
// ─────────────────────────────────────────────────────────────────────────────

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
			summaryRu = `Аварийный цикл стерилизации (БРАК СТЕРИЛИЗАЦИИ): химический термоиндикатор не сработал (цвет не достиг эталона). Партия бракуется. Не сработали точки: ${failedIndices.map((i) => `КТ-${i}`).join(", ")}`;
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

// ─────────────────────────────────────────────────────────────────────────────
// 3. BIOLOGICAL CONTROL SCHEDULE & EVALUATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Оценка результата бактериологического контроля стерилизатора.
 * СанПиН 3.3686-21: рост тест-культуры свидетельствует о неэффективности стерилизации.
 */
export function evaluateBioControlResult(record: BiologicalControlTestRecord): {
	readonly isCompliant: boolean;
	readonly statusRu: string;
	readonly conclusionRu: string;
} {
	if (record.result === "pending") {
		return {
			isCompliant: false,
			statusRu: "В процессе инкубации",
			conclusionRu: `Посевы в термостате (${record.incubationHours} ч при ${record.incubationTempCelsius}°C). Результат ожидается ${record.dateReadout}.`,
		};
	}

	if (record.result === "growth_failed") {
		return {
			isCompliant: false,
			statusRu: "БРАК (ОБНАРУЖЕН РОСТ МИКРООРГАНИЗМОВ)",
			conclusionRu: `Аварийная ситуация: обнаружен рост тест-культуры ${record.sporeCultureNameRu}. Стерилизатор ${record.sterilizerCode} подлежит немедленному выводу из эксплуатации и внеплановому ТО.`,
		};
	}

	return {
		isCompliant: true,
		statusRu: "СТЕРИЛЬНО (РОСТ ОТСУТСТВУЕТ)",
		conclusionRu: `Эффективность стерилизации подтверждена. Рост тест-культуры ${record.sporeCultureNameRu} отсутствует. Стерилизатор ${record.sterilizerCode} допущен к эксплуатации.`,
	};
}

/**
 * Проверка сроков планового бактериологического контроля (1 раз в 6 месяцев по СанПиН 3.3686-21).
 */
export function checkNextBioControlDeadline(
	lastBioTestDateStr: string,
	currentDate: Date = new Date(),
): {
	readonly nextDueDate: string;
	readonly isOverdue: boolean;
	readonly daysRemaining: number;
	readonly statusDescriptionRu: string;
} {
	const lastDate = new Date(lastBioTestDateStr);
	if (Number.isNaN(lastDate.getTime())) {
		return {
			nextDueDate: "Не определено",
			isOverdue: true,
			daysRemaining: -999,
			statusDescriptionRu: "Дата предыдущего биоконтроля не указана (ТРЕБУЕТСЯ СРОЧНЫЙ БИОКОНТРОЛЬ)",
		};
	}

	// Добавляем 6 месяцев (182 дня)
	const nextDueDateObj = new Date(lastDate);
	nextDueDateObj.setMonth(nextDueDateObj.getMonth() + 6);

	const diffTime = nextDueDateObj.getTime() - currentDate.getTime();
	const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
	const isOverdue = daysRemaining < 0;

	const yyyy = nextDueDateObj.getFullYear();
	const mm = String(nextDueDateObj.getMonth() + 1).padStart(2, "0");
	const dd = String(nextDueDateObj.getDate()).padStart(2, "0");
	const nextDueDate = `${yyyy}-${mm}-${dd}`;

	let statusDescriptionRu = `Плановый биоконтроль в норме (осталось ${daysRemaining} дн. до ${nextDueDate})`;
	if (isOverdue) {
		statusDescriptionRu = `ВНИМАНИЕ: Срок планового биоконтроля истек (${Math.abs(daysRemaining)} дн. назад, норма 1 раз в 6 мес)`;
	} else if (daysRemaining <= 14) {
		statusDescriptionRu = `ПРЕДУПРЕЖДЕНИЕ: До планового биоконтроля осталось ${daysRemaining} дн. (срок ${nextDueDate})`;
	}

	return {
		nextDueDate,
		isOverdue,
		daysRemaining,
		statusDescriptionRu,
	};
}
