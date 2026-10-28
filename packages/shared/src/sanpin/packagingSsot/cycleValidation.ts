/**
 * packages/shared/src/sanpin/packagingSsot/cycleValidation.ts
 * Валидация физических параметров цикла стерилизации.
 * Мандат 8b: строго <= 120 строк.
 */

import {
	getSanpinSterilizationRegime,
	type SanpinSterilizationRegimeDefinition,
	type SanpinSterilizationRegimeId,
} from "./sterilizationRegimes.js";

export interface SterilizationCycleValidationResult {
	readonly isValid: boolean;
	readonly regime: SanpinSterilizationRegimeDefinition;
	readonly actualTempCelsius: number;
	readonly actualPressureBar: number;
	readonly actualExposureMinutes: number;
	readonly errors: readonly string[];
	readonly warnings: readonly string[];
	readonly complianceVerdictRu: string;
}

export function validateSterilizationCycleParameters(
	regimeId: SanpinSterilizationRegimeId,
	actualTemp: number,
	actualPressure: number,
	actualMinutes: number,
): SterilizationCycleValidationResult {
	const regime = getSanpinSterilizationRegime(regimeId);
	const errors: string[] = [];
	const warnings: string[] = [];

	if (actualMinutes <= 0) errors.push(`Недопустимое время: выдержка ${actualMinutes} мин должна быть > 0`);
	if (actualTemp <= 0) errors.push(`Недопустимая температура: ${actualTemp}°C`);
	if (actualPressure < 0) errors.push(`Отрицательное давление невозможно: ${actualPressure} бар`);

	if (regime.methodType === "steam_autoclave" && actualTemp >= 120 && actualPressure <= 0.1) {
		errors.push(`Сбой пара: автоклав при ${actualTemp}°C требует избыточного давления насыщенного пара`);
	} else if (regime.methodType === "dry_heat_air" && actualPressure > 0.1) {
		errors.push(`Недопустимый параметр: сухожар работает при атмосферном давлении (факт ${actualPressure} бар)`);
	}

	if (actualTemp < regime.minTemperatureCelsius) {
		errors.push(`Критический сбой температуры: ${actualTemp}°C ниже нормы ${regime.minTemperatureCelsius}°C.`);
	} else if (actualTemp > regime.maxTemperatureCelsius) {
		errors.push(`Превышение температуры: ${actualTemp}°C выше предела ${regime.maxTemperatureCelsius}°C.`);
	}

	if (regime.methodType === "steam_autoclave") {
		if (actualPressure < regime.minPressureBar) {
			errors.push(`Недостаточное давление пара: ${actualPressure} бар ниже нормы ${regime.minPressureBar} бар.`);
		} else if (actualPressure > regime.maxPressureBar) {
			warnings.push(`Превышение давления: ${actualPressure} бар выше нормы ${regime.maxPressureBar} бар.`);
		}
	}

	if (actualMinutes < regime.minExposureMinutes) {
		errors.push(`Недостаточная выдержка: ${actualMinutes} мин вместо минимальных ${regime.minExposureMinutes} мин.`);
	}

	const isValid = errors.length === 0;
	const complianceVerdictRu = isValid
		? (warnings.length === 0
			? `Параметры цикла в норме (${regime.shortLabelRu}). Стерилизация подтверждена.`
			: `Параметры в допуске: ${warnings.join("; ")}`)
		: "БРАК СТЕРИЛИЗАЦИИ: параметры нарушают требования норм. Все пакеты подлежат повторной очистке и стерилизации.";

	return {
		isValid,
		regime,
		actualTempCelsius: actualTemp,
		actualPressureBar: actualPressure,
		actualExposureMinutes: actualMinutes,
		errors,
		warnings,
		complianceVerdictRu,
	};
}
