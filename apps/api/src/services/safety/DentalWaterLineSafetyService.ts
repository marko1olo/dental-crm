export const WATER_QUALITY_THRESHOLD_NORMAL = 200;
export const WATER_QUALITY_THRESHOLD_WARNING = 500;

export type WaterQualityStatus = "normal" | "warning" | "critical";

export interface WaterQualityReport {
	status: WaterQualityStatus;
	isUnitLocked: boolean;
	cfuPerMl: number;
	nextShockDisinfectionDate: Date;
	rationale: string;
}

export class DentalWaterLineSafetyService {
	/**
	 * Оценка качества воды в стоматологической установке по СанПиН 2.1.3684-21.
	 * КОЕ/мл — колониеобразующих единиц в 1 мл.
	 */
	public static evaluateWaterQuality(cfuPerMl: number, lastShockDisinfection: Date): WaterQualityReport {
		const nextShockDisinfectionDate = new Date(lastShockDisinfection);
		nextShockDisinfectionDate.setDate(nextShockDisinfectionDate.getDate() + 30); // Регламент раз в 30 дней

		if (cfuPerMl > WATER_QUALITY_THRESHOLD_WARNING) {
			return {
				status: "critical",
				isUnitLocked: true,
				cfuPerMl,
				nextShockDisinfectionDate,
				rationale: `Критическое заражение биопленкой (${cfuPerMl} КОЕ/мл > ${WATER_QUALITY_THRESHOLD_WARNING} КОЕ/мл). Установка заблокирована. Требуется немедленная шоковая дезинфекция.`,
			};
		}

		if (cfuPerMl > WATER_QUALITY_THRESHOLD_NORMAL) {
			return {
				status: "warning",
				isUnitLocked: false,
				cfuPerMl,
				nextShockDisinfectionDate,
				rationale: `Уровень микробной контаминации (${cfuPerMl} КОЕ/мл) превышает норму (${WATER_QUALITY_THRESHOLD_NORMAL} КОЕ/мл). Рекомендуется плановая дезинфекция.`,
			};
		}

		return {
			status: "normal",
			isUnitLocked: false,
			cfuPerMl,
			nextShockDisinfectionDate,
			rationale: "Качество воды соответствует нормам СанПиН 2.1.3684-21.",
		};
	}
}
