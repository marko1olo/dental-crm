/**
 * apps/web/src/components/sterilization/sterilizationPresetsModules/autoclaveSteamPresetsPart1.ts
 *
 * Пресеты паровых автоклавов B-класса (134°C, 132°C, Prion).
 * Мандат 8b: строго <= 120 строк.
 */

import type { AutoclaveCycleRecord } from "./types.js";

type CycleBase = Omit<AutoclaveCycleRecord, "id" | "cycleNumber" | "timestamp">;

export const SANPIN_AUTOCLAVE_UNIVERSAL_134_PRESET: CycleBase = {
	programName: "Универсальная 134°C / 2.1 бар / 5 мин (в упаковке)",
	autoclaveCode: "АК-01",
	autoclaveModel: "MELAG Vacuklav 23 B+ / Euronda E9 Next / W&H Lisa (Class B)",
	sterilizerType: "autoclave_class_b",
	temperatureC: 134,
	pressureBar: 2.1,
	exposureMinutes: 5,
	preVacuum: "3-кратное фракционированное предвакуумирование (EN 13060)",
	indicatorPointsStatus:
		"Индикаторы 5 класса (ИнтеТЕСТ-В-134/5 Винар) во всех 5 точках: Стерильно",
	indicatorBrand: "Винар",
	indicatorClass: 5,
	indicatorVerdict: "Цвет эталона достигнут / Стерильно",
	bowieDickResult: "passed",
	bowieDickNote: "Тест Бови-Дика пройден: равномерное изменение цвета (норма)",
	loadDescription:
		"Смотровые лотки терапевта, хирургические наборы, наконечники в крафт-пакетах",
	packageType: "Самоклеящиеся крафт-пакеты 100x200 мм (до 50 суток хранения)",
	kraftSize: "100x200",
	shelfLifeDays: 50,
	batchVerdict: "ГОДНА",
	operatorName: "Смирнова А.В. (медсестра ЦСО)",
	sanpinClause: "Паровой метод стерилизации, Таблица 3.12",
	isQuickPreset: true,
};

export const SANPIN_AUTOCLAVE_STANDARD_132_20_PRESET: CycleBase = {
	programName: "Стандартная 132°C / 2.0 бар / 20 мин",
	autoclaveCode: "АК-01",
	autoclaveModel: "MELAG Vacuklav 23 B+ / Euronda E9 Next / DGM (Class B)",
	sterilizerType: "autoclave_class_b",
	temperatureC: 132,
	pressureBar: 2.0,
	exposureMinutes: 20,
	preVacuum: "3-кратное фракционированное предвакуумирование (EN 13060)",
	indicatorPointsStatus:
		"Индикаторы 5 класса (ИнтеТЕСТ-В-132/20 Винар): Стерильно",
	indicatorBrand: "Винар",
	indicatorClass: 5,
	indicatorVerdict: "Цвет эталона достигнут / Стерильно",
	bowieDickResult: "passed",
	bowieDickNote: "Тест Бови-Дика пройден: норма вакуума и пара",
	loadDescription:
		"Базовые наборы инструментов, зеркала, пинцеты, зонды в крафт-пакетах",
	packageType: "Самоклеящиеся крафт-пакеты 100x200 мм (до 50 суток хранения)",
	kraftSize: "100x200",
	shelfLifeDays: 50,
	batchVerdict: "ГОДНА",
	operatorName: "Смирнова А.В. (медсестра ЦСО)",
	sanpinClause: "Паровой метод, режим 1",
	isQuickPreset: true,
};

export const SANPIN_AUTOCLAVE_PRION_134_PRESET: CycleBase = {
	programName: "Быстрая / Prion 134°C / 20 мин",
	autoclaveCode: "АК-01",
	autoclaveModel: "Euronda E9 Next / MELAG Vacuklav 23 B+ (Class B)",
	sterilizerType: "autoclave_class_b",
	temperatureC: 134,
	pressureBar: 2.1,
	exposureMinutes: 20,
	preVacuum: "4-кратное фракционированное предвакуумирование (EN 13060)",
	indicatorPointsStatus:
		"Индикаторы 5 класса (DGM Steriguard 5 Integrator): Стерильно",
	indicatorBrand: "DGM Steriguard",
	indicatorClass: 5,
	indicatorVerdict: "Цвет эталона достигнут / Стерильно",
	bowieDickResult: "passed",
	bowieDickNote: "Утренний тест Бови-Дика пройден без отклонений",
	loadDescription:
		"Хирургический инструмент повышенного риска в крафт-пакетах 150x250 мм",
	packageType: "Самоклеящиеся крафт-пакеты 150x250 мм (до 50 суток хранения)",
	kraftSize: "150x250",
	shelfLifeDays: 50,
	batchVerdict: "ГОДНА",
	operatorName: "Смирнова А.В. (медсестра ЦСО)",
	sanpinClause: "Антиприонный режим ВОЗ",
	isQuickPreset: true,
};
