/**
 * apps/web/src/components/sanpin/kraft/kraftShelfLifeCalculators.ts
 *
 * Расчет сроков годности и валидация циклов (СанПиН 3.3686-21).
 * Мандат 8b: строго <= 120 строк.
 */

import { SANPIN_PACKAGING_TYPES, type SanpinPackagingTypeId, type SanpinPackagingTypeDefinition } from "./kraftPackagingTypes";
import { STERILIZATION_REGIMES, type SterilizationRegimeId } from "./kraftSterilizationRegimes";

export type PackageSterilityStatus = "valid" | "expiring_soon" | "expired";

export interface PackageExpiryEvaluation {
	readonly packDateIso: string;
	readonly expiryDateIso: string;
	readonly packDateFormatted: string;
	readonly expiryDateFormatted: string;
	readonly shelfLifeDays: number;
	readonly daysRemaining: number;
	readonly status: PackageSterilityStatus;
	readonly statusLabelRu: string;
	readonly statusColorHex: string;
	readonly isExpired: boolean;
	readonly isExpiringSoon: boolean;
	readonly sanpinClause: string;
	readonly recommendationRu: string;
}

export function getSanpinPackagingTypeDefinition(typeId: SanpinPackagingTypeId): SanpinPackagingTypeDefinition {
	return SANPIN_PACKAGING_TYPES.find((t) => t.id === typeId) || SANPIN_PACKAGING_TYPES[0]!;
}

export function formatDaysRussian(days: number): string {
	const abs = Math.abs(days);
	const mod10 = abs % 10;
	const mod100 = abs % 100;
	if (mod100 >= 11 && mod100 <= 19) return "дней";
	if (mod10 === 1) return "день";
	if (mod10 >= 2 && mod10 <= 4) return "дня";
	return "дней";
}

export function calculateSanpinShelfLifeDays(
	packagingType: SanpinPackagingTypeId,
	options?: { manufacturerDays?: number | undefined; customDays?: number | undefined },
): number {
	const def = getSanpinPackagingTypeDefinition(packagingType);
	if (typeof options?.customDays === "number" && options.customDays > 0) return Math.min(Math.max(options.customDays, 1), 365);
	if (typeof options?.manufacturerDays === "number" && options.manufacturerDays > 0) {
		const maxDays = def.isHeatSealed ? Math.max(def.maxShelfLifeDays, 365) : def.maxShelfLifeDays;
		return Math.min(Math.max(options.manufacturerDays, def.minShelfLifeDays), maxDays);
	}
	return def.defaultShelfLifeDays;
}

export function calculatePackageExpiryDate(
	packDateInput: string | Date,
	packagingType: SanpinPackagingTypeId,
	options?: { shelfLifeDays?: number; manufacturerDays?: number; referenceDate?: string | Date },
): PackageExpiryEvaluation {
	const packDate = typeof packDateInput === "string" ? new Date(packDateInput) : new Date(packDateInput.getTime());
	const refDate = options?.referenceDate ? new Date(options.referenceDate) : new Date();
	const def = getSanpinPackagingTypeDefinition(packagingType);
	const shelfLifeDays = calculateSanpinShelfLifeDays(packagingType, { manufacturerDays: options?.manufacturerDays, customDays: options?.shelfLifeDays });

	const expDate = new Date(packDate.getTime());
	expDate.setDate(expDate.getDate() + shelfLifeDays);
	const daysRemaining = Math.ceil((expDate.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24));

	const isExp = daysRemaining <= 0;
	const isSoon = !isExp && daysRemaining <= 7;
	const status: PackageSterilityStatus = isExp ? "expired" : isSoon ? "expiring_soon" : "valid";
	const statusColorHex = isExp ? "#ef4444" : isSoon ? "#f59e0b" : "#10b981";
	const statusLabelRu = isExp ? (daysRemaining === 0 ? "Истекает сегодня" : `ПРОСРОЧЕНО на ${Math.abs(daysRemaining)} дн.`) : isSoon ? `Истекает через ${daysRemaining} ${formatDaysRussian(daysRemaining)}` : "Стерильно (Годен)";

	return {
		packDateIso: packDate.toISOString(), expiryDateIso: expDate.toISOString(),
		packDateFormatted: packDate.toISOString().slice(0, 10), expiryDateFormatted: expDate.toISOString().slice(0, 10),
		shelfLifeDays, daysRemaining, status, statusLabelRu, statusColorHex,
		isExpired: isExp, isExpiringSoon: isSoon, sanpinClause: def.sanpinClauseRu,
		recommendationRu: isExp ? "ВНИМАНИЕ! Срок стерильности истек. Использование запрещено. Отправить на повторную очистку и стерилизацию." : "Изделие стерильно, готово к безопасному клиническому применению.",
	};
}

export function validateSterilizationCycleParameters(
	regimeId: SterilizationRegimeId, actualTemp: number, actualPressure: number, actualTimeMinutes: number,
) {
	const regime = STERILIZATION_REGIMES.find((r) => r.id === regimeId) || STERILIZATION_REGIMES[0]!;
	const errors: string[] = [];
	const warnings: string[] = [];

	if (actualTimeMinutes < regime.minExposureMinutes) {
		errors.push(`НЕДОСТАТОЧНОЕ ВРЕМЯ СТЕРИЛИЗАЦИИ: выдержка ${actualTimeMinutes} мин вместо ${regime.minExposureMinutes} мин. Цикл аннулирован.`);
	}
	if (actualTemp < regime.minTemperatureCelsius) {
		errors.push(`КРИТИЧЕСКИЙ СБОЙ ТЕМПЕРАТУРЫ: факт ${actualTemp}°C ниже минимальной нормы ${regime.minTemperatureCelsius}°C. Стерильность НЕ гарантирована.`);
	}
	if (actualTemp > regime.maxTemperatureCelsius) {
		errors.push(`ПРЕВЫШЕНИЕ ТЕМПЕРАТУРЫ: факт ${actualTemp}°C выше допустимого предела ${regime.maxTemperatureCelsius}°C.`);
	}
	if (regime.methodType === "steam_autoclave" && actualPressure < regime.minPressureBar) {
		errors.push(`НЕДОСТАТОЧНОЕ ДАВЛЕНИЕ ПАРА: факт ${actualPressure} бар ниже нормы ${regime.minPressureBar} бар.`);
	}

	const isValid = errors.length === 0;
	const complianceVerdictRu = isValid
		? `Цикл полностью соответствует нормам ${regime.sanpinNormClauseRu}. Стерилизация подтверждена.`
		: `БРАК СТЕРИЛИЗАЦИИ: параметры цикла нарушают требования норм. Все пакеты подлежат повторной очистке и стерилизации.`;

	return {
		isValid, regime, actualTempCelsius: actualTemp, actualPressureBar: actualPressure, actualExposureMinutes: actualTimeMinutes,
		tempDeltaCelsius: actualTemp - regime.targetTemperatureCelsius, pressureDeltaBar: actualPressure - regime.targetPressureBar,
		timeDeltaMinutes: actualTimeMinutes - regime.targetExposureMinutes, errors, warnings, complianceVerdictRu,
	};
}
