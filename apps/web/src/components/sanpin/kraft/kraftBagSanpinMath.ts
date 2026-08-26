/**
 * ============================================================================
 * SANPIN 3.3686-21 & GOST R ISO 11607 KRAFT-BAG STERILITY MATH ENGINE
 * Математический справочник и расчетный движок сроков годности стерильности
 * упаковочных материалов, химических интеграторов классов 4/5/6 и режимов стерилизации.
 * ============================================================================
 */

export type SanpinPackagingTypeId =
	| "kraft_self_seal"
	| "paper_plastic_heat_seal"
	| "crepe_paper_double"
	| "bix_filter"
	| "bix_no_filter"
	| "calico_double_wrap";

export interface SanpinPackagingTypeDefinition {
	readonly id: SanpinPackagingTypeId;
	readonly nameRu: string;
	readonly shortLabelRu: string;
	readonly minShelfLifeDays: number;
	readonly maxShelfLifeDays: number;
	readonly defaultShelfLifeDays: number;
	readonly sealingMethodRu: string;
	readonly sanpinClauseRu: string;
	readonly gostStandardRu: string;
	readonly descriptionRu: string;
	readonly storageRequirementsRu: string;
	readonly isHeatSealed: boolean;
	readonly isTransparentFilm: boolean;
}

export const SANPIN_PACKAGING_TYPES: readonly SanpinPackagingTypeDefinition[] = [
	{
		id: "kraft_self_seal",
		nameRu: "Крафт-пакет бумажный самоклеящийся",
		shortLabelRu: "Крафт-пакет самоклеящийся (20–50 сут.)",
		minShelfLifeDays: 20,
		maxShelfLifeDays: 50,
		defaultShelfLifeDays: 50,
		sealingMethodRu: "Встроенный клеевой клапан с защитной полосой",
		sanpinClauseRu: "СанПиН 3.3686-21 п. 3632 (Таблица 3.14)",
		gostStandardRu: "ГОСТ Р ИСО 11607-1-2018 / ГОСТ 10354",
		descriptionRu: "Пакет из влагопрочной медицинской крафт-бумаги плотностью 70–80 г/м² с клапаном на липкой основе. Срок 20–50 суток в зависимости от производителя и условий.",
		storageRequirementsRu: "Хранить в закрытых сухих шкафах/ящиках при температуре +10...+30°C и влажности не более 60%.",
		isHeatSealed: false,
		isTransparentFilm: false,
	},
	{
		id: "paper_plastic_heat_seal",
		nameRu: "Комбинированный пакет термосварной (бумага + пленка)",
		shortLabelRu: "Комби-пакет термосварной (50–60 сут. / до 180 сут.)",
		minShelfLifeDays: 50,
		maxShelfLifeDays: 180,
		defaultShelfLifeDays: 60,
		sealingMethodRu: "Термосварочный импульсный аппарат (ширина сварного шва ≥ 8 мм)",
		sanpinClauseRu: "СанПиН 3.3686-21 п. 3632 (Таблица 3.14), п. 3634",
		gostStandardRu: "ГОСТ Р ИСО 11607-1-2018 / EN 868-5",
		descriptionRu: "Многослойная прозрачная полимерная пленка (PET/PP) и медицинская бумага. Срок 50–60 суток по СанПиН базово, до 180 суток при хранении в закрытых чистых боксах.",
		storageRequirementsRu: "В шкафах чистой зоны, беречь от прямых солнечных лучей и механических проколов острым инструментом.",
		isHeatSealed: true,
		isTransparentFilm: true,
	},
	{
		id: "crepe_paper_double",
		nameRu: "Бумага крепированная стерилизационная (в 2 слоя)",
		shortLabelRu: "Крепированная бумага (60 сут.)",
		minShelfLifeDays: 60,
		maxShelfLifeDays: 60,
		defaultShelfLifeDays: 60,
		sealingMethodRu: "Конвертное двухслойное обертывание с фиксацией индикаторной самоклеящейся лентой",
		sanpinClauseRu: "СанПиН 3.3686-21 п. 3633",
		gostStandardRu: "ГОСТ Р ИСО 11607-1-2018 / EN 868-2",
		descriptionRu: "Двухслойная влагостойкая креп-бумага плотностью 60 г/м². Оптимальна для объемных хирургических и имплантологических кассет.",
		storageRequirementsRu: "Хранить в сухих отапливаемых шкафах без перегибов упаковки.",
		isHeatSealed: false,
		isTransparentFilm: false,
	},
	{
		id: "bix_filter",
		nameRu: "Стерилизационная коробка (бикс) с антибактериальным фильтром",
		shortLabelRu: "Бикс с фильтром КСПФ/КФ (20–30 сут.)",
		minShelfLifeDays: 20,
		maxShelfLifeDays: 30,
		defaultShelfLifeDays: 20,
		sealingMethodRu: "Механические фиксаторы крышки с тканевыми/бактерицидными фильтрами в крышке и дне",
		sanpinClauseRu: "СанПиН 3.3686-21 п. 3631",
		gostStandardRu: "ГОСТ Р 51574 / ТУ 9451-002",
		descriptionRu: "Металлическая коробка КСПФ с хлопчатобумажным фильтром. 20–30 суток без вскрытия (после первого вскрытия — не более 24 часов).",
		storageRequirementsRu: "Хранить на стеллажах высотой от пола не менее 20 см, после вскрытия использовать в течение 24 ч.",
		isHeatSealed: false,
		isTransparentFilm: false,
	},
	{
		id: "bix_no_filter",
		nameRu: "Стерилизационная коробка (бикс) без фильтра (КСК с поясными отверстиями)",
		shortLabelRu: "Бикс без фильтра КСК (3 сут.)",
		minShelfLifeDays: 3,
		maxShelfLifeDays: 3,
		defaultShelfLifeDays: 3,
		sealingMethodRu: "Закрытие пояса с боковыми отверстиями сразу после извлечения из автоклава",
		sanpinClauseRu: "СанПиН 3.3686-21 п. 3631",
		gostStandardRu: "ГОСТ 19569-89",
		descriptionRu: "Коробка стерилизационная круглая с боковыми поясными отверстиями. Срок сохранения стерильности не более 3 суток.",
		storageRequirementsRu: "В закрытых шкафах стерилизационной.",
		isHeatSealed: false,
		isTransparentFilm: false,
	},
	{
		id: "calico_double_wrap",
		nameRu: "Двойная мягкая бязевая упаковка",
		shortLabelRu: "Двойная бязь (3 сут.)",
		minShelfLifeDays: 3,
		maxShelfLifeDays: 3,
		defaultShelfLifeDays: 3,
		sealingMethodRu: "Двухслойное пеленание в отбеленную бязь с перевязкой тесьмой",
		sanpinClauseRu: "СанПиН 3.3686-21 п. 3630",
		gostStandardRu: "ГОСТ 29298-2005",
		descriptionRu: "Тканевая упаковка из плотной отбеленной бязи в два слоя. Срок сохранения стерильности — строго 3 суток (72 часа).",
		storageRequirementsRu: "Хранить в закрытых шкафах при влажности не выше 60%.",
		isHeatSealed: false,
		isTransparentFilm: false,
	},
];

export type SterilizationRegimeId =
	| "steam_134_5min"
	| "steam_121_20min"
	| "dry_heat_180_60min";

export interface SterilizationRegimeDefinition {
	readonly id: SterilizationRegimeId;
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
	readonly recommendedIndicatorClasses: readonly ("class_4" | "class_5" | "class_6")[];
	readonly sanpinNormClauseRu: string;
	readonly descriptionRu: string;
}

export const STERILIZATION_REGIMES: readonly SterilizationRegimeDefinition[] = [
	{
		id: "steam_134_5min",
		nameRu: "Паровой автоклав: 134°C / 5 минут / 2.0–2.1 бар (Основной стоматологический)",
		shortLabelRu: "Автоклав 134°C (5 мин / 2.0 бар)",
		methodType: "steam_autoclave",
		targetTemperatureCelsius: 134,
		minTemperatureCelsius: 134,
		maxTemperatureCelsius: 138,
		targetPressureBar: 2.05,
		minPressureBar: 2.0,
		maxPressureBar: 2.3,
		targetExposureMinutes: 5,
		minExposureMinutes: 5,
		recommendedIndicatorClasses: ["class_4", "class_5", "class_6"],
		sanpinNormClauseRu: "СанПиН 3.3686-21 Таблица 3.12 (Паровой метод, режим 1)",
		descriptionRu: "Стандартный режим паровой стерилизации под избыточным давлением. Подходит для всех металлических, стеклянных и термостойких полимерных инструментов.",
	},
	{
		id: "steam_121_20min",
		nameRu: "Паровой автоклав: 121°C / 20 минут / 1.1–1.2 бар (Щадящий режим для термолабильных изделий)",
		shortLabelRu: "Автоклав 121°C (20 мин / 1.1 бар)",
		methodType: "steam_autoclave",
		targetTemperatureCelsius: 121,
		minTemperatureCelsius: 120,
		maxTemperatureCelsius: 125,
		targetPressureBar: 1.15,
		minPressureBar: 1.05,
		maxPressureBar: 1.3,
		targetExposureMinutes: 20,
		minExposureMinutes: 20,
		recommendedIndicatorClasses: ["class_4", "class_5"],
		sanpinNormClauseRu: "СанПиН 3.3686-21 Таблица 3.12 (Паровой метод, режим 2)",
		descriptionRu: "Щадящий режим для резиновых изделий, латекса, силикона, термолабильных пластмасс и оптических световодов.",
	},
	{
		id: "dry_heat_180_60min",
		nameRu: "Воздушный стерилизатор (Сухожар): 180°C / 60 минут",
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
		recommendedIndicatorClasses: ["class_4", "class_5", "class_6"],
		sanpinNormClauseRu: "СанПиН 3.3686-21 Таблица 3.13 (Воздушный метод)",
		descriptionRu: "Стерилизация сухим горячим воздухом без давления. Применяется для изделий из металлов и стекла, не переносящих увлажнения.",
	},
];

export type PackageSterilityStatus = "valid" | "expiring_soon" | "expired";

export interface PackageExpiryEvaluation {
	readonly packDateIso: string;
	readonly expiryDateIso: string;
	readonly packDateFormatted: string;
	readonly expiryDateFormatted: string;
	readonly shelfLifeDays: number;
	readonly daysRemaining: number;
	readonly status: PackageSterilityStatus;
	readonly statusLabelRu: string;
	readonly statusColorHex: string;
	readonly isExpired: boolean;
	readonly isExpiringSoon: boolean;
	readonly sanpinClause: string;
	readonly recommendationRu: string;
}

export interface ExpiryCalculationOptions {
	readonly shelfLifeDays?: number;
	readonly manufacturerDays?: number;
	readonly referenceDate?: string | Date;
}

/**
 * Получить описание типа упаковки по ее ID
 */
export function getSanpinPackagingTypeDefinition(typeId: SanpinPackagingTypeId): SanpinPackagingTypeDefinition {
	const found = SANPIN_PACKAGING_TYPES.find((t) => t.id === typeId);
	if (found) return found;
	return SANPIN_PACKAGING_TYPES[0]!;
}

/**
 * Расчет нормативного срока сохранения стерильности в днях с валидацией границ
 */
export function calculateSanpinShelfLifeDays(
	packagingType: SanpinPackagingTypeId,
	options?: { manufacturerDays?: number | undefined; customDays?: number | undefined },
): number {
	const def = getSanpinPackagingTypeDefinition(packagingType);

	if (typeof options?.customDays === "number" && options.customDays > 0) {
		return Math.min(Math.max(options.customDays, 1), 365);
	}

	if (typeof options?.manufacturerDays === "number" && options.manufacturerDays > 0) {
		return Math.min(Math.max(options.manufacturerDays, def.minShelfLifeDays), def.maxShelfLifeDays);
	}

	return def.defaultShelfLifeDays;
}

/**
 * Комплексный расчет даты окончания срока годности крафт-пакета по СанПиН 3.3686-21
 */
export function calculatePackageExpiryDate(
	packDateInput: string | Date,
	packagingType: SanpinPackagingTypeId,
	options?: ExpiryCalculationOptions,
): PackageExpiryEvaluation {
	const packDate = typeof packDateInput === "string" ? new Date(packDateInput) : new Date(packDateInput.getTime());
	const refDate = options?.referenceDate
		? typeof options.referenceDate === "string"
			? new Date(options.referenceDate)
			: new Date(options.referenceDate.getTime())
		: new Date();

	const def = getSanpinPackagingTypeDefinition(packagingType);
	const shelfLifeDays = calculateSanpinShelfLifeDays(packagingType, {
		manufacturerDays: options?.manufacturerDays,
		customDays: options?.shelfLifeDays,
	});

	// Расчет даты истечения (добавляем shelfLifeDays календарных дней)
	const expDate = new Date(packDate.getTime());
	expDate.setDate(expDate.getDate() + shelfLifeDays);

	// Вычисляем оставшиеся дни от точки отсчета
	const diffMs = expDate.getTime() - refDate.getTime();
	const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

	let status: PackageSterilityStatus = "valid";
	let statusLabelRu = "Стерильно (Годен)";
	let statusColorHex = "#10b981"; // Зеленый
	let recommendationRu = "Изделие стерильно, готово к безопасному клиническому применению.";

	if (daysRemaining <= 0) {
		status = "expired";
		const overdue = Math.abs(daysRemaining);
		statusLabelRu = overdue === 0 ? "Истекает сегодня (до 23:59)" : `ПРОСРОЧЕНО на ${overdue} дн.`;
		statusColorHex = "#ef4444"; // Красный
		recommendationRu = "ВНИМАНИЕ! Срок стерильности истек. Использование запрещено. Отправить на повторную предстерилизационную очистку (ПСО).";
	} else if (daysRemaining <= 7) {
		status = "expiring_soon";
		statusLabelRu = `Истекает через ${daysRemaining} ${formatDaysRussian(daysRemaining)}`;
		statusColorHex = "#f59e0b"; // Янтарный/желтый
		recommendationRu = "Срок стерильности подходит к концу (менее 7 суток). Рекомендуется использовать в первую очередь.";
	}

	const packDateFormatted = packDate.toISOString().slice(0, 10);
	const expiryDateFormatted = expDate.toISOString().slice(0, 10);

	return {
		packDateIso: packDate.toISOString(),
		expiryDateIso: expDate.toISOString(),
		packDateFormatted,
		expiryDateFormatted,
		shelfLifeDays,
		daysRemaining,
		status,
		statusLabelRu,
		statusColorHex,
		isExpired: status === "expired",
		isExpiringSoon: status === "expiring_soon",
		sanpinClause: def.sanpinClauseRu,
		recommendationRu,
	};
}

/**
 * Склонение слова "день/дня/дней"
 */
export function formatDaysRussian(days: number): string {
	const abs = Math.abs(days);
	const mod10 = abs % 10;
	const mod100 = abs % 100;
	if (mod100 >= 11 && mod100 <= 19) {
		return "дней";
	}
	if (mod10 === 1) {
		return "день";
	}
	if (mod10 >= 2 && mod10 <= 4) {
		return "дня";
	}
	return "дней";
}

export interface SterilizationCycleValidationResult {
	readonly isValid: boolean;
	readonly regime: SterilizationRegimeDefinition;
	readonly actualTempCelsius: number;
	readonly actualPressureBar: number;
	readonly actualExposureMinutes: number;
	readonly tempDeltaCelsius: number;
	readonly pressureDeltaBar: number;
	readonly timeDeltaMinutes: number;
	readonly errors: readonly string[];
	readonly warnings: readonly string[];
	readonly complianceVerdictRu: string;
}

/**
 * Валидация параметров цикла стерилизации по СанПиН 3.3686-21
 */
export function validateSterilizationCycleParameters(
	regimeId: SterilizationRegimeId,
	actualTemp: number,
	actualPressure: number,
	actualTimeMinutes: number,
): SterilizationCycleValidationResult {
	const regime = STERILIZATION_REGIMES.find((r) => r.id === regimeId) || STERILIZATION_REGIMES[0]!;

	const errors: string[] = [];
	const warnings: string[] = [];

	// Проверка температуры
	const tempDeltaCelsius = actualTemp - regime.targetTemperatureCelsius;
	if (actualTemp < regime.minTemperatureCelsius) {
		errors.push(
			`КРИТИЧЕСКИЙ СБОЙ ТЕМПЕРАТУРЫ: факт ${actualTemp}°C ниже минимальной нормы ${regime.minTemperatureCelsius}°C (отклонение ${tempDeltaCelsius.toFixed(1)}°C). Стерильность НЕ гарантирована.`,
		);
	} else if (actualTemp > regime.maxTemperatureCelsius) {
		errors.push(
			`ПРЕВЫШЕНИЕ ТЕМПЕРАТУРЫ: факт ${actualTemp}°C выше допустимого предела ${regime.maxTemperatureCelsius}°C (риск пережигания крафт-бумаги и повреждения инструмента).`,
		);
	}

	// Проверка давления (для паровых автоклавов)
	const pressureDeltaBar = actualPressure - regime.targetPressureBar;
	if (regime.methodType === "steam_autoclave") {
		if (actualPressure < regime.minPressureBar) {
			errors.push(
				`НЕДОСТАТОЧНОЕ ДАВЛЕНИЕ ПАРА: факт ${actualPressure} бар ниже нормы ${regime.minPressureBar} бар (риск ненасыщенного пара / недостаточной вакуумизации).`,
			);
		} else if (actualPressure > regime.maxPressureBar) {
			warnings.push(
				`Превышение давления: факт ${actualPressure} бар (норма ${regime.minPressureBar}–${regime.maxPressureBar} бар). Проверьте калибровку манометра.`,
			);
		}
	}

	// Проверка времени выдержки
	const timeDeltaMinutes = actualTimeMinutes - regime.targetExposureMinutes;
	if (actualTimeMinutes < regime.minExposureMinutes) {
		errors.push(
			`НЕДОСТАТОЧНОЕ ВРЕМЯ СТЕРИЛИЗАЦИИ: выдержка ${actualTimeMinutes} мин вместо минимальных ${regime.minExposureMinutes} мин. Цикл аннулирован.`,
		);
	}

	const isValid = errors.length === 0;
	let complianceVerdictRu = "";
	if (isValid && warnings.length === 0) {
		complianceVerdictRu = `Цикл полностью соответствует нормам ${regime.sanpinNormClauseRu}. Стерилизация подтверждена.`;
	} else if (isValid && warnings.length > 0) {
		complianceVerdictRu = `Параметры укладываются в допуск с предупреждениями: ${warnings.join("; ")}`;
	} else {
		complianceVerdictRu = `БРАК СТЕРИЛИЗАЦИИ: параметры цикла нарушают требования СанПиН 3.3686-21. Все пакеты подлежат повторной ПСО.`;
	}

	return {
		isValid,
		regime,
		actualTempCelsius: actualTemp,
		actualPressureBar: actualPressure,
		actualExposureMinutes: actualTimeMinutes,
		tempDeltaCelsius,
		pressureDeltaBar,
		timeDeltaMinutes,
		errors,
		warnings,
		complianceVerdictRu,
	};
}
