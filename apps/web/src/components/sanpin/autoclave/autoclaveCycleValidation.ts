import type { AutoclaveCycleDefinition } from "./autoclavePresets";

export interface CycleValidationResult {
	isApproved: boolean;
	temperaturePassed: boolean;
	pressurePassed: boolean;
	plateauTimePassed: boolean;
	violations: string[];
	complianceMessageRu: string;
}

export function validateSterilizationCycleParameters(
	cycleDef: AutoclaveCycleDefinition,
	measuredTempCelsius: number,
	measuredPressureBar: number,
	measuredPlateauTimeMin: number,
): CycleValidationResult {
	const violations: string[] = [];

	if (measuredPlateauTimeMin <= 0) {
		violations.push(`Физически невозможная выдержка: ${measuredPlateauTimeMin} мин (время должно быть строго > 0)`);
	}
	if (measuredTempCelsius <= 0) {
		violations.push(`Физически невозможная температура: ${measuredTempCelsius}°C`);
	}
	if (measuredPressureBar < 0) {
		violations.push(`Физически невозможное давление: ${measuredPressureBar} бар`);
	}
	if (measuredTempCelsius >= 120 && measuredPressureBar <= 0.1) {
		violations.push(`Термодинамическая ошибка: водяной пар при ${measuredTempCelsius}°C не может иметь давление ${measuredPressureBar} бар`);
	}
	if (measuredTempCelsius <= 105 && measuredPressureBar >= 1.5) {
		violations.push(`Термодинамическая ошибка: давление ${measuredPressureBar} бар при температуре ${measuredTempCelsius}°C невозможно`);
	}

	const temperaturePassed =
		measuredTempCelsius >= cycleDef.temperatureToleranceCelsius.min &&
		measuredTempCelsius <= cycleDef.temperatureToleranceCelsius.max;

	if (!temperaturePassed && measuredTempCelsius > 0) {
		violations.push(
			`Температура стерилизации ${measuredTempCelsius.toFixed(1)}°C вне допуска [${cycleDef.temperatureToleranceCelsius.min}..${cycleDef.temperatureToleranceCelsius.max}°C]`,
		);
	}

	const pressurePassed =
		measuredPressureBar >= cycleDef.pressureToleranceBar.min &&
		measuredPressureBar <= cycleDef.pressureToleranceBar.max;

	if (!pressurePassed && measuredPressureBar >= 0) {
		violations.push(
			`Давление пара ${measuredPressureBar.toFixed(2)} бар вне допуска [${cycleDef.pressureToleranceBar.min}..${cycleDef.pressureToleranceBar.max} бар]`,
		);
	}

	const plateauTimePassed = measuredPlateauTimeMin >= cycleDef.plateauTimeMinutes;
	if (!plateauTimePassed && measuredPlateauTimeMin > 0) {
		violations.push(
			`Время стерилизационной выдержки ${measuredPlateauTimeMin} мин меньше нормы ${cycleDef.plateauTimeMinutes} мин`,
		);
	}

	const isApproved = violations.length === 0 && temperaturePassed && pressurePassed && plateauTimePassed;
	const complianceMessageRu = isApproved
		? "Параметры цикла строго соответствуют СанПиН 3.3686-21 и ГОСТ ISO 17665."
		: `БРАК СТЕРИЛИЗАЦИИ: ${violations.join("; ")}. Загрузка подлежит карантину и повторной стерилизации!`;

	return {
		isApproved,
		temperaturePassed,
		pressurePassed,
		plateauTimePassed,
		violations,
		complianceMessageRu,
	};
}
