export type SterilizationRegimeCode =
	| "steam_134_5min"
	| "steam_134_20min_prion"
	| "steam_121_20min"
	| "dry_heat_180_60min"
	| "dry_heat_160_150min";

export interface SterilizationRegimeMeta {
	readonly id: SterilizationRegimeCode;
	readonly nameRu: string;
	readonly methodType: "steam" | "dry_heat";
	readonly targetTemperatureCelsius: number;
	readonly targetPressureBar: number;
	readonly exposureMinutes: number;
	readonly minTemperatureCelsius: number;
	readonly maxTemperatureCelsius: number;
	readonly minPressureBar: number;
	readonly maxPressureBar: number;
	readonly minExposureMinutes: number;
	readonly recommendedForRu: string;
	readonly clauseRu: string;
}

export const STATUTORY_REGIMES: readonly SterilizationRegimeMeta[] = [
	{
		id: "steam_134_5min",
		nameRu: "Паровой 134°C / 5 мин (2.05–2.20 бар) — Скоростной B-класс",
		methodType: "steam",
		targetTemperatureCelsius: 134.0,
		targetPressureBar: 2.15,
		exposureMinutes: 5.0,
		minTemperatureCelsius: 134.0,
		maxTemperatureCelsius: 138.0,
		minPressureBar: 2.05,
		maxPressureBar: 2.30,
		minExposureMinutes: 5.0,
		recommendedForRu: "Стоматологический инструментарий, наконечники, крафт-пакеты",
		clauseRu: "СанПиН 3.3686-21 Таблица 3.13 / Режим I",
	},
	{
		id: "steam_134_20min_prion",
		nameRu: "Паровой 134°C / 20 мин (2.05–2.20 бар) — Хирургический / Прионный",
		methodType: "steam",
		targetTemperatureCelsius: 134.0,
		targetPressureBar: 2.15,
		exposureMinutes: 20.0,
		minTemperatureCelsius: 134.0,
		maxTemperatureCelsius: 138.0,
		minPressureBar: 2.05,
		maxPressureBar: 2.30,
		minExposureMinutes: 20.0,
		recommendedForRu: "Хирургические и имплантологические наборы, распаторы, биксы",
		clauseRu: "СанПиН 3.3686-21 п. 3624 / Режим I усиленный",
	},
	{
		id: "steam_121_20min",
		nameRu: "Паровой 121°C / 20 мин (1.10–1.25 бар) — Щадящий (термолабильные)",
		methodType: "steam",
		targetTemperatureCelsius: 121.0,
		targetPressureBar: 1.15,
		exposureMinutes: 20.0,
		minTemperatureCelsius: 120.0,
		maxTemperatureCelsius: 125.0,
		minPressureBar: 1.05,
		maxPressureBar: 1.30,
		minExposureMinutes: 20.0,
		recommendedForRu: "Изделия из полимеров, резины, силиконовые ложки, световоды",
		clauseRu: "СанПиН 3.3686-21 Таблица 3.13 / Режим II",
	},
	{
		id: "dry_heat_180_60min",
		nameRu: "Воздушный 180°C / 60 мин (0 бар) — Сухожаровой шкаф",
		methodType: "dry_heat",
		targetTemperatureCelsius: 180.0,
		targetPressureBar: 0.0,
		exposureMinutes: 60.0,
		minTemperatureCelsius: 180.0,
		maxTemperatureCelsius: 186.0,
		minPressureBar: 0.0,
		maxPressureBar: 0.0,
		minExposureMinutes: 60.0,
		recommendedForRu: "Цельнометаллические боры, штопферы, элеваторы, шпатели",
		clauseRu: "СанПиН 3.3686-21 п. 3626",
	},
	{
		id: "dry_heat_160_150min",
		nameRu: "Воздушный 160°C / 150 мин (0 бар) — Длительный щадящий сухожар",
		methodType: "dry_heat",
		targetTemperatureCelsius: 160.0,
		targetPressureBar: 0.0,
		exposureMinutes: 150.0,
		minTemperatureCelsius: 160.0,
		maxTemperatureCelsius: 165.0,
		minPressureBar: 0.0,
		maxPressureBar: 0.0,
		minExposureMinutes: 150.0,
		recommendedForRu: "Металлические инструменты, чувствительные к перегреву выше 170°C",
		clauseRu: "СанПиН 3.3686-21 п. 3626 (Режим II)",
	},
];
