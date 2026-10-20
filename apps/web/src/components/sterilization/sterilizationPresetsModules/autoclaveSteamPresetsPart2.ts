/**
 * apps/web/src/components/sterilization/sterilizationPresetsModules/autoclaveSteamPresetsPart2.ts
 *
 * Пресеты паровых автоклавов B-класса (деликатная 121°C и тест Бови-Дика).
 * Мандат 8b: строго <= 120 строк.
 */

import type { AutoclaveCycleRecord } from "./types.js";

type CycleBase = Omit<AutoclaveCycleRecord, "id" | "cycleNumber" | "timestamp">;

export const SANPIN_AUTOCLAVE_DELICATE_121_PRESET: CycleBase = {
	programName:
		"Деликатная 121°C / 1.1 бар / 20 мин (для наконечников и пластика)",
	autoclaveCode: "АК-02",
	autoclaveModel: "W&H Lisa 500 / MELAG Vacuklav 23 B+ (Class B)",
	sterilizerType: "autoclave_class_b",
	temperatureC: 121,
	pressureBar: 1.1,
	exposureMinutes: 20,
	preVacuum: "3-кратное фракционированное предвакуумирование",
	indicatorPointsStatus: "Индикаторы 4 класса (СтериТЕСТ-В-121): Стерильно",
	indicatorBrand: "Винар",
	indicatorClass: 4,
	indicatorVerdict: "Цвет эталона достигнут / Стерильно",
	bowieDickResult: "not_performed",
	bowieDickNote: "Не требуется для деликатного цикла 121°C",
	loadDescription:
		"Стоматологические наконечники, слепочные ложки, силиконовые изделия",
	packageType: "Самоклеящиеся крафт-пакеты 75x150 мм (до 50 суток хранения)",
	kraftSize: "75x150",
	shelfLifeDays: 50,
	batchVerdict: "ГОДНА",
	operatorName: "Смирнова А.В. (медсестра ЦСО)",
	sanpinClause: "Стерилизация термолабильных изделий",
	isQuickPreset: true,
};

export const SANPIN_AUTOCLAVE_VACUUM_TEST_PRESET: CycleBase = {
	programName: "Тест Бови-Дика / Вакуум-тест (134°C / 3.5 мин)",
	autoclaveCode: "АК-01",
	autoclaveModel: "MELAG Vacuklav 23 B+ / Euronda E9 Next (Class B)",
	sterilizerType: "autoclave_class_b",
	temperatureC: 134,
	pressureBar: 2.1,
	exposureMinutes: 4,
	preVacuum: "Фракционированный глубокий вакуум -0.85 бар (тест на утечку)",
	indicatorPointsStatus:
		"Тест-пакет Бови-Дика по центру: Равномерное прокрашивание",
	indicatorBrand: "Винар",
	indicatorClass: 5,
	indicatorVerdict: "Цвет эталона достигнут / Стерильно",
	bowieDickResult: "passed",
	bowieDickNote:
		"Тест Бови-Дика успешно пройден: пар 100%, утечка вакуума норма",
	loadDescription: "Контрольный тест-пакет Бови-Дика в пустой камере автоклава",
	packageType: "Тест-пакет Бови-Дика (однократного применения)",
	shelfLifeDays: 1,
	batchVerdict: "ГОДНА",
	operatorName: "Смирнова А.В. (медсестра ЦСО)",
	sanpinClause: "Ежедневный утренний контроль",
	isQuickPreset: true,
};
