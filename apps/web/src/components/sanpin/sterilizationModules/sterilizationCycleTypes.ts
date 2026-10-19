/**
 * ============================================================================
 * SANPIN 3.3686-21 STERILIZATION CYCLE TYPES & STATUTORY REGIMES (SSOT)
 * Канонические типы и параметры цикла стерилизации (3 клинических пресета,
 * контроль ПСО, индикаторы 5 класса, сроки сохранения стерильности).
 * ============================================================================
 */

import type { ClinicAutoclaveDevice } from "../autoclave/autoclaveDeviceTypes";
export type { ClinicAutoclaveDevice };
import {
	SANPIN_STERILIZATION_REGIMES,
	SANPIN_PACKAGING_MATERIALS,
	type SanpinSterilizationRegimeId,
	type SanpinPackagingMaterialId,
} from "@dental/shared";

export type SterilizationCycleModalMode = "create" | "view";
export type SterilizerCategory = "autoclave_class_b" | "dry_heat_air" | "glassperlen_bead" | "autoclave_class_s";

export interface SterilizationRegimeOption {
	readonly id: string;
	readonly category: SterilizerCategory;
	readonly nameRu: string;
	readonly targetTemperature: number; // °C
	readonly targetPressure: number; // атм / бар
	readonly exposureMinutes: number; // мин
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
		indicatorClass: "class_5_integrator", recommendedIndicator: "ИнтеТЕСТ-В-134/5 (Класс 5 Интегратор)",
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
		indicatorClass: "class_5_integrator", recommendedIndicator: "ИнтеТЕСТ-В-134/3 (Класс 5 Экспресс)",
		itemsDescription: "Неупакованный цельнометаллический инструмент для немедленного использования у кресла",
	},
];

export const STATUTORY_REGIMES_OPTIONS: readonly SterilizationRegimeOption[] = [
	{
		id: "steam_134_5min", category: "autoclave_class_b",
		nameRu: "Стандарт 134°C • 5 мин (Упакованные инструменты)",
		targetTemperature: 134, targetPressure: 2.1, exposureMinutes: 5, indicatorClass: "class_5_integrator",
		recommendedIndicatorName: "ИнтеТЕСТ-В-134/5 (Класс 5 Интегратор, Винар)",
		descriptionRu: "Турбинные наконечники, боры, базовые смотровые терапевтические наборы в крафт-пакетах",
		sharedRegimeId: "steam_134_5min",
	},
	{
		id: "steam_121_20min", category: "autoclave_class_b",
		nameRu: "Деликатный 121°C • 20 мин (Резина, оптика, наконечники)",
		targetTemperature: 121, targetPressure: 1.1, exposureMinutes: 20, indicatorClass: "class_5_integrator",
		recommendedIndicatorName: "СтериТЕСТ-В-121/20 (Класс 5 / Класс 4)",
		descriptionRu: "Изделия из резины, силиконовые слепочные ложки, оптоволоконные световоды, наконечники",
		sharedRegimeId: "steam_121_20min",
	},
	{
		id: "steam_134_3min_quick", category: "autoclave_class_b",
		nameRu: "Быстрый 134°C • 3 мин (Неупакованный инструмент)",
		targetTemperature: 134, targetPressure: 2.1, exposureMinutes: 3, indicatorClass: "class_5_integrator",
		recommendedIndicatorName: "ИнтеТЕСТ-В-134/3 (Класс 5 Экспресс)",
		descriptionRu: "Неупакованный цельнометаллический инструмент для срочного использования у кресла",
	},
	{
		id: "steam_134_20min_prion", category: "autoclave_class_b",
		nameRu: "Паровой 134°C • 20 мин (Хирургия / Прионы)",
		targetTemperature: 134, targetPressure: 2.1, exposureMinutes: 20, indicatorClass: "class_5_integrator",
		recommendedIndicatorName: "ИнтеТЕСТ-В-134/20 / Медтест ИС-134 (Класс 5)",
		descriptionRu: "Хирургические и имплантологические кассеты, костные распаторы, шовные наборы",
	},
	{
		id: "dry_heat_180_60min", category: "dry_heat_air",
		nameRu: "Воздушный 180°C • 60 мин (Сухожар)",
		targetTemperature: 180, targetPressure: 0.0, exposureMinutes: 60, indicatorClass: "class_4_multivariable",
		recommendedIndicatorName: "Стериконт-180 / МедИС-180 (Класс 4 Воздушный)",
		descriptionRu: "Цельнометаллические боры, щипцы, элеваторы, шпатели без оптических элементов",
		sharedRegimeId: "dry_heat_180_60min",
	},
	{
		id: "glassperlen_240_20sec", category: "glassperlen_bead",
		nameRu: "Гласперленовый 240°C • 20 с",
		targetTemperature: 240, targetPressure: 0.0, exposureMinutes: 0.33, indicatorClass: "thermal_timer",
		recommendedIndicatorName: "Встроенный поверенный термометр гласперлена (ГОСТ Р 50444)",
		descriptionRu: "Быстрая стерилизация рабочей части мелких боров, эндодонтических файлов у кресла",
	},
];

export interface PackagingShelfLifePreset {
	readonly id: string;
	readonly nameRu: string;
	readonly shelfLifeDays: number;
	readonly sealingMethodRu: string;
	readonly clauseRu: string;
	readonly sharedMaterialId?: SanpinPackagingMaterialId;
}

export const STATUTORY_PACKAGING_PRESETS: readonly PackagingShelfLifePreset[] = [
	{
		id: "kraft_self_adhesive",
		nameRu: "Бумажный крафт-пакет самоклеящийся (со встроенной клеевой лентой)",
		shelfLifeDays: 50,
		sealingMethodRu: "Клеевой клапан с защитным лайнером",
		clauseRu: "СанПиН 3.3686-21 Таблица 3.14 (20–50 суток)",
		sharedMaterialId: "kraft_self_seal",
	},
	{
		id: "laminated_heat_seal_single",
		nameRu: "Комбинированный пакет бумага + прозрачная пленка (термосварка шов >= 8 мм)",
		shelfLifeDays: 180,
		sealingMethodRu: "Термосварочный аппарат (импульсный запайщик)",
		clauseRu: "СанПиН 3.3686-21 Таблица 3.14 (до 180 суток / 6 мес.)",
		sharedMaterialId: "heat_seal_pouch",
	},
	{
		id: "laminated_heat_seal_double",
		nameRu: "Двойная упаковка термосварочная (комбинированный пакет в два слоя)",
		shelfLifeDays: 365,
		sealingMethodRu: "Двойной термосварочный шов",
		clauseRu: "СанПиН 3.3686-21 п. 3632 (до 1 года)",
	},
	{
		id: "bix_filter_kspf",
		nameRu: "Стерилизационная коробка (Бикс КСПФ с антибактериальным фильтром)",
		shelfLifeDays: 20,
		sealingMethodRu: "Механические замки бикса + хлопчатобумажные фильтры",
		clauseRu: "СанПиН 3.3686-21 п. 3631 (20 суток до вскрытия, 24 ч после вскрытия)",
	},
	{
		id: "unpacked_tray",
		nameRu: "Без упаковки (на открытом стерильном лотке)",
		shelfLifeDays: 0,
		sealingMethodRu: "Без упаковки",
		clauseRu: "СанПиН 3.3686-21 п. 3634 (непосредственно перед процедурой, на столе до 6 ч)",
		sharedMaterialId: "unpacked_immediate",
	},
];

export interface ChamberPointState {
	readonly pointIndex: 1 | 2 | 3 | 4 | 5;
	readonly code: string;
	readonly labelRu: string;
	passed: boolean;
}

export const INITIAL_5_POINTS: ChamberPointState[] = [
	{ pointIndex: 1, code: "КТ-1", labelRu: "Верхний передний правый угол (у дверцы)", passed: true },
	{ pointIndex: 2, code: "КТ-2", labelRu: "Нижний задний левый угол (критическая зона)", passed: true },
	{ pointIndex: 3, code: "КТ-3", labelRu: "Геометрический центр камеры (в толще загрузки)", passed: true },
	{ pointIndex: 4, code: "КТ-4", labelRu: "Зона выхода конденсата / дренаж", passed: true },
	{ pointIndex: 5, code: "КТ-5", labelRu: "Верхняя задняя зона (у термодатчика)", passed: true },
];

export type SteamPenetrationTestType = "none" | "bowie_dick" | "helix_pcd";

export interface SteamPenetrationTestOption {
	readonly id: SteamPenetrationTestType;
	readonly nameRu: string;
	readonly descriptionRu: string;
}

export const STEAM_PENETRATION_TEST_OPTIONS: readonly SteamPenetrationTestOption[] = [
	{ id: "none", nameRu: "Без теста проникновения пара (стандартный цикл)", descriptionRu: "Стандартная ежедневная загрузка инструментов" },
	{ id: "bowie_dick", nameRu: "Тест Бови-Дика (Bowie-Dick Test)", descriptionRu: "Проверка эффективности вакуума и удаления воздуха из пористых упаковок" },
	{ id: "helix_pcd", nameRu: "Helix-тест (Hollow Load PCD)", descriptionRu: "Проверка проникновения насыщенного пара в длинные полые каналы наконечников" },
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
