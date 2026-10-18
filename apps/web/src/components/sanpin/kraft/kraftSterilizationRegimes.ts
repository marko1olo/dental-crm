/**
 * apps/web/src/components/sanpin/kraft/kraftSterilizationRegimes.ts
 *
 * Нормативные режимы стерилизации по СанПиН 3.3686-21.
 * Мандат 8b: строго <= 120 строк.
 */

export type SterilizationRegimeId =
	| "steam_134_5min"
	| "steam_132_20min"
	| "steam_121_20min"
	| "dry_heat_180_60min";

export interface SterilizationRegimeDefinition {
	readonly id: SterilizationRegimeId;
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
	readonly recommendedIndicatorClasses: readonly ("class_4" | "class_5" | "class_6")[];
	readonly sanpinNormClauseRu: string;
	readonly descriptionRu: string;
}

export const STERILIZATION_REGIMES: readonly SterilizationRegimeDefinition[] = [
	{
		id: "steam_134_5min",
		nameRu: "Паровой автоклав: 134°C / 5 минут / 2.0–2.1 бар (Основной стоматологический)",
		shortLabelRu: "Автоклав 134°C (5 мин / 2.0 бар)",
		methodType: "steam_autoclave",
		targetTemperatureCelsius: 134,
		minTemperatureCelsius: 134,
		maxTemperatureCelsius: 138,
		targetPressureBar: 2.05,
		minPressureBar: 2.0,
		maxPressureBar: 2.3,
		targetExposureMinutes: 5,
		minExposureMinutes: 5,
		recommendedIndicatorClasses: ["class_4", "class_5", "class_6"],
		sanpinNormClauseRu: "СанПиН 3.3686-21 Таблица 3.12 (Паровой метод, режим 1)",
		descriptionRu: "Стандартный режим паровой стерилизации под избыточным давлением.",
	},
	{
		id: "steam_132_20min",
		nameRu: "Паровой автоклав: 132°C / 20 минут / 2.0 бар (Основной режим СанПиН)",
		shortLabelRu: "Автоклав 132°C (20 мин / 2.0 бар)",
		methodType: "steam_autoclave",
		targetTemperatureCelsius: 132,
		minTemperatureCelsius: 132,
		maxTemperatureCelsius: 135,
		targetPressureBar: 2.0,
		minPressureBar: 1.9,
		maxPressureBar: 2.2,
		targetExposureMinutes: 20,
		minExposureMinutes: 20,
		recommendedIndicatorClasses: ["class_4", "class_5", "class_6"],
		sanpinNormClauseRu: "СанПиН 3.3686-21 Таблица 3.12 (Паровой метод, режим 1)",
		descriptionRu: "Базовый нормативный режим паровой стерилизации по СанПиН 3.3686-21.",
	},
	{
		id: "steam_121_20min",
		nameRu: "Паровой автоклав: 121°C / 20 минут / 1.1–1.2 бар (Щадящий режим)",
		shortLabelRu: "Автоклав 121°C (20 мин / 1.1 бар)",
		methodType: "steam_autoclave",
		targetTemperatureCelsius: 121,
		minTemperatureCelsius: 120,
		maxTemperatureCelsius: 125,
		targetPressureBar: 1.15,
		minPressureBar: 1.05,
		maxPressureBar: 1.3,
		targetExposureMinutes: 20,
		minExposureMinutes: 20,
		recommendedIndicatorClasses: ["class_4", "class_5"],
		sanpinNormClauseRu: "СанПиН 3.3686-21 Таблица 3.12 (Паровой метод, режим 2)",
		descriptionRu: "Щадящий режим для резиновых изделий, силикона и оптики.",
	},
	{
		id: "dry_heat_180_60min",
		nameRu: "Воздушный стерилизатор (Сухожар): 180°C / 60 минут",
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
		recommendedIndicatorClasses: ["class_4", "class_5", "class_6"],
		sanpinNormClauseRu: "СанПиН 3.3686-21 Таблица 3.13 (Воздушный метод)",
		descriptionRu: "Стерилизация сухим горячим воздухом без давления.",
	},
];
