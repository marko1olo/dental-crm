/**
 * ============================================================================
 * SANPIN 3.3686-21 AUTOCLAVE & STERILIZATION CYCLE PRESETS (LAYER 1)
 * Нормативные пресеты паровых автоклавов B-класса (134°C 2.1 бар, 132°C 2.0 бар,
 * 121°C 1.1 бар щадящий), сухожаровых шкафов (180°C / 160°C), тестов Бови-Дика
 * и 1-кликовые фабрики регистрации циклов (форма № 257/у).
 * ============================================================================
 */

import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders.js";
import type { AutoclaveCycleRecord, SterilizationCyclePreset } from "./types.js";

// ─────────────────────────────────────────────────────────────────────────────
// 1. БАЗОВЫЕ НОРМАТИВНЫЕ ПРЕСЕТЫ САНПИН 3.3686-21 (ТАБЛИЦЫ 3.12, 3.13)
// ─────────────────────────────────────────────────────────────────────────────

export const SANPIN_AUTOCLAVE_UNIVERSAL_134_PRESET: Omit<
	AutoclaveCycleRecord,
	"id" | "cycleNumber" | "timestamp"
> = {
	programName: "Универсальная 134°C / 2.1 бар / 5 мин (в упаковке)",
	autoclaveCode: "АК-01",
	autoclaveModel: "MELAG Vacuklav 23 B+ / Euronda E9 Next / W&H Lisa (Class B)",
	sterilizerType: "autoclave_class_b",
	temperatureC: 134,
	pressureBar: 2.1,
	exposureMinutes: 5,
	preVacuum: "3-кратное фракционированное предвакуумирование (EN 13060)",
	indicatorPointsStatus:
		"Индикаторы 5 класса (ИнтеТЕСТ-В-134/5 Винар / DGM Steriguard 5) во всех 5 точках камеры: Цвет эталона достигнут / Стерильно",
	indicatorBrand: "Винар",
	indicatorClass: 5,
	indicatorVerdict: "Цвет эталона достигнут / Стерильно",
	bowieDickResult: "passed",
	bowieDickNote:
		"Тест Бови-Дика пройден: равномерное изменение цвета тест-пакета по всему полю (норма вакуума и пара)",
	loadDescription:
		"Смотровые лотки терапевта, хирургические наборы, наконечники в крафт-пакетах",
	packageType: "Самоклеящиеся крафт-пакеты 100x200 мм (до 50 суток хранения)",
	kraftSize: "100x200",
	shelfLifeDays: 50,
	batchVerdict: "ГОДНА",
	operatorName: "Смирнова А.В. (медсестра ЦСО)",
	sanpinClause: "СанПиН 3.3686-21 п. 3630, МУ 287-113, Таблица 3.12",
	isQuickPreset: true,
};

export const SANPIN_AUTOCLAVE_STANDARD_132_20_PRESET: Omit<
	AutoclaveCycleRecord,
	"id" | "cycleNumber" | "timestamp"
> = {
	programName: "Стандартная 132°C / 2.0 бар / 20 мин (СанПиН 3.3686-21)",
	autoclaveCode: "АК-01",
	autoclaveModel: "MELAG Vacuklav 23 B+ / Euronda E9 Next / DGM (Class B)",
	sterilizerType: "autoclave_class_b",
	temperatureC: 132,
	pressureBar: 2.0,
	exposureMinutes: 20,
	preVacuum: "3-кратное фракционированное предвакуумирование (EN 13060)",
	indicatorPointsStatus:
		"Индикаторы 5 класса (ИнтеТЕСТ-В-132/20 Винар) во всех 5 точках камеры: Цвет эталона достигнут / Стерильно",
	indicatorBrand: "Винар",
	indicatorClass: 5,
	indicatorVerdict: "Цвет эталона достигнут / Стерильно",
	bowieDickResult: "passed",
	bowieDickNote: "Тест Бови-Дика пройден: норма вакуума и проникновения пара",
	loadDescription:
		"Базовые наборы инструментов, зеркала, пинцеты, зонды, хирургический инструментарий в крафт-пакетах",
	packageType: "Самоклеящиеся крафт-пакеты 100x200 мм (до 50 суток хранения)",
	kraftSize: "100x200",
	shelfLifeDays: 50,
	batchVerdict: "ГОДНА",
	operatorName: "Смирнова А.В. (медсестра ЦСО)",
	sanpinClause: "СанПиН 3.3686-21 Таблица 3.12 (Паровой метод, режим 1)",
	isQuickPreset: true,
};

export const SANPIN_AUTOCLAVE_PRION_134_PRESET: Omit<
	AutoclaveCycleRecord,
	"id" | "cycleNumber" | "timestamp"
> = {
	programName: "Быстрая / Prion 134°C / 20 мин",
	autoclaveCode: "АК-01",
	autoclaveModel: "Euronda E9 Next / MELAG Vacuklav 23 B+ / W&H Lisa (Class B)",
	sterilizerType: "autoclave_class_b",
	temperatureC: 134,
	pressureBar: 2.1,
	exposureMinutes: 20,
	preVacuum: "4-кратное фракционированное предвакуумирование (EN 13060)",
	indicatorPointsStatus:
		"Индикаторы 5 класса (DGM Steriguard 5 Integrator / ИнтеТЕСТ-В-134/20) во всех 5 точках камеры: Цвет эталона достигнут / Стерильно",
	indicatorBrand: "DGM Steriguard",
	indicatorClass: 5,
	indicatorVerdict: "Цвет эталона достигнут / Стерильно",
	bowieDickResult: "passed",
	bowieDickNote: "Утренний тест Бови-Дика пройден без отклонений",
	loadDescription:
		"Хирургический и имплантологический инструментарий повышенного риска, костные распаторы, трепаны в крафт-пакетах 150x250 мм",
	packageType: "Самоклеящиеся крафт-пакеты 150x250 мм (до 50 суток хранения)",
	kraftSize: "150x250",
	shelfLifeDays: 50,
	batchVerdict: "ГОДНА",
	operatorName: "Смирнова А.В. (медсестра ЦСО)",
	sanpinClause: "СанПиН 3.3686-21 п. 3628 (Антиприонный режим ВОЗ)",
	isQuickPreset: true,
};

export const SANPIN_AUTOCLAVE_DELICATE_121_PRESET: Omit<
	AutoclaveCycleRecord,
	"id" | "cycleNumber" | "timestamp"
> = {
	programName: "Деликатная 121°C / 1.1 бар / 20 мин (для наконечников и пластика)",
	autoclaveCode: "АК-02",
	autoclaveModel: "W&H Lisa 500 / MELAG Vacuklav 23 B+ (Class B)",
	sterilizerType: "autoclave_class_b",
	temperatureC: 121,
	pressureBar: 1.1,
	exposureMinutes: 20,
	preVacuum: "3-кратное фракционированное предвакуумирование",
	indicatorPointsStatus:
		"Индикаторы 4 класса (СтериТЕСТ-В-121 Винар / Медтест) во всех 5 точках камеры: Цвет эталона достигнут / Стерильно",
	indicatorBrand: "Винар",
	indicatorClass: 4,
	indicatorVerdict: "Цвет эталона достигнут / Стерильно",
	bowieDickResult: "not_performed",
	bowieDickNote: "Не требуется для деликатного цикла 121°C",
	loadDescription:
		"Стоматологические наконечники, полимерные слепочные ложки, силиконовые изделия, световоды в крафт-пакетах 75x150 мм",
	packageType: "Самоклеящиеся крафт-пакеты 75x150 мм (до 50 суток хранения)",
	kraftSize: "75x150",
	shelfLifeDays: 50,
	batchVerdict: "ГОДНА",
	operatorName: "Смирнова А.В. (медсестра ЦСО)",
	sanpinClause: "СанПиН 3.3686-21 Таблица 3.12 (Стерилизация термолабильных изделий)",
	isQuickPreset: true,
};

export const SANPIN_DRY_HEAT_180_60_PRESET: Omit<
	AutoclaveCycleRecord,
	"id" | "cycleNumber" | "timestamp"
> = {
	programName: "Сухожаровой шкаф 180°C / 60 минут",
	autoclaveCode: "СЖ-01",
	autoclaveModel: "ГП-10 / ГП-20 / ГП-40 СПУ (Сухожаровой шкаф)",
	sterilizerType: "dry_heat",
	temperatureC: 180,
	pressureBar: 0,
	exposureMinutes: 60,
	preVacuum: "Конвекционный прогрев сухожаровой камеры без вакуума",
	indicatorPointsStatus:
		"Индикаторы 4 класса (МедИС-180 Медтест) во всех 5 точках камеры: Цвет эталона достигнут / Стерильно",
	indicatorBrand: "Медтест",
	indicatorClass: 4,
	indicatorVerdict: "Цвет эталона достигнут / Стерильно",
	bowieDickResult: "not_performed",
	bowieDickNote: "Не применяется для воздушного метода",
	loadDescription:
		"Цельнометаллические инструменты, боры, щипцы, элеваторы без полимеров и оптики",
	packageType: "Крафт-пакеты самоклеящиеся 100x200 мм (до 50 суток хранения)",
	kraftSize: "100x200",
	shelfLifeDays: 50,
	batchVerdict: "ГОДНА",
	operatorName: "Смирнова А.В. (медсестра ЦСО)",
	sanpinClause: "СанПиН 3.3686-21 Таблица 3.13 (Воздушный метод)",
	isQuickPreset: true,
};

export const SANPIN_DRY_HEAT_160_150_PRESET: Omit<
	AutoclaveCycleRecord,
	"id" | "cycleNumber" | "timestamp"
> = {
	programName: "Сухожаровой шкаф 160°C / 150 минут",
	autoclaveCode: "СЖ-01",
	autoclaveModel: "ГП-10 / ГП-20 / ГП-40 СПУ (Сухожаровой шкаф)",
	sterilizerType: "dry_heat",
	temperatureC: 160,
	pressureBar: 0,
	exposureMinutes: 150,
	preVacuum: "Конвекционный прогрев сухожаровой камеры 160°C",
	indicatorPointsStatus:
		"Индикаторы 4 класса (МедИС-160 Медтест / Винар) во всех 5 точках камеры: Цвет эталона достигнут / Стерильно",
	indicatorBrand: "Медтест",
	indicatorClass: 4,
	indicatorVerdict: "Цвет эталона достигнут / Стерильно",
	bowieDickResult: "not_performed",
	bowieDickNote: "Не применяется для воздушного метода",
	loadDescription:
		"Металлические инструменты с ограниченной термостойкостью до 170°C в крафт-пакетах 75x150 мм",
	packageType: "Крафт-пакеты самоклеящиеся 75x150 мм (до 50 суток хранения)",
	kraftSize: "75x150",
	shelfLifeDays: 50,
	batchVerdict: "ГОДНА",
	operatorName: "Смирнова А.В. (медсестра ЦСО)",
	sanpinClause: "СанПиН 3.3686-21 Таблица 3.13 (Щадящий воздушный режим)",
	isQuickPreset: true,
};

export const SANPIN_AUTOCLAVE_CLASS_B_PRESET = SANPIN_AUTOCLAVE_UNIVERSAL_134_PRESET;

/**
 * Вакуумный тест и тест Бови-Дика (EN 13060 / ГОСТ Р ИСО 11140-4)
 */
export const SANPIN_AUTOCLAVE_VACUUM_TEST_PRESET: Omit<
	AutoclaveCycleRecord,
	"id" | "cycleNumber" | "timestamp"
> = {
	programName: "Тест Бови-Дика / Вакуум-тест (134°C / 3.5 мин)",
	autoclaveCode: "АК-01",
	autoclaveModel: "MELAG Vacuklav 23 B+ / Euronda E9 Next (Class B)",
	sterilizerType: "autoclave_class_b",
	temperatureC: 134,
	pressureBar: 2.1,
	exposureMinutes: 4,
	preVacuum: "Фракционированный глубокий вакуум -0.85 бар (тест на утечку камеры)",
	indicatorPointsStatus:
		"Тест-пакет Бови-Дика (Винар / Медтест) по центру пустой камеры: Равномерное прокрашивание эталона",
	indicatorBrand: "Винар",
	indicatorClass: 5,
	indicatorVerdict: "Цвет эталона достигнут / Стерильно",
	bowieDickResult: "passed",
	bowieDickNote:
		"Тест Бови-Дика успешно пройден: проникновение пара 100%, утечка вакуума < 1.3 мбар/мин (норма EN 13060)",
	loadDescription: "Контрольный тест-пакет Бови-Дика в пустой камере автоклава",
	packageType: "Тест-пакет Бови-Дика (однократного применения)",
	shelfLifeDays: 1,
	batchVerdict: "ГОДНА",
	operatorName: "Смирнова А.В. (медсестра ЦСО)",
	sanpinClause: "СанПиН 3.3686-21 п. 3630, ГОСТ Р ИСО 11140-4 (Ежедневный утренний контроль)",
	isQuickPreset: true,
};

/**
 * Реестр всех стандартных пресетов автоклавирования и сухожаровой стерилизации
 */
export const AUTOCLAVE_CYCLE_PRESETS: readonly SterilizationCyclePreset[] = [
	{ id: "universal_134", ...SANPIN_AUTOCLAVE_UNIVERSAL_134_PRESET },
	{ id: "standard_132_20", ...SANPIN_AUTOCLAVE_STANDARD_132_20_PRESET },
	{ id: "prion_134_20", ...SANPIN_AUTOCLAVE_PRION_134_PRESET },
	{ id: "delicate_121_20", ...SANPIN_AUTOCLAVE_DELICATE_121_PRESET },
	{ id: "dry_heat_180_60", ...SANPIN_DRY_HEAT_180_60_PRESET },
	{ id: "dry_heat_160_150", ...SANPIN_DRY_HEAT_160_150_PRESET },
	{ id: "bowie_dick_vacuum", ...SANPIN_AUTOCLAVE_VACUUM_TEST_PRESET },
];

// ─────────────────────────────────────────────────────────────────────────────
// 2. ФАБРИКИ БЫСТРЫХ ЗАПИСЕЙ АВТОКЛАВИРОВАНИЯ
// ─────────────────────────────────────────────────────────────────────────────

export function createQuickAutoclaveCycle(
	cycleNumber: number,
	operatorName = "Смирнова А.В. (медсестра ЦСО)",
): AutoclaveCycleRecord {
	return {
		id: `cycle-${Date.now()}-${cycleNumber}`,
		cycleNumber,
		...SANPIN_AUTOCLAVE_CLASS_B_PRESET,
		operatorName,
		timestamp: new Date().toISOString(),
	};
}

export function createQuickUniversalCycle(
	cycleNumber: number,
	operatorName = "Смирнова А.В. (медсестра ЦСО)",
): AutoclaveCycleRecord {
	return {
		id: `cycle-univ-${Date.now()}-${cycleNumber}`,
		cycleNumber,
		...SANPIN_AUTOCLAVE_UNIVERSAL_134_PRESET,
		operatorName,
		timestamp: new Date().toISOString(),
	};
}

export function createQuickStandard132Cycle(
	cycleNumber: number,
	operatorName = "Смирнова А.В. (медсестра ЦСО)",
): AutoclaveCycleRecord {
	return {
		id: `cycle-std132-${Date.now()}-${cycleNumber}`,
		cycleNumber,
		...SANPIN_AUTOCLAVE_STANDARD_132_20_PRESET,
		operatorName,
		timestamp: new Date().toISOString(),
	};
}

export function createQuickPrionCycle(
	cycleNumber: number,
	operatorName = "Смирнова А.В. (медсестра ЦСО)",
): AutoclaveCycleRecord {
	return {
		id: `cycle-prion-${Date.now()}-${cycleNumber}`,
		cycleNumber,
		...SANPIN_AUTOCLAVE_PRION_134_PRESET,
		operatorName,
		timestamp: new Date().toISOString(),
	};
}

export function createQuickDelicateCycle(
	cycleNumber: number,
	operatorName = "Смирнова А.В. (медсестра ЦСО)",
): AutoclaveCycleRecord {
	return {
		id: `cycle-delicate-${Date.now()}-${cycleNumber}`,
		cycleNumber,
		...SANPIN_AUTOCLAVE_DELICATE_121_PRESET,
		operatorName,
		timestamp: new Date().toISOString(),
	};
}

export function createQuickDryHeat180Cycle(
	cycleNumber: number,
	operatorName = "Смирнова А.В. (медсестра ЦСО)",
): AutoclaveCycleRecord {
	return {
		id: `cycle-dry180-${Date.now()}-${cycleNumber}`,
		cycleNumber,
		...SANPIN_DRY_HEAT_180_60_PRESET,
		operatorName,
		timestamp: new Date().toISOString(),
	};
}

export function createQuickDryHeat160Cycle(
	cycleNumber: number,
	operatorName = "Смирнова А.В. (медсестра ЦСО)",
): AutoclaveCycleRecord {
	return {
		id: `cycle-dry160-${Date.now()}-${cycleNumber}`,
		cycleNumber,
		...SANPIN_DRY_HEAT_160_150_PRESET,
		operatorName,
		timestamp: new Date().toISOString(),
	};
}

export function createQuickDailyShiftAutoclaveCycles(
	operatorName = "Смирнова А.В. (медсестра ЦСО)",
): readonly AutoclaveCycleRecord[] {
	const now = Date.now();
	return [
		{
			id: `cycle-shift-1-${now}`,
			cycleNumber: 1,
			...SANPIN_AUTOCLAVE_CLASS_B_PRESET,
			loadDescription: "Утренний тест Бови-Дика + смотровые лотки терапевта (4 шт)",
			operatorName,
			timestamp: new Date(now - 6 * 3600 * 1000).toISOString(),
		},
		{
			id: `cycle-shift-2-${now}`,
			cycleNumber: 2,
			...SANPIN_AUTOCLAVE_CLASS_B_PRESET,
			loadDescription:
				"Эндодонтические наборы, турбинные и угловые наконечники в пакетах (6 шт)",
			operatorName,
			timestamp: new Date(now - 3 * 3600 * 1000).toISOString(),
		},
		{
			id: `cycle-shift-3-${now}`,
			cycleNumber: 3,
			...SANPIN_AUTOCLAVE_CLASS_B_PRESET,
			loadDescription:
				"Хирургические экстракционные наборы, кюреты, шовный материал (4 шт)",
			operatorName,
			timestamp: new Date().toISOString(),
		},
	];
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. API ИНТЕГРАЦИЯ FASTIFY & POSTGRESQL 18 (ZERO MOCKS MANDATE 8C)
// ─────────────────────────────────────────────────────────────────────────────

export async function saveQuickAutoclaveCycleToApi(
	cycle: AutoclaveCycleRecord,
): Promise<{ ok: boolean; id?: string; error?: string }> {
	try {
		const payload = {
			deviceName: cycle.autoclaveModel,
			autoclaveId: cycle.autoclaveCode,
			cycleNumber: cycle.cycleNumber,
			temperatureCelsius: cycle.temperatureC,
			pressureBar: cycle.pressureBar,
			durationMin: cycle.exposureMinutes,
			itemsDescription: cycle.loadDescription,
			packagingType:
				cycle.kraftSize === "150x250" ? "kraft_heat_sealed" : "kraft_self_adhesive",
			indicatorType:
				cycle.indicatorClass === 5 ? "class5_integrating" : "class4_multivariable",
			passedIndicator: cycle.batchVerdict === "ГОДНА",
			operatorName: cycle.operatorName,
			notes: `${cycle.programName || ""} • ${cycle.indicatorPointsStatus || ""}`.trim(),
		};

		const res = await fetch("/api/registers/sterilization", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...denteAdminSecretRequestHeaders(),
			},
			body: JSON.stringify(payload),
		});

		if (!res.ok) {
			const errBody = await res.json().catch(() => null);
			return {
				ok: false,
				error: errBody?.message || `Ошибка сохранения цикла автоклава (${res.status})`,
			};
		}

		const data = await res.json();
		return { ok: true, id: data?.id };
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : "Сетевой сбой при сохранении цикла";
		return { ok: false, error: msg };
	}
}

export async function fetchSterilizationLogsFromApi(): Promise<any[]> {
	try {
		const res = await fetch("/api/registers/sterilization", {
			headers: {
				"Content-Type": "application/json",
				...denteAdminSecretRequestHeaders(),
			},
		});
		if (!res.ok) return [];
		const data = await res.json();
		return Array.isArray(data) ? data : [];
	} catch {
		return [];
	}
}
