import {
	DEFAULT_CHAMBER_POINTS_TEMPLATE,
	STATUTORY_REGIMES,
	type ChamberControlPoint,
	type SterilizationRegimeCode,
} from "./types.js";

export function validateSterilizationCycle(params: {
	regimeId: SterilizationRegimeCode;
	actualTemperatureCelsius: number;
	actualPressureBar: number;
	actualExposureMinutes: number;
	chamberPoints?: readonly ChamberControlPoint[];
	passedIndicatorOverall?: boolean;
}): {
	readonly isValid: boolean;
	readonly isTempCompliant: boolean;
	readonly isPressureCompliant: boolean;
	readonly isTimeCompliant: boolean;
	readonly areIndicatorsCompliant: boolean;
	readonly failureReasons: readonly string[];
} {
	const regime = STATUTORY_REGIMES.find((r) => r.id === params.regimeId) ?? STATUTORY_REGIMES[0]!;
	const failureReasons: string[] = [];

	if (params.actualExposureMinutes <= 0) {
		failureReasons.push(`Физически невозможное время экспозиции: ${params.actualExposureMinutes} мин (выдержка должна быть больше 0 мин)`);
	}
	if (params.actualTemperatureCelsius <= 0) {
		failureReasons.push(`Физически невозможная температура: ${params.actualTemperatureCelsius}°C (температура должна быть больше 0°C)`);
	}
	if (params.actualPressureBar < 0) {
		failureReasons.push(`Физически невозможное отрицательное давление: ${params.actualPressureBar} бар`);
	}

	if (regime.methodType === "steam") {
		if (params.actualTemperatureCelsius >= 120 && params.actualPressureBar <= 0.1) {
			failureReasons.push(`Физически невозможные параметры насыщенного пара: температура ${params.actualTemperatureCelsius}°C при давлении 0 бар`);
		}
		if (params.actualTemperatureCelsius <= 105 && params.actualPressureBar >= 1.5) {
			failureReasons.push(`Физически невозможные термодинамические параметры: температура ${params.actualTemperatureCelsius}°C при давлении ${params.actualPressureBar} бар`);
		}
	} else if (regime.methodType === "dry_heat") {
		if (params.actualPressureBar > 0.1) {
			failureReasons.push(
				`Физически несовместимый параметр: в сухожаровом шкафу (воздушный метод) давление не создается (зафиксировано избыточное давление ${params.actualPressureBar} бар)`,
			);
		}
		if (params.actualTemperatureCelsius <= 105 && params.actualPressureBar >= 1.0) {
			failureReasons.push(`Физически невозможные параметры: сухожар не работает под избыточным давлением ${params.actualPressureBar} бар при температуре ${params.actualTemperatureCelsius}°C`);
		}
	}

	const isTempCompliant = params.actualTemperatureCelsius >= regime.minTemperatureCelsius && params.actualTemperatureCelsius <= regime.maxTemperatureCelsius;
	if (!isTempCompliant) {
		failureReasons.push(params.actualTemperatureCelsius < regime.minTemperatureCelsius
			? `Температура ${params.actualTemperatureCelsius}°C ниже нормы (мин. ${regime.minTemperatureCelsius}°C)`
			: `Температура ${params.actualTemperatureCelsius}°C превысила допустимый предел (макс. ${regime.maxTemperatureCelsius}°C)`);
	}

	let isPressureCompliant = true;
	if (regime.methodType === "steam") {
		isPressureCompliant = params.actualPressureBar >= regime.minPressureBar && params.actualPressureBar <= regime.maxPressureBar;
		if (!isPressureCompliant) {
			failureReasons.push(`Давление пара ${params.actualPressureBar} бар вне диапазона [${regime.minPressureBar}..${regime.maxPressureBar} бар]`);
		}
	}

	const isTimeCompliant = params.actualExposureMinutes >= regime.minExposureMinutes;
	if (!isTimeCompliant) {
		failureReasons.push(`Недостаточная экспозиция: ${params.actualExposureMinutes} мин (требуется не менее ${regime.minExposureMinutes} мин)`);
	}

	let areIndicatorsCompliant = true;
	if (params.chamberPoints && params.chamberPoints.length > 0) {
		const failedPoints = params.chamberPoints.filter((p) => !p.indicatorPassed);
		if (failedPoints.length > 0) {
			areIndicatorsCompliant = false;
			const failedNames = failedPoints.map((p) => `${p.code} (${p.labelRu})`).join(", ");
			failureReasons.push(`Химические индикаторы не сработали в контрольных точках: ${failedNames}`);
		}
	} else if (params.passedIndicatorOverall === false) {
		areIndicatorsCompliant = false;
		failureReasons.push("Химический индикатор стерилизации не достиг цвета эталона");
	}

	const isValid = isTempCompliant && isPressureCompliant && isTimeCompliant && areIndicatorsCompliant && failureReasons.length === 0;

	return {
		isValid,
		isTempCompliant,
		isPressureCompliant,
		isTimeCompliant,
		areIndicatorsCompliant,
		failureReasons,
	};
}

export function createDefaultChamberPoints(
	indicatorTradeNameRu = "Интетест-В-134/5",
	allPassed = true,
): ChamberControlPoint[] {
	return DEFAULT_CHAMBER_POINTS_TEMPLATE.map((pt) => ({
		...pt,
		indicatorPassed: allPassed,
		indicatorColorObservedRu: allPassed ? "Темно-коричневый (соответствует эталону)" : "Бежевый (не изменился)",
	}));
}
