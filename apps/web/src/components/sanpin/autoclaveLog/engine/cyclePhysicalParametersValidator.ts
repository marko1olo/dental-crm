import { STATUTORY_STERILIZATION_REGIMES, type SterilizationRegimeId } from "../autoclaveLogPresets.js";
import type { PhysicalSensorsData, SterilizationCycleCompliance } from "./types.js";

/**
 * Проверка соответствия физических параметров цикла стерилизации нормам СанПиН 3.3686-21.
 */
export function evaluateCycleParameters(
	regimeId: SterilizationRegimeId,
	sensors: PhysicalSensorsData,
): SterilizationCycleCompliance {
	const regime = STATUTORY_STERILIZATION_REGIMES.find((r) => r.id === regimeId);
	if (!regime) {
		return {
			isCompliant: false, isTempCompliant: false, isPressureCompliant: false, isTimeCompliant: false,
			tempDelta: 0, pressureDelta: 0, timeDelta: 0,
			failureReasons: [`Неизвестный режим стерилизации: ${regimeId}`],
		};
	}

	const failureReasons: string[] = [];
	if (sensors.actualExposureMinutes <= 0) {
		failureReasons.push(`Физически невозможное время экспозиции: ${sensors.actualExposureMinutes} мин (> 0 мин)`);
	}
	if (sensors.actualTemperatureCelsius <= 0) {
		failureReasons.push(`Физически невозможная температура: ${sensors.actualTemperatureCelsius}°C (> 0°C)`);
	}
	if (sensors.actualPressureBar < 0) {
		failureReasons.push(`Физически невозможное отрицательное давление: ${sensors.actualPressureBar} бар`);
	}

	if (regime.methodType === "steam_autoclave") {
		if (sensors.actualTemperatureCelsius >= 120 && sensors.actualPressureBar <= 0.1) {
			failureReasons.push(
				`Физически невозможные параметры насыщенного пара: ${sensors.actualTemperatureCelsius}°C при 0 бар`,
			);
		}
		if (sensors.actualTemperatureCelsius <= 105 && sensors.actualPressureBar >= 1.5) {
			failureReasons.push(
				`Несовместимые термодинамические параметры: ${sensors.actualTemperatureCelsius}°C при ${sensors.actualPressureBar} бар`,
			);
		}
	} else if (regime.methodType === "dry_heat_air") {
		if (sensors.actualPressureBar > 0.1) {
			failureReasons.push(
				`В сухожаровом шкафу (воздушный метод) давление не создается (зафиксировано ${sensors.actualPressureBar} бар)`,
			);
		}
		if (sensors.actualTemperatureCelsius <= 105 && sensors.actualPressureBar >= 1.0) {
			failureReasons.push(
				`Сухожар не работает под давлением ${sensors.actualPressureBar} бар при ${sensors.actualTemperatureCelsius}°C`,
			);
		}
	}

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
				`Давление пара вне нормы: ${sensors.actualPressureBar} бар (норма ${regime.pressureToleranceBar.min}–${regime.pressureToleranceBar.max} бар, отклонение ${pressureDelta > 0 ? `+${pressureDelta}` : pressureDelta} бар)`,
			);
		}
	} else if (regime.methodType === "dry_heat_air") {
		isPressureCompliant = sensors.actualPressureBar <= 0.1;
		pressureDelta = sensors.actualPressureBar;
	}

	const isTimeCompliant = sensors.actualExposureMinutes >= regime.exposureTimeMinutes;
	const timeDelta = Number((sensors.actualExposureMinutes - regime.exposureTimeMinutes).toFixed(1));
	if (!isTimeCompliant) {
		failureReasons.push(`Недостаточная экспозиция: ${sensors.actualExposureMinutes} мин (требуется ${regime.exposureTimeMinutes} мин)`);
	}

	const isCompliant = isTempCompliant && isPressureCompliant && isTimeCompliant && failureReasons.length === 0;

	return {
		isCompliant, isTempCompliant, isPressureCompliant, isTimeCompliant,
		tempDelta, pressureDelta, timeDelta, failureReasons,
	};
}
