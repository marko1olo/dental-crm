/**
 * packages/shared/src/sanpin/packagingSsot/sterilizationRegimes.ts
 * Режимы стерилизации и автоклавирования (СанПиН 3.3686-21).
 * Мандат 8b: строго <= 120 строк.
 */

export type SanpinSterilizationRegimeId =
	| "steam_134_5min"
	| "steam_121_20min"
	| "dry_heat_180_60min"
	| "steam_132_20min";

export interface SanpinSterilizationRegimeDefinition {
	readonly id: SanpinSterilizationRegimeId;
	readonly nameRu: string;
	readonly shortLabelRu: string;
	readonly methodType: "steam_autoclave" | "dry_heat_air";
	readonly targetTemperatureCelsius: number;
	readonly minTemperatureCelsius: number;
	readonly maxTemperatureCelsius: number;
	readonly targetPressureBar: number;
	readonly minPressureBar: number;
	readonly maxPressureBar: number;
	readonly targetExposureMinutes: number;
	readonly minExposureMinutes: number;
	readonly recommendedIndicatorClass: 4 | 5 | 6;
	readonly sanpinNormClauseRu: string;
	readonly dentalApplicationRu: string;
}

export const SANPIN_STERILIZATION_REGIMES: readonly SanpinSterilizationRegimeDefinition[] = [
	{
		id: "steam_134_5min",
		nameRu: "Паровой автоклав: 134°C / 2.1 бар / 5 мин (Стандартный стоматологический)",
		shortLabelRu: "Автоклав 134°C (5 мин / 2.1 бар)",
		methodType: "steam_autoclave",
		targetTemperatureCelsius: 134,
		minTemperatureCelsius: 134,
		maxTemperatureCelsius: 138,
		targetPressureBar: 2.1,
		minPressureBar: 2.0,
		maxPressureBar: 2.3,
		targetExposureMinutes: 5,
		minExposureMinutes: 5,
		recommendedIndicatorClass: 5,
		sanpinNormClauseRu: "СанПиН 3.3686-21 Таблица 3.12 (Паровой метод, режим 1)",
		dentalApplicationRu: "Металлические инструменты, наконечники, боры, смотровые лотки",
	},
	{
		id: "steam_121_20min",
		nameRu: "Паровой автоклав: 121°C / 1.1 бар / 20 мин (Деликатный для термолабильных изделий)",
		shortLabelRu: "Автоклав 121°C (20 мин / 1.1 бар)",
		methodType: "steam_autoclave",
		targetTemperatureCelsius: 121,
		minTemperatureCelsius: 120,
		maxTemperatureCelsius: 125,
		targetPressureBar: 1.1,
		minPressureBar: 1.05,
		maxPressureBar: 1.3,
		targetExposureMinutes: 20,
		minExposureMinutes: 20,
		recommendedIndicatorClass: 5,
		sanpinNormClauseRu: "СанПиН 3.3686-21 Таблица 3.12 (Паровой метод, режим 2)",
		dentalApplicationRu: "Резиновые изделия, силикон, термолабильный пластик, световоды",
	},
	{
		id: "dry_heat_180_60min",
		nameRu: "Воздушный стерилизатор (Сухожар): 180°C / 60 мин (атмосферное давление)",
		shortLabelRu: "Сухожар 180°C (60 мин)",
		methodType: "dry_heat_air",
		targetTemperatureCelsius: 180,
		minTemperatureCelsius: 180,
		maxTemperatureCelsius: 190,
		targetPressureBar: 0,
		minPressureBar: 0,
		maxPressureBar: 0.05,
		targetExposureMinutes: 60,
		minExposureMinutes: 60,
		recommendedIndicatorClass: 4,
		sanpinNormClauseRu: "СанПиН 3.3686-21 Таблица 3.13 (Воздушный метод)",
		dentalApplicationRu: "Цельнометаллические боры, щипцы, элеваторы без резиновых уплотнителей",
	},
	{
		id: "steam_132_20min",
		nameRu: "Паровой автоклав: 132°C / 2.0 бар / 20 мин (Нормативный режим)",
		shortLabelRu: "Автоклав 132°C (20 мин / 2.0 бар)",
		methodType: "steam_autoclave",
		targetTemperatureCelsius: 132,
		minTemperatureCelsius: 132,
		maxTemperatureCelsius: 136,
		targetPressureBar: 2.0,
		minPressureBar: 1.9,
		maxPressureBar: 2.2,
		targetExposureMinutes: 20,
		minExposureMinutes: 20,
		recommendedIndicatorClass: 4,
		sanpinNormClauseRu: "СанПиН 3.3686-21 (Паровой метод базовый)",
		dentalApplicationRu: "Сложные кассеты и пористые материалы при отсутствии скоростного вакуумного цикла",
	},
];

export const STERILIZATION_REGIMES = SANPIN_STERILIZATION_REGIMES;

export function getSanpinSterilizationRegime(id: SanpinSterilizationRegimeId): SanpinSterilizationRegimeDefinition {
	return SANPIN_STERILIZATION_REGIMES.find((r) => r.id === id) || SANPIN_STERILIZATION_REGIMES[0]!;
}
