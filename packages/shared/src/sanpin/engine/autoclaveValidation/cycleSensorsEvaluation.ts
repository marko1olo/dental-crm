/**
 * packages/shared/src/sanpin/engine/autoclaveValidation/cycleSensorsEvaluation.ts
 * Оценка физических датчиков цикла стерилизатора (температура, давление, выдержка).
 * Мандат 8b: строго <= 120 строк.
 */

import { STATUTORY_STERILIZATION_REGIMES } from "../sanpinNorms.js";
import type { PhysicalSensorsData, SterilizationCycleCompliance, SterilizationRegimeId } from "../types.js";

export function evaluateCycleParameters(
	regimeId: SterilizationRegimeId,
	sensors: PhysicalSensorsData,
): SterilizationCycleCompliance {
	const regime = STATUTORY_STERILIZATION_REGIMES.find((r) => r.id === regimeId) || STATUTORY_STERILIZATION_REGIMES[0]!;
	const failureReasons: string[] = [];

	const isTempCompliant =
		sensors.actualTemperatureCelsius >= regime.tempToleranceCelsius.min &&
		sensors.actualTemperatureCelsius <= regime.tempToleranceCelsius.max;
	const tempDelta = Number((sensors.actualTemperatureCelsius - regime.targetTemperatureCelsius).toFixed(1));
	if (!isTempCompliant) {
		failureReasons.push(
			`Температура вне нормы: ${sensors.actualTemperatureCelsius}°C (норма ${regime.tempToleranceCelsius.min}–${regime.tempToleranceCelsius.max}°C, отклонение ${tempDelta > 0 ? `+${tempDelta}` : tempDelta}°C)`,
		);
	}

	let isPressureCompliant = true;
	let pressureDelta = 0;
	if (regime.methodType === "steam_autoclave") {
		isPressureCompliant =
			sensors.actualPressureBar >= regime.pressureToleranceBar.min &&
			sensors.actualPressureBar <= regime.pressureToleranceBar.max;
		pressureDelta = Number((sensors.actualPressureBar - regime.targetPressureBar).toFixed(2));
		if (!isPressureCompliant) {
			failureReasons.push(
				`Давление пара вне нормы: ${sensors.actualPressureBar} атм/бар (норма ${regime.pressureToleranceBar.min}–${regime.pressureToleranceBar.max} атм, отклонение ${pressureDelta > 0 ? `+${pressureDelta}` : pressureDelta} атм)`,
			);
		}
	}

	const isTimeCompliant = sensors.actualExposureMinutes >= regime.exposureTimeMinutes;
	const timeDelta = Number((sensors.actualExposureMinutes - regime.exposureTimeMinutes).toFixed(1));
	if (!isTimeCompliant) {
		failureReasons.push(
			`Недостаточная экспозиция: ${sensors.actualExposureMinutes} мин (требуется не менее ${regime.exposureTimeMinutes} мин)`,
		);
	}

	const isCompliant = isTempCompliant && isPressureCompliant && isTimeCompliant;

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

export interface BioControlDeadlineResult {
	readonly lastTestDate: string;
	readonly nextDeadlineDate: string;
	readonly daysRemaining: number;
	readonly isOverdue: boolean;
	readonly statusDescriptionRu: string;
}

export function checkNextBioControlDeadline(
	lastTestDate: string,
	currentDate: Date = new Date(),
): BioControlDeadlineResult {
	const lastDate = new Date(lastTestDate);
	const nextDeadline = new Date(lastDate);
	nextDeadline.setMonth(nextDeadline.getMonth() + 6);

	const diffMs = nextDeadline.getTime() - currentDate.getTime();
	const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
	const isOverdue = daysRemaining < 0;

	return {
		lastTestDate,
		nextDeadlineDate: nextDeadline.toISOString().slice(0, 10),
		daysRemaining,
		isOverdue,
		statusDescriptionRu: isOverdue
			? `ВНИМАНИЕ: Срок проведения бактериологического контроля истек (${Math.abs(daysRemaining)} дн. назад)`
			: `Бактериологический контроль в норме (до следующего контроля ${daysRemaining} дн.)`,
	};
}
