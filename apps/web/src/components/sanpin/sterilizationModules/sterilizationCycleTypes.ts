import type { ClinicAutoclaveDevice } from "../autoclave/autoclaveDeviceTypes";
export type { ClinicAutoclaveDevice };
import type { SanpinSterilizationRegimeId } from "@dental/shared";

export * from "./sterilizationPackagingTypes";

export type SterilizationCycleModalMode = "create" | "view";
export type SterilizerCategory = "autoclave_class_b" | "dry_heat_air" | "glassperlen_bead" | "autoclave_class_s";

export interface SterilizationRegimeOption {
	readonly id: string;
	readonly category: SterilizerCategory;
	readonly nameRu: string;
	readonly targetTemperature: number;
	readonly targetPressure: number;
	readonly exposureMinutes: number;
	readonly indicatorClass: "class_4_multivariable" | "class_5_integrator" | "thermal_timer";
	readonly recommendedIndicatorName: string;
	readonly descriptionRu: string;
	readonly sharedRegimeId?: SanpinSterilizationRegimeId;
}

export interface ClinicalAutoclavePreset {
	readonly id: string;
	readonly regimeOptionId: string;
	readonly title: string;
	readonly subtitle: string;
	readonly temperatureC: number;
	readonly pressureBar: number;
	readonly durationMin: number;
	readonly packagingId: string;
	readonly indicatorClass: "class_5_integrator" | "class_4_multivariable";
	readonly recommendedIndicator: string;
	readonly itemsDescription: string;
}

export const CLINICAL_AUTOCLAVE_1CLICK_PRESETS: readonly ClinicalAutoclavePreset[] = [
	{
		id: "standard_134_5", regimeOptionId: "steam_134_5min",
		title: "Стандарт 134°C / 2.1 бар — 5 мин", subtitle: "Упакованные инструменты",
		temperatureC: 134.0, pressureBar: 2.1, durationMin: 5, packagingId: "kraft_self_adhesive",
		indicatorClass: "class_5_integrator", recommendedIndicator: "ИнтеТЕСТ-В-134/5 (Класс 5)",
		itemsDescription: "Упакованные инструменты в крафт-пакетах (смотровые лотки, терапевтические наборы)",
	},
	{
		id: "delicate_121_20", regimeOptionId: "steam_121_20min",
		title: "Деликатный 121°C / 1.1 бар — 20 мин", subtitle: "Резина, оптика, наконечники",
		temperatureC: 121.0, pressureBar: 1.1, durationMin: 20, packagingId: "kraft_self_adhesive",
		indicatorClass: "class_5_integrator", recommendedIndicator: "СтериТЕСТ-В-121/20 (Класс 5)",
		itemsDescription: "Турбинные и угловые наконечники, оптоволоконные световоды, резина, слепочные ложки",
	},
	{
		id: "quick_134_3", regimeOptionId: "steam_134_3min_quick",
		title: "Быстрый 134°C / 2.1 бар — 3 мин", subtitle: "Неупакованный инструмент",
		temperatureC: 134.0, pressureBar: 2.1, durationMin: 3, packagingId: "unpacked_tray",
		indicatorClass: "class_5_integrator", recommendedIndicator: "ИнтеТЕСТ-В-134/3 (Класс 5)",
		itemsDescription: "Неупакованный цельнометаллический инструмент для немедленного использования у кресла",
	},
];

export const STATUTORY_REGIMES_OPTIONS: readonly SterilizationRegimeOption[] = [
	{
		id: "steam_134_5min", category: "autoclave_class_b",
		nameRu: "Стандарт 134°C • 5 мин (Упакованные инструменты)",
		targetTemperature: 134, targetPressure: 2.1, exposureMinutes: 5, indicatorClass: "class_5_integrator",
		recommendedIndicatorName: "ИнтеТЕСТ-В-134/5 (Класс 5)",
		descriptionRu: "Турбинные наконечники, боры, базовые смотровые терапевтические наборы",
		sharedRegimeId: "steam_134_5min",
	},
	{
		id: "steam_121_20min", category: "autoclave_class_b",
		nameRu: "Деликатный 121°C • 20 мин (Резина, оптика, наконечники)",
		targetTemperature: 121, targetPressure: 1.1, exposureMinutes: 20, indicatorClass: "class_5_integrator",
		recommendedIndicatorName: "СтериТЕСТ-В-121/20 (Класс 5)",
		descriptionRu: "Изделия из резины, силиконовые слепочные ложки, оптоволоконные световоды",
		sharedRegimeId: "steam_121_20min",
	},
	{
		id: "steam_134_3min_quick", category: "autoclave_class_b",
		nameRu: "Быстрый 134°C • 3 мин (Неупакованный инструмент)",
		targetTemperature: 134, targetPressure: 2.1, exposureMinutes: 3, indicatorClass: "class_5_integrator",
		recommendedIndicatorName: "ИнтеТЕСТ-В-134/3 (Класс 5)",
		descriptionRu: "Неупакованный инструмент для срочного использования у кресла",
	},
	{
		id: "steam_134_20min_prion", category: "autoclave_class_b",
		nameRu: "Паровой 134°C • 20 мин (Хирургия / Прионы)",
		targetTemperature: 134, targetPressure: 2.1, exposureMinutes: 20, indicatorClass: "class_5_integrator",
		recommendedIndicatorName: "ИнтеТЕСТ-В-134/20 (Класс 5)",
		descriptionRu: "Хирургические и имплантологические кассеты, костные распаторы, шовные наборы",
	},
	{
		id: "dry_heat_180_60min", category: "dry_heat_air",
		nameRu: "Воздушный 180°C • 60 мин (Сухожар)",
		targetTemperature: 180, targetPressure: 0.0, exposureMinutes: 60, indicatorClass: "class_4_multivariable",
		recommendedIndicatorName: "Стериконт-180 (Класс 4)",
		descriptionRu: "Цельнометаллические боры, щипцы, элеваторы, шпатели без оптики",
		sharedRegimeId: "dry_heat_180_60min",
	},
	{
		id: "glassperlen_240_20sec", category: "glassperlen_bead",
		nameRu: "Гласперленовый 240°C • 20 с",
		targetTemperature: 240, targetPressure: 0.0, exposureMinutes: 0.33, indicatorClass: "thermal_timer",
		recommendedIndicatorName: "Встроенный термометр гласперлена",
		descriptionRu: "Быстрая стерилизация рабочей части мелких боров, эндодонтических файлов",
	},
];

export interface SterilizationCycleModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onCycleCreated?: () => void;
	readonly clinicDevices?: readonly ClinicAutoclaveDevice[];
	readonly defaultDeviceName?: string;
	readonly defaultOperatorName?: string;
	readonly initialDeviceType?: SterilizerCategory | undefined;
}
