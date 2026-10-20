/**
 * apps/web/src/components/sterilization/sterilizationPresetsModules/autoclaveDryHeatPresets.ts
 *
 * Нормативные пресеты сухожаровых шкафов.
 * Мандат 8b: строго <= 120 строк.
 */

import type { AutoclaveCycleRecord } from "./types.js";

type CycleBase = Omit<AutoclaveCycleRecord, "id" | "cycleNumber" | "timestamp">;

export const SANPIN_DRY_HEAT_180_60_PRESET: CycleBase = {
	programName: "Сухожаровой шкаф 180°C / 60 минут",
	autoclaveCode: "СЖ-01",
	autoclaveModel: "ГП-10 / ГП-20 СПУ (Сухожаровой шкаф)",
	sterilizerType: "dry_heat",
	temperatureC: 180,
	pressureBar: 0,
	exposureMinutes: 60,
	preVacuum: "Конвекционный прогрев без вакуума",
	indicatorPointsStatus: "Индикаторы 4 класса (МедИС-180): Стерильно",
	indicatorBrand: "Медтест",
	indicatorClass: 4,
	indicatorVerdict: "Цвет эталона достигнут / Стерильно",
	bowieDickResult: "not_performed",
	bowieDickNote: "Не применяется для воздушного метода",
	loadDescription: "Цельнометаллические инструменты, боры, щипцы, элеваторы",
	packageType: "Крафт-пакеты самоклеящиеся 100x200 мм (до 50 суток хранения)",
	kraftSize: "100x200",
	shelfLifeDays: 50,
	batchVerdict: "ГОДНА",
	operatorName: "Смирнова А.В. (медсестра ЦСО)",
	sanpinClause: "Воздушный метод",
	isQuickPreset: true,
};

export const SANPIN_DRY_HEAT_160_150_PRESET: CycleBase = {
	programName: "Сухожаровой шкаф 160°C / 150 минут",
	autoclaveCode: "СЖ-01",
	autoclaveModel: "ГП-10 / ГП-20 СПУ (Сухожаровой шкаф)",
	sterilizerType: "dry_heat",
	temperatureC: 160,
	pressureBar: 0,
	exposureMinutes: 150,
	preVacuum: "Конвекционный прогрев сухожаровой камеры 160°C",
	indicatorPointsStatus: "Индикаторы 4 класса (МедИС-160): Стерильно",
	indicatorBrand: "Медтест",
	indicatorClass: 4,
	indicatorVerdict: "Цвет эталона достигнут / Стерильно",
	bowieDickResult: "not_performed",
	bowieDickNote: "Не применяется для воздушного метода",
	loadDescription: "Металлические инструменты в крафт-пакетах 75x150 мм",
	packageType: "Крафт-пакеты самоклеящиеся 75x150 мм (до 50 суток хранения)",
	kraftSize: "75x150",
	shelfLifeDays: 50,
	batchVerdict: "ГОДНА",
	operatorName: "Смирнова А.В. (медсестра ЦСО)",
	sanpinClause: "Щадящий воздушный режим",
	isQuickPreset: true,
};
