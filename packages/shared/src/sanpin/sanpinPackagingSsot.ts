/**
 * ============================================================================
 * SANPIN 3.3686-21 & GOST R ISO 11607 CANONICAL PACKAGING & STERILIZATION SSOT
 * Единый источник правды (SSOT) для стоматологической стерилизации:
 * - Размеры крафт-пакетов (75×150, 100×200, 100×250, 150×250 мм)
 * - Сроки стерильности (самоклеящиеся 50 сут, рулоны 20 сут, открыто 0 сут)
 * - Режимы автоклавирования (134°C / 2.1 бар / 5 мин, 121°C / 1.1 бар / 20 мин)
 * - Химические индикаторы 4, 5, 6 классов
 * - Контроль ПСО: азопирамовая и фенолфталеиновая пробы (1%, min 3–5 шт.)
 * ============================================================================
 */

// ─── 1. ТИПОРАЗМЕРЫ КРАФТ-ПАКЕТОВ ──────────────────────────────────────────

export type SanpinPackageSizeId =
	| "size_75x150"
	| "size_100x200"
	| "size_100x250"
	| "size_150x250"
	| "size_200x300";

export interface SanpinPackageSizeDefinition {
	readonly id: SanpinPackageSizeId;
	readonly widthMm: number;
	readonly heightMm: number;
	readonly dimensionsMmRu: string;
	readonly titleRu: string;
	readonly dentalApplicationRu: string;
	readonly standardCapacityItems: number;
}

export const SANPIN_PACKAGE_SIZES: readonly SanpinPackageSizeDefinition[] = [
	{
		id: "size_75x150",
		widthMm: 75,
		heightMm: 150,
		dimensionsMmRu: "75 × 150 мм",
		titleRu: "Компактный (боры и эндо)",
		dentalApplicationRu: "Смотровой лоток, алмазные и твердосплавные боры, файлы, полиры",
		standardCapacityItems: 6,
	},
	{
		id: "size_100x200",
		widthMm: 100,
		heightMm: 200,
		dimensionsMmRu: "100 × 200 мм",
		titleRu: "Стандартный (щипцы и элеваторы)",
		dentalApplicationRu: "Хирургические щипцы, элеваторы, базовый терапевтический лоток",
		standardCapacityItems: 5,
	},
	{
		id: "size_100x250",
		widthMm: 100,
		heightMm: 250,
		dimensionsMmRu: "100 × 250 мм",
		titleRu: "Удлиненный (наконечники)",
		dentalApplicationRu: "Наконечники турбинные, микромоторные угловые, насадки скейлера",
		standardCapacityItems: 4,
	},
	{
		id: "size_150x250",
		widthMm: 150,
		heightMm: 250,
		dimensionsMmRu: "150 × 250 мм",
		titleRu: "Широкий (имплантация и хирургия)",
		dentalApplicationRu: "Базовый набор имплантации, хирургический лоток, кюреты Грейси",
		standardCapacityItems: 8,
	},
	{
		id: "size_200x300",
		widthMm: 200,
		heightMm: 300,
		dimensionsMmRu: "200 × 300 мм",
		titleRu: "Крупный кассетный",
		dentalApplicationRu: "Сетчатые кассеты имплантологии, полные ортопедические наборы",
		standardCapacityItems: 12,
	},
];

// ─── 2. УПАКОВОЧНЫЕ МАТЕРИАЛЫ И СРОКИ СТЕРИЛЬНОСТИ ──────────────────────────

export type SanpinPackagingMaterialId =
	| "kraft_self_seal"
	| "heat_seal_roll"
	| "heat_seal_pouch"
	| "crepe_paper_wrap"
	| "unpacked_immediate";

export interface SanpinPackagingMaterialDefinition {
	readonly id: SanpinPackagingMaterialId;
	readonly nameRu: string;
	readonly shortLabelRu: string;
	readonly statutoryShelfLifeDays: number;
	readonly sealingMethodRu: string;
	readonly sanpinClauseRu: string;
	readonly gostStandardRu: string;
	readonly descriptionRu: string;
	readonly isHeatSealed: boolean;
	readonly isImmediateUseOnly: boolean;
}

export const SANPIN_PACKAGING_MATERIALS: readonly SanpinPackagingMaterialDefinition[] = [
	{
		id: "kraft_self_seal",
		nameRu: "Крафт-пакет бумажный самоклеящийся",
		shortLabelRu: "Крафт-пакет самоклеящийся (50 сут.)",
		statutoryShelfLifeDays: 50,
		sealingMethodRu: "Встроенный самоклеящийся клапан с защитным лайнером",
		sanpinClauseRu: "СанПиН 3.3686-21 п. 3632 (Таблица 3.14)",
		gostStandardRu: "ГОСТ Р ИСО 11607-1-2018 / ГОСТ 10354",
		descriptionRu: "Пакет из влагопрочной крафт-бумаги с липким клапаном. Срок 50 суток.",
		isHeatSealed: false,
		isImmediateUseOnly: false,
	},
	{
		id: "heat_seal_roll",
		nameRu: "Термосварочный рулон (бумага + пленка)",
		shortLabelRu: "Термосварочный рулон (20 сут.)",
		statutoryShelfLifeDays: 20,
		sealingMethodRu: "Импульсный термосвариватель (ширина шва ≥ 8 мм)",
		sanpinClauseRu: "СанПиН 3.3686-21 п. 3632",
		gostStandardRu: "ГОСТ Р ИСО 11607-1-2018 / EN 868-5",
		descriptionRu: "Рулонный упаковочный материал бумага+полимер со сварным швом. Срок 20 суток.",
		isHeatSealed: true,
		isImmediateUseOnly: false,
	},
	{
		id: "heat_seal_pouch",
		nameRu: "Комбинированный пакет термосварной со швом ≥ 8 мм",
		shortLabelRu: "Комби-пакет термосварной (60–180 сут.)",
		statutoryShelfLifeDays: 60,
		sealingMethodRu: "Термосварочный аппарат с валидацией шва (шов ≥ 8 мм)",
		sanpinClauseRu: "СанПиН 3.3686-21 п. 3632, п. 3634",
		gostStandardRu: "ГОСТ Р ИСО 11607-1-2018 / EN 868-5",
		descriptionRu: "Пакет бумага+пленка с тройным термошвом. 60 суток (до 180 суток в чистых боксах).",
		isHeatSealed: true,
		isImmediateUseOnly: false,
	},
	{
		id: "crepe_paper_wrap",
		nameRu: "Крепированная бумага стерилизационная (в 2 слоя)",
		shortLabelRu: "Креп-бумага 2 слоя (60 сут.)",
		statutoryShelfLifeDays: 60,
		sealingMethodRu: "Конвертное двухслойное пеленание с фиксацией индикаторной лентой",
		sanpinClauseRu: "СанПиН 3.3686-21 п. 3633",
		gostStandardRu: "ГОСТ Р ИСО 11607-1-2018 / EN 868-2",
		descriptionRu: "Двухслойная креп-бумага. Оптимальна для тяжелых хирургических кассет.",
		isHeatSealed: false,
		isImmediateUseOnly: false,
	},
	{
		id: "unpacked_immediate",
		nameRu: "Без упаковки (открытый лоток на столике)",
		shortLabelRu: "Без упаковки (немедленно)",
		statutoryShelfLifeDays: 0,
		sealingMethodRu: "Открытое размещение в стерилизационной камере",
		sanpinClauseRu: "СанПиН 3.3686-21 п. 3636",
		gostStandardRu: "СанПиН 3.3686-21",
		descriptionRu: "Инструменты без упаковки: использовать немедленно у кресла. Хранение запрещено.",
		isHeatSealed: false,
		isImmediateUseOnly: true,
	},
];

// ─── 3. РЕЖИМЫ АВТОКЛАВИРОВАНИЯ И СТЕРИЛИЗАЦИИ ──────────────────────────────

export type SanpinSterilizationRegimeId =
	| "steam_134_5min"
	| "steam_121_20min"
	| "dry_heat_180_60min"
	| "steam_132_20min";

export interface SanpinSterilizationRegimeDefinition {
	readonly id: SanpinSterilizationRegimeId;
	readonly nameRu: string;
	readonly shortLabelRu: string;
	readonly methodType: "steam_autoclave" | "dry_heat_air";
	readonly targetTemperatureCelsius: number;
	readonly minTemperatureCelsius: number;
	readonly maxTemperatureCelsius: number;
	readonly targetPressureBar: number;
	readonly minPressureBar: number;
	readonly maxPressureBar: number;
	readonly targetExposureMinutes: number;
	readonly minExposureMinutes: number;
	readonly recommendedIndicatorClass: 4 | 5 | 6;
	readonly sanpinNormClauseRu: string;
	readonly dentalApplicationRu: string;
}

export const SANPIN_STERILIZATION_REGIMES: readonly SanpinSterilizationRegimeDefinition[] = [
	{
		id: "steam_134_5min",
		nameRu: "Паровой автоклав: 134°C / 2.1 бар / 5 мин (Стандартный стоматологический)",
		shortLabelRu: "Автоклав 134°C (5 мин / 2.1 бар)",
		methodType: "steam_autoclave",
		targetTemperatureCelsius: 134,
		minTemperatureCelsius: 134,
		maxTemperatureCelsius: 138,
		targetPressureBar: 2.1,
		minPressureBar: 2.0,
		maxPressureBar: 2.3,
		targetExposureMinutes: 5,
		minExposureMinutes: 5,
		recommendedIndicatorClass: 5,
		sanpinNormClauseRu: "СанПиН 3.3686-21 Таблица 3.12 (Паровой метод, режим 1)",
		dentalApplicationRu: "Металлические инструменты, наконечники, боры, смотровые лотки",
	},
	{
		id: "steam_121_20min",
		nameRu: "Паровой автоклав: 121°C / 1.1 бар / 20 мин (Деликатный для термолабильных изделий)",
		shortLabelRu: "Автоклав 121°C (20 мин / 1.1 бар)",
		methodType: "steam_autoclave",
		targetTemperatureCelsius: 121,
		minTemperatureCelsius: 120,
		maxTemperatureCelsius: 125,
		targetPressureBar: 1.1,
		minPressureBar: 1.05,
		maxPressureBar: 1.3,
		targetExposureMinutes: 20,
		minExposureMinutes: 20,
		recommendedIndicatorClass: 5,
		sanpinNormClauseRu: "СанПиН 3.3686-21 Таблица 3.12 (Паровой метод, режим 2)",
		dentalApplicationRu: "Резиновые изделия, силикон, термолабильный пластик, световоды",
	},
	{
		id: "dry_heat_180_60min",
		nameRu: "Воздушный стерилизатор (Сухожар): 180°C / 60 мин (атмосферное давление)",
		shortLabelRu: "Сухожар 180°C (60 мин)",
		methodType: "dry_heat_air",
		targetTemperatureCelsius: 180,
		minTemperatureCelsius: 180,
		maxTemperatureCelsius: 190,
		targetPressureBar: 0,
		minPressureBar: 0,
		maxPressureBar: 0.05,
		targetExposureMinutes: 60,
		minExposureMinutes: 60,
		recommendedIndicatorClass: 4,
		sanpinNormClauseRu: "СанПиН 3.3686-21 Таблица 3.13 (Воздушный метод)",
		dentalApplicationRu: "Цельнометаллические боры, щипцы, элеваторы без резиновых уплотнителей",
	},
	{
		id: "steam_132_20min",
		nameRu: "Паровой автоклав: 132°C / 2.0 бар / 20 мин (Нормативный режим МУ 287-113)",
		shortLabelRu: "Автоклав 132°C (20 мин / 2.0 бар)",
		methodType: "steam_autoclave",
		targetTemperatureCelsius: 132,
		minTemperatureCelsius: 132,
		maxTemperatureCelsius: 136,
		targetPressureBar: 2.0,
		minPressureBar: 1.9,
		maxPressureBar: 2.2,
		targetExposureMinutes: 20,
		minExposureMinutes: 20,
		recommendedIndicatorClass: 4,
		sanpinNormClauseRu: "МУ 287-113 и СанПиН 3.3686-21 (Паровой метод базовый)",
		dentalApplicationRu: "Сложные кассеты и пористые материалы при отсутствии скоростного вакуумного цикла",
	},
];

// ─── 4. ХИМИЧЕСКИЕ ИНДИКАТОРЫ 4, 5 И 6 КЛАССОВ ──────────────────────────────

export type ChemicalIndicatorClass = 4 | 5 | 6;

export interface ChemicalIndicatorDefinition {
	readonly classNumber: ChemicalIndicatorClass;
	readonly titleRu: string;
	readonly gostTypeRu: string;
	readonly descriptionRu: string;
	readonly clinicalSignificanceRu: string;
}

export const SANPIN_CHEMICAL_INDICATOR_CLASSES: readonly ChemicalIndicatorDefinition[] = [
	{
		classNumber: 4,
		titleRu: "Класс 4 — Многопараметрические индикаторы",
		gostTypeRu: "ГОСТ ISO 11140-1-2011 Класс 4",
		descriptionRu: "Контролируют два или более критических параметра цикла (температуру и время).",
		clinicalSignificanceRu: "Применяются для рутинного внутрикамерного и внешнего контроля упаковок.",
	},
	{
		classNumber: 5,
		titleRu: "Класс 5 — Интегрирующие индикаторы (интеграторы)",
		gostTypeRu: "ГОСТ ISO 11140-1-2011 Класс 5",
		descriptionRu: "Реагируют на все критические параметры процесса со скоростью инактивации биотестов.",
		clinicalSignificanceRu: "Золотой стандарт стоматологии. Размещаются внутри каждого крафт-пакета.",
	},
	{
		classNumber: 6,
		titleRu: "Класс 6 — Эмулирующие индикаторы-имитаторы",
		gostTypeRu: "ГОСТ ISO 11140-1-2011 Класс 6",
		descriptionRu: "Строго откалиброваны под конкретный режим (134°C / 5 мин). Реагируют при 100% параметров.",
		clinicalSignificanceRu: "Применяются для контрольных проверок циклов автоклавов B-класса.",
	},
];

// ─── 5. КОНТРОЛЬ ПСО: АЗОПИРАМ И ФЕНОЛФТАЛЕИН ───────────────────────────────

export const SANPIN_PSO_CONSTANTS = {
	statutorySamplingPercent: 1.0,
	minimumSampleFloorGeneral: 3,
	minimumSampleFloorSurgical: 5,
	azopyramReactionMaxSeconds: 60,
	phenolphthaleinReactionMaxSeconds: 30,
	workingSolutionLifespanMinutes: 120,
	sanpinClauseRu: "СанПиН 3.3686-21 п. 3584",
} as const;

export interface PsoSamplingRequirement {
	readonly minSampleRequired: number;
	readonly batchCount: number;
	readonly calculatedPercentCount: number;
	readonly floorPerItem: number;
	readonly itemsTypesCount: number;
	readonly isSurgicalOrCritical: boolean;
	readonly formulaExplanationRu: string;
}

export function calculatePsoSamplingRequirement(
	batchCount: number,
	isSurgicalOrCritical = false,
	itemsTypesCount = 1,
): PsoSamplingRequirement {
	const count = Math.max(1, Math.floor(Number(batchCount) || 1));
	const typesCount = Math.max(1, Math.floor(Number(itemsTypesCount) || 1));
	const floorPerItem = isSurgicalOrCritical
		? SANPIN_PSO_CONSTANTS.minimumSampleFloorSurgical
		: SANPIN_PSO_CONSTANTS.minimumSampleFloorGeneral;
	const calculatedPercentCount = Math.ceil((count * SANPIN_PSO_CONSTANTS.statutorySamplingPercent) / 100);
	const minSampleRequired = Math.max(floorPerItem * typesCount, calculatedPercentCount);
	const formulaExplanationRu = `СанПиН 3.3686-21 п. 3584: 1% от ${count} шт. (${calculatedPercentCount} шт.), но не менее ${floorPerItem} шт. на каждое из ${typesCount} наим. = ${minSampleRequired} шт.`;

	return {
		minSampleRequired,
		batchCount: count,
		calculatedPercentCount,
		floorPerItem,
		itemsTypesCount: typesCount,
		isSurgicalOrCritical,
		formulaExplanationRu,
	};
}

// ─── 6. РАСЧЕТ СРОКОВ ГОДНОСТИ СТЕРИЛЬНОСТИ КРАФТ-ПАКЕТОВ ────────────────────

export type PackageSterilityStatus = "valid" | "expiring_soon" | "expired" | "immediate_use";

export interface PackageExpiryCalculationResult {
	readonly packDateIso: string;
	readonly expiryDateIso: string;
	readonly packDateFormatted: string;
	readonly expiryDateFormatted: string;
	readonly shelfLifeDays: number;
	readonly daysRemaining: number;
	readonly status: PackageSterilityStatus;
	readonly isExpired: boolean;
	readonly isExpiringSoon: boolean;
	readonly statusLabelRu: string;
	readonly statusColorHex: string;
	readonly sanpinClause: string;
	readonly recommendationRu: string;
}

export function getSanpinPackagingMaterial(id: SanpinPackagingMaterialId): SanpinPackagingMaterialDefinition {
	return SANPIN_PACKAGING_MATERIALS.find((m) => m.id === id) || SANPIN_PACKAGING_MATERIALS[0]!;
}

export function getSanpinPackageSize(id: SanpinPackageSizeId): SanpinPackageSizeDefinition {
	return SANPIN_PACKAGE_SIZES.find((s) => s.id === id) || SANPIN_PACKAGE_SIZES[1]!;
}

export function getSanpinSterilizationRegime(id: SanpinSterilizationRegimeId): SanpinSterilizationRegimeDefinition {
	return SANPIN_STERILIZATION_REGIMES.find((r) => r.id === id) || SANPIN_STERILIZATION_REGIMES[0]!;
}

export function calculatePackageExpiryDate(
	packDateInput: string | Date,
	packagingType: SanpinPackagingMaterialId,
	options?: { customDays?: number | undefined; referenceDate?: string | Date | undefined },
): PackageExpiryCalculationResult {
	const packDate = typeof packDateInput === "string" ? new Date(packDateInput) : new Date(packDateInput.getTime());
	const refDate = options?.referenceDate
		? (typeof options.referenceDate === "string" ? new Date(options.referenceDate) : new Date(options.referenceDate.getTime()))
		: new Date();

	const def = getSanpinPackagingMaterial(packagingType);
	const shelfLifeDays = typeof options?.customDays === "number" && options.customDays >= 0
		? options.customDays
		: def.statutoryShelfLifeDays;

	const expDate = new Date(packDate.getTime());
	expDate.setDate(expDate.getDate() + shelfLifeDays);
	const diffMs = expDate.getTime() - refDate.getTime();
	const daysRemaining = shelfLifeDays === 0 ? 0 : Math.ceil(diffMs / (1000 * 60 * 60 * 24));

	let status: PackageSterilityStatus = "valid";
	let statusLabelRu = "Стерильно (Годен)";
	let statusColorHex = "#10b981";
	let recommendationRu = "Изделие стерильно, допущено к клиническому применению у кресла.";

	if (def.isImmediateUseOnly) {
		status = "immediate_use";
		statusLabelRu = "Использовать немедленно";
		statusColorHex = "#0d9488";
		recommendationRu = "Без упаковки: использовать сразу после извлечения из стерилизатора.";
	} else if (daysRemaining <= 0) {
		status = "expired";
		statusLabelRu = daysRemaining === 0 ? "Истекает сегодня" : `Просрочено на ${Math.abs(daysRemaining)} дн.`;
		statusColorHex = "#ef4444";
		recommendationRu = "Срок стерильности истек. Использование запрещено. Отправить на повторную ПСО.";
	} else if (daysRemaining <= 7) {
		status = "expiring_soon";
		statusLabelRu = `Истекает через ${daysRemaining} дн.`;
		statusColorHex = "#f59e0b";
		recommendationRu = "Срок стерильности менее 7 суток. Рекомендуется использовать в первую очередь.";
	}

	return {
		packDateIso: packDate.toISOString(),
		expiryDateIso: expDate.toISOString(),
		packDateFormatted: packDate.toISOString().slice(0, 10),
		expiryDateFormatted: expDate.toISOString().slice(0, 10),
		shelfLifeDays,
		daysRemaining,
		status,
		isExpired: status === "expired",
		isExpiringSoon: status === "expiring_soon",
		statusLabelRu,
		statusColorHex,
		sanpinClause: def.sanpinClauseRu,
		recommendationRu,
	};
}

// ─── 7. ВАЛИДАЦИЯ ПАРАМЕТРОВ ЦИКЛА АВТОКЛАВИРОВАНИЯ ─────────────────────────

export interface SterilizationCycleValidationResult {
	readonly isValid: boolean;
	readonly regime: SanpinSterilizationRegimeDefinition;
	readonly actualTempCelsius: number;
	readonly actualPressureBar: number;
	readonly actualExposureMinutes: number;
	readonly errors: readonly string[];
	readonly warnings: readonly string[];
	readonly complianceVerdictRu: string;
}

export function validateSterilizationCycleParameters(
	regimeId: SanpinSterilizationRegimeId,
	actualTemp: number,
	actualPressure: number,
	actualMinutes: number,
): SterilizationCycleValidationResult {
	const regime = getSanpinSterilizationRegime(regimeId);
	const errors: string[] = [];
	const warnings: string[] = [];

	if (actualMinutes <= 0) errors.push(`Недопустимое время: выдержка ${actualMinutes} мин должна быть > 0`);
	if (actualTemp <= 0) errors.push(`Недопустимая температура: ${actualTemp}°C`);
	if (actualPressure < 0) errors.push(`Отрицательное давление невозможно: ${actualPressure} бар`);

	if (regime.methodType === "steam_autoclave" && actualTemp >= 120 && actualPressure <= 0.1) {
		errors.push(`Сбой пара: автоклав при ${actualTemp}°C требует избыточного давления насыщенного пара`);
	} else if (regime.methodType === "dry_heat_air" && actualPressure > 0.1) {
		errors.push(`Недопустимый параметр: сухожар работает при атмосферном давлении (факт ${actualPressure} бар)`);
	}

	if (actualTemp < regime.minTemperatureCelsius) {
		errors.push(`Критический сбой температуры: ${actualTemp}°C ниже нормы ${regime.minTemperatureCelsius}°C.`);
	} else if (actualTemp > regime.maxTemperatureCelsius) {
		errors.push(`Превышение температуры: ${actualTemp}°C выше предела ${regime.maxTemperatureCelsius}°C.`);
	}

	if (regime.methodType === "steam_autoclave") {
		if (actualPressure < regime.minPressureBar) {
			errors.push(`Недостаточное давление пара: ${actualPressure} бар ниже нормы ${regime.minPressureBar} бар.`);
		} else if (actualPressure > regime.maxPressureBar) {
			warnings.push(`Превышение давления: ${actualPressure} бар выше нормы ${regime.maxPressureBar} бар.`);
		}
	}

	if (actualMinutes < regime.minExposureMinutes) {
		errors.push(`Недостаточная выдержка: ${actualMinutes} мин вместо минимальных ${regime.minExposureMinutes} мин.`);
	}

	const isValid = errors.length === 0;
	const complianceVerdictRu = isValid
		? (warnings.length === 0 ? `Цикл полностью соответствует ${regime.sanpinNormClauseRu}. Стерилизация подтверждена.` : `Параметры в допуске: ${warnings.join("; ")}`)
		: "БРАК СТЕРИЛИЗАЦИИ: параметры нарушают СанПиН 3.3686-21. Все пакеты подлежат повторной ПСО.";

	return { isValid, regime, actualTempCelsius: actualTemp, actualPressureBar: actualPressure, actualExposureMinutes: actualMinutes, errors, warnings, complianceVerdictRu };
}
