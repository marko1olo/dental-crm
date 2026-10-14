import {
	SanPiNRegulatoryEngine,
	type BactericidalLampStatus,
} from "@dental/shared";

export interface LampLifeAssessment {
	readonly remainingHours: number;
	readonly remainingPercent: number;
	readonly status: BactericidalLampStatus;
	readonly isCritical: boolean;
	readonly warningMessage: string | null;
}

/**
 * Чистая функция расчёта наработки и ресурса УФ-бактерицидных ламп
 * в соответствии с руководством Р 3.5.1904-04 и СанПиН 3.3686-21.
 * Вычисляет остаточный ресурс, процент износа и формирует клиническое
 * предупреждение при износе >= 90% (>= 7200 ч) или предельном ресурсе (>= 8000 ч).
 */
export function calculateBactericidalLampResource(
	totalHours: number,
	maxHours: number = 8000,
): LampLifeAssessment {
	const sanitizedTotal = Number.isFinite(totalHours) ? Math.max(0, totalHours) : 0;
	const sanitizedMax = Number.isFinite(maxHours) && maxHours > 0 ? maxHours : 8000;

	return SanPiNRegulatoryEngine.calculateLampLife(sanitizedTotal, sanitizedMax);
}

/**
 * Пересчет минут сеанса работы облучателя в часы с округлением до сотых.
 */
export function calculateSessionHours(durationMinutes: number): number {
	if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) return 0;
	return Number((durationMinutes / 60).toFixed(2));
}

/**
 * Расчет кумулятивной наработки часов после очередного сеанса.
 */
export function calculateCumulativeOperatingHours(
	previousTotalHours: number,
	sessionDurationMinutes: number,
): number {
	const sessionHours = calculateSessionHours(sessionDurationMinutes);
	const prev = Number.isFinite(previousTotalHours) ? Math.max(0, previousTotalHours) : 0;
	return Number((prev + sessionHours).toFixed(2));
}

/**
 * Расчет нормативной экспозиции и кратности воздухообмена по объему кабинета
 * в соответствии с Руководством Р 3.5.1904-04 для стоматологических кабинетов.
 */
export function calculateExposureAndVentilationNorm(
	roomVolumeM3: number,
	devicePerformanceM3H: number = 60,
): {
	readonly recommendedMinutes: number;
	readonly requiredAirExchanges: number;
	readonly ventilationAirVolumeM3: number;
} {
	const volume = Math.max(1, roomVolumeM3);
	const performance = Math.max(1, devicePerformanceM3H);

	// Для стоматологического кабинета (категория II/III) требуется не менее 2-кратного объема
	const requiredAirExchanges = 2;
	const ventilationAirVolumeM3 = volume * requiredAirExchanges;
	const recommendedMinutes = Math.ceil((ventilationAirVolumeM3 / performance) * 60);

	return {
		recommendedMinutes: Math.max(15, Math.min(120, recommendedMinutes)),
		requiredAirExchanges,
		ventilationAirVolumeM3,
	};
}
