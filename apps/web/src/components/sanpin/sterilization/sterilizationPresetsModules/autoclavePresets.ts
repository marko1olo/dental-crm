/**
 * apps/web/src/components/sterilization/sterilizationPresetsModules/autoclavePresets.ts
 *
 * Нормативные клинические пресеты циклов автоклавирования и сухожаров.
 * Без бюрократического оверинжиниринга: 1-клик запуск, честные коннекторы к API и БД.
 */

import { denteAdminSecretRequestHeaders } from "../../../../lib/denteRequestHeaders.js";
import type { AutoclaveCycleRecord, SterilizationCyclePreset } from "./types.js";

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

export const SANPIN_AUTOCLAVE_DELICATE_121_PRESET: CycleBase = {
	programName: "Деликатная 121°C / 1.1 бар / 20 мин (термолабильные изделия)",
	autoclaveCode: "АК-01",
	autoclaveModel: "MELAG Vacuklav 23 B+ / W&H Lisa (Class B)",
	sterilizerType: "autoclave_class_b",
	temperatureC: 121,
	pressureBar: 1.1,
	exposureMinutes: 20,
	preVacuum: "Фракционированный вакуум для полых изделий (EN 13060)",
	indicatorPointsStatus:
		"Индикаторы 4 класса (СтериТЕСТ-В-121 Винар): Стерильно",
	indicatorBrand: "Винар",
	indicatorClass: 4,
	indicatorVerdict: "Цвет эталона достигнут / Стерильно",
	bowieDickResult: "passed",
	bowieDickNote: "Тест Бови-Дика пройден перед сменой",
	loadDescription:
		"Изделия из резины, силикона, стекла, пластика, оптика эндоскопов",
	packageType:
		"Комбинированные рулоны бумага-пленка термосвариваемые (до 180 суток)",
	kraftSize: "75x150",
	shelfLifeDays: 50,
	batchVerdict: "ГОДНА",
	operatorName: "Смирнова А.В. (медсестра ЦСО)",
	sanpinClause: "Паровой метод, режим 2 (щадящий)",
	isQuickPreset: true,
};

export const SANPIN_AUTOCLAVE_VACUUM_TEST_PRESET: CycleBase = {
	programName: "Вакуум-тест (проверка герметичности камеры на холодную)",
	autoclaveCode: "АК-01",
	autoclaveModel: "MELAG Vacuklav 23 B+ (Class B)",
	sterilizerType: "autoclave_class_b",
	temperatureC: 22,
	pressureBar: 0.1,
	exposureMinutes: 15,
	preVacuum: "Глубокий вакуум до -0.85 бар с фиксацией скорости натекания",
	indicatorPointsStatus: "Не применимо (тест физической герметичности)",
	indicatorBrand: "Винар",
	indicatorClass: 4,
	indicatorVerdict: "Утечка < 1.3 мбар/мин — камера герметична (Норма)",
	bowieDickResult: "passed",
	bowieDickNote: "Предварительный ежедневный тест перед началом работы смены",
	loadDescription: "Камера пустая (регламентный тест проверки герметичности)",
	packageType: "Без упаковки",
	kraftSize: "75x150",
	shelfLifeDays: 0,
	batchVerdict: "ГОДНА",
	operatorName: "Смирнова А.В. (медсестра ЦСО)",
	sanpinClause: "Контроль исправности оборудования, п. 3615",
	isQuickPreset: false,
};

export const SANPIN_DRY_HEAT_180_60_PRESET: CycleBase = {
	programName: "Воздушный 180°C / 60 мин (сухожар ГП-20)",
	autoclaveCode: "СУХ-01",
	autoclaveModel: "ГП-20 СПУ / ГП-40 СПУ (Воздушный стерилизатор)",
	sterilizerType: "dry_heat",
	temperatureC: 180,
	pressureBar: 0,
	exposureMinutes: 60,
	preVacuum: "Не предусмотрено (сухожаровой шкаф с принудительной конвекцией)",
	indicatorPointsStatus:
		"Химические индикаторы 4-5 класса (Медтест В-180/60): Стерильно",
	indicatorBrand: "Медтест",
	indicatorClass: 4,
	indicatorVerdict: "Цвет эталона достигнут / Стерильно",
	bowieDickResult: "not_performed",
	bowieDickNote: "Для сухожаровых шкафов Бови-Дик не применяется",
	loadDescription:
		"Цельнометаллический инструмент, хирургические элеваторы, боры без упаковки",
	packageType: "Крафт-пакеты из белой бумаги (без складок, до 20 суток)",
	kraftSize: "100x200",
	shelfLifeDays: 20,
	batchVerdict: "ГОДНА",
	operatorName: "Смирнова А.В. (медсестра ЦСО)",
	sanpinClause: "Воздушный метод стерилизации, Таблица 3.13",
	isQuickPreset: true,
};

export const SANPIN_DRY_HEAT_160_150_PRESET: CycleBase = {
	programName: "Воздушный 160°C / 150 мин (щадящий сухожар)",
	autoclaveCode: "СУХ-01",
	autoclaveModel: "ГП-20 СПУ / ГП-10 СПУ",
	sterilizerType: "dry_heat",
	temperatureC: 160,
	pressureBar: 0,
	exposureMinutes: 150,
	preVacuum: "Не предусмотрено (сухожаровой шкаф)",
	indicatorPointsStatus:
		"Химические индикаторы (Медтест В-160/150 во всех точках): Стерильно",
	indicatorBrand: "Медтест",
	indicatorClass: 4,
	indicatorVerdict: "Цвет эталона достигнут / Стерильно",
	bowieDickResult: "not_performed",
	bowieDickNote: "Не применяется",
	loadDescription:
		"Стоматологические зеркала, зонды, пинцеты в сухожаровых лотках",
	packageType: "Крафт-бумага мешочная непропитанная (до 20 суток)",
	kraftSize: "100x200",
	shelfLifeDays: 20,
	batchVerdict: "ГОДНА",
	operatorName: "Смирнова А.В. (медсестра ЦСО)",
	sanpinClause: "Воздушный метод, режим 2",
	isQuickPreset: false,
};

export const SANPIN_AUTOCLAVE_CLASS_B_PRESET = SANPIN_AUTOCLAVE_UNIVERSAL_134_PRESET;

export const AUTOCLAVE_CYCLE_PRESETS: readonly SterilizationCyclePreset[] = [
	{ id: "universal_134", ...SANPIN_AUTOCLAVE_UNIVERSAL_134_PRESET },
	{ id: "standard_132", ...SANPIN_AUTOCLAVE_STANDARD_132_20_PRESET },
	{ id: "prion_134", ...SANPIN_AUTOCLAVE_PRION_134_PRESET },
	{ id: "delicate_121", ...SANPIN_AUTOCLAVE_DELICATE_121_PRESET },
	{ id: "vacuum_test", ...SANPIN_AUTOCLAVE_VACUUM_TEST_PRESET },
	{ id: "dry_heat_180", ...SANPIN_DRY_HEAT_180_60_PRESET },
	{ id: "dry_heat_160", ...SANPIN_DRY_HEAT_160_150_PRESET },
];

export function createQuickAutoclaveCycle(
	presetIdOrCycleNumber: string | number = 1,
	cycleNumberOrOperator: number | string = "Смирнова А.В. (медсестра ЦСО)",
	operatorOrOverrides: string | Partial<AutoclaveCycleRecord> = "Смирнова А.В. (медсестра ЦСО)",
	overrides: Partial<AutoclaveCycleRecord> = {},
): AutoclaveCycleRecord {
	let presetId = "universal_134";
	let cycleNumber = 1;
	let operatorName = "Смирнова А.В. (медсестра ЦСО)";
	let finalOverrides: Partial<AutoclaveCycleRecord> = {};

	if (typeof presetIdOrCycleNumber === "number") {
		cycleNumber = presetIdOrCycleNumber;
		if (typeof cycleNumberOrOperator === "string") {
			operatorName = cycleNumberOrOperator;
		}
		if (typeof operatorOrOverrides === "object" && operatorOrOverrides !== null) {
			finalOverrides = operatorOrOverrides;
		}
	} else if (typeof presetIdOrCycleNumber === "string") {
		if (typeof cycleNumberOrOperator === "number") {
			presetId = presetIdOrCycleNumber;
			cycleNumber = cycleNumberOrOperator;
			if (typeof operatorOrOverrides === "string") {
				operatorName = operatorOrOverrides;
			}
			finalOverrides = overrides;
		} else {
			presetId = presetIdOrCycleNumber;
			if (typeof cycleNumberOrOperator === "string") {
				operatorName = cycleNumberOrOperator;
			}
			if (typeof operatorOrOverrides === "object" && operatorOrOverrides !== null) {
				finalOverrides = operatorOrOverrides;
			}
		}
	}

	const preset =
		AUTOCLAVE_CYCLE_PRESETS.find((p) => p.id === presetId) ||
		SANPIN_AUTOCLAVE_UNIVERSAL_134_PRESET;
	const now = new Date().toISOString();
	return {
		...preset,
		id: `CYC-${cycleNumber}-${Date.now().toString(36)}`,
		cycleNumber,
		operatorName,
		timestamp: now,
		...finalOverrides,
	};
}

export function createQuickUniversalCycle(
	cycleNumber = 1,
	operatorName = "Смирнова А.В. (медсестра ЦСО)",
): AutoclaveCycleRecord {
	return createQuickAutoclaveCycle("universal_134", cycleNumber, operatorName, {
		id: `cycle-univ-${cycleNumber}-${Date.now().toString(36)}`,
	});
}

export function createQuickStandard132Cycle(
	cycleNumber = 1,
	operatorName = "Смирнова А.В. (медсестра ЦСО)",
): AutoclaveCycleRecord {
	return createQuickAutoclaveCycle("standard_132", cycleNumber, operatorName, {
		id: `cycle-std132-${cycleNumber}-${Date.now().toString(36)}`,
	});
}

export function createQuickPrionCycle(
	cycleNumber = 1,
	operatorName = "Смирнова А.В. (медсестра ЦСО)",
): AutoclaveCycleRecord {
	return createQuickAutoclaveCycle("prion_134", cycleNumber, operatorName, {
		id: `cycle-prion-${cycleNumber}-${Date.now().toString(36)}`,
	});
}

export function createQuickDelicateCycle(
	cycleNumber = 1,
	operatorName = "Смирнова А.В. (медсестра ЦСО)",
): AutoclaveCycleRecord {
	return createQuickAutoclaveCycle("delicate_121", cycleNumber, operatorName, {
		id: `cycle-delicate-${cycleNumber}-${Date.now().toString(36)}`,
	});
}

export function createQuickDryHeat180Cycle(
	cycleNumber = 1,
	operatorName = "Смирнова А.В. (медсестра ЦСО)",
): AutoclaveCycleRecord {
	return createQuickAutoclaveCycle("dry_heat_180", cycleNumber, operatorName, {
		id: `cycle-dry180-${cycleNumber}-${Date.now().toString(36)}`,
	});
}

export function createQuickDryHeat160Cycle(
	cycleNumber = 1,
	operatorName = "Смирнова А.В. (медсестра ЦСО)",
): AutoclaveCycleRecord {
	return createQuickAutoclaveCycle("dry_heat_160", cycleNumber, operatorName, {
		id: `cycle-dry160-${cycleNumber}-${Date.now().toString(36)}`,
	});
}

export function createQuickDailyShiftAutoclaveCycles(
	cyclesCountOrOperator: number | string = 3,
	operatorName = "Смирнова А.В. (медсестра ЦСО)",
): AutoclaveCycleRecord[] {
	const cyclesCount = typeof cyclesCountOrOperator === "number" ? cyclesCountOrOperator : 3;
	const opName = typeof cyclesCountOrOperator === "string" ? cyclesCountOrOperator : operatorName;
	const result: AutoclaveCycleRecord[] = [];
	for (let i = 1; i <= cyclesCount; i++) {
		result.push(createQuickUniversalCycle(i, opName));
	}
	return result;
}

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
				cycle.kraftSize === "150x250"
					? "kraft_heat_sealed"
					: "kraft_self_adhesive",
			indicatorType:
				cycle.indicatorClass === 5
					? "class5_integrating"
					: "class4_multivariable",
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
				error:
					errBody?.message ||
					`Ошибка сохранения цикла автоклава (${res.status})`,
			};
		}

		const data = await res.json();
		return { ok: true, id: data?.id };
	} catch (err: unknown) {
		const msg =
			err instanceof Error ? err.message : "Сетевой сбой при сохранении цикла";
		return { ok: false, error: msg };
	}
}

export async function fetchSterilizationLogsFromApi(): Promise<
	Record<string, unknown>[]
> {
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
