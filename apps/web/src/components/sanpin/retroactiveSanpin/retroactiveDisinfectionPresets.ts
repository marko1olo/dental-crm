import type {
	AutoclaveRegimeConfig,
	CabinetOption,
} from "./types.js";

export const STATUTORY_CLINIC_CABINETS: readonly CabinetOption[] = [
	{
		id: "cabinet_1",
		nameRu: "Кабинет терапевтической стоматологии №1",
		shortName: "Кабинет 1",
		volumeM3: 45.0,
		defaultDoctor: "Врач-стоматолог 1",
	},
	{
		id: "cabinet_2",
		nameRu: "Кабинет ортопедии и хирургии №2",
		shortName: "Кабинет 2",
		volumeM3: 50.0,
		defaultDoctor: "Врач-стоматолог 2",
	},
	{
		id: "cabinet_3",
		nameRu: "Кабинет детской стоматологии и ортодонтии №3",
		shortName: "Кабинет 3",
		volumeM3: 42.0,
		defaultDoctor: "Врач-стоматолог 3",
	},
	{
		id: "sterilization_room",
		nameRu: "Центральное стерилизационное отделение (ЦСО)",
		shortName: "Стерилизационная (ЦСО)",
		volumeM3: 35.0,
		defaultDoctor: "Медсестра ЦСО",
	},
];

export const AUTOCLAVE_REGIME_PRESETS: readonly AutoclaveRegimeConfig[] = [
	{
		id: "steam_134_5min",
		nameRu: "134°C / 5 мин / 2.15 бар — Скоростной B-класс (Стандарт)",
		temperatureCelsius: 134.0,
		pressureBar: 2.15,
		durationMinutes: 5,
		indicatorClass: "Класс 5 (Интегрирующий)",
		indicatorNameRu: "Интеграл-134 (Винар)",
	},
	{
		id: "steam_134_20min",
		nameRu: "134°C / 20 мин / 2.15 бар — Хирургический усиленный",
		temperatureCelsius: 134.0,
		pressureBar: 2.15,
		durationMinutes: 20,
		indicatorClass: "Класс 5 (Интегрирующий)",
		indicatorNameRu: "Медтест ИС-134",
	},
	{
		id: "steam_121_20min",
		nameRu: "121°C / 20 мин / 1.15 бар — Щадящий для термолабильных изделий",
		temperatureCelsius: 121.0,
		pressureBar: 1.15,
		durationMinutes: 20,
		indicatorClass: "Класс 5 (Интегрирующий)",
		indicatorNameRu: "Интеграл-121 (Винар)",
	},
	{
		id: "dry_heat_180_60min",
		nameRu: "180°C / 60 мин — Воздушный сухой жар (ГП-20)",
		temperatureCelsius: 180.0,
		pressureBar: 0.0,
		durationMinutes: 60,
		indicatorClass: "Класс 4 (Многопараметрический)",
		indicatorNameRu: "Стериконт-180",
	},
];
