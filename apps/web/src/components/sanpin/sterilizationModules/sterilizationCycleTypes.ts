/**
 * ============================================================================
 * SANPIN 3.3686-21 STERILIZATION CYCLE TYPES & STATUTORY REGIMES (SSOT)
 * Канонические типы и параметры цикла стерилизации:
 * - Режимы автоклавирования: 134°C / 2.1 bar, 121°C / 1.1 bar, сухожар 180°C, гласперлен 240°C
 * - Контроль ПСО: азопирамовая и фенолфталеиновая пробы (ф. 366/у)
 * - Тесты Бови-Дика / Helix для вакуумных автоклавов B-класса
 * - Химические термоиндикаторы 4-5 классов (КТ-1..КТ-5)
 * - Сроки сохранения стерильности крафт-пакетов
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

export type SterilizerCategory =
	| "autoclave_class_b"
	| "dry_heat_air"
	| "glassperlen_bead"
	| "autoclave_class_s";

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

export const STATUTORY_REGIMES_OPTIONS: readonly SterilizationRegimeOption[] = [
	{
		id: "steam_134_5min",
		category: "autoclave_class_b",
		nameRu: "Паровой 134°C • 5 мин",
		targetTemperature: 134,
		targetPressure: 2.1,
		exposureMinutes: 5,
		indicatorClass: "class_5_integrator",
		recommendedIndicatorName: "ИнтеТЕСТ-В-134/5 (Класс 5 Интегратор, Винар)",
		descriptionRu: "Турбинные наконечники, боры, базовые смотровые терапевтические наборы в крафт-пакетах",
		sharedRegimeId: "steam_134_5min",
	},
	{
		id: "steam_134_20min_prion",
		category: "autoclave_class_b",
		nameRu: "Паровой 134°C • 20 мин",
		targetTemperature: 134,
		targetPressure: 2.1,
		exposureMinutes: 20,
		indicatorClass: "class_5_integrator",
		recommendedIndicatorName: "ИнтеТЕСТ-В-134/20 / Медтест ИС-134 (Класс 5)",
		descriptionRu: "Хирургические и имплантологические кассеты, костные распаторы, шовные наборы",
	},
	{
		id: "steam_121_20min",
		category: "autoclave_class_b",
		nameRu: "Паровой 121°C • 20 мин",
		targetTemperature: 121,
		targetPressure: 1.1,
		exposureMinutes: 20,
		indicatorClass: "class_4_multivariable",
		recommendedIndicatorName: "СтериТЕСТ-В-121/20 (Класс 4 Многопараметрический)",
		descriptionRu: "Изделия из резины, силиконовые слепочные ложки, оптоволоконные световоды",
		sharedRegimeId: "steam_121_20min",
	},
	{
		id: "dry_heat_180_60min",
		category: "dry_heat_air",
		nameRu: "Воздушный 180°C • 60 мин",
		targetTemperature: 180,
		targetPressure: 0.0,
		exposureMinutes: 60,
		indicatorClass: "class_4_multivariable",
		recommendedIndicatorName: "Стериконт-180 / МедИС-180 (Класс 4 Воздушный)",
		descriptionRu: "Цельнометаллические боры, щипцы, элеваторы, шпатели без оптических элементов",
		sharedRegimeId: "dry_heat_180_60min",
	},
	{
		id: "glassperlen_240_20sec",
		category: "glassperlen_bead",
		nameRu: "Гласперленовый 240°C • 20 с",
		targetTemperature: 240,
		targetPressure: 0.0,
		exposureMinutes: 0.33,
		indicatorClass: "thermal_timer",
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
	{
		id: "none",
		nameRu: "Без теста проникновения пара (стандартный цикл)",
		descriptionRu: "Стандартная ежедневная загрузка инструментов",
	},
	{
		id: "bowie_dick",
		nameRu: "Тест Бови-Дика (Bowie-Dick Test)",
		descriptionRu: "Проверка эффективности вакуума и удаления воздуха из пористых упаковок",
	},
	{
		id: "helix_pcd",
		nameRu: "Helix-тест (Hollow Load PCD)",
		descriptionRu: "Проверка проникновения насыщенного пара в длинные полые каналы наконечников",
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
