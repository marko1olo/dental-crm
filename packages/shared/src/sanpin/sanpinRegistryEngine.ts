/**
 * ============================================================================
 * SANPIN 3.3686-21 & 2.1.3684-21 DISINFECTION & STERILIZATION REGISTRY ENGINE
 * Цифровой журнал предстерилизационной очистки (ПСО, Форма № 366/у),
 * журнал контроля работы автоклавов и стерилизаторов (Форма № 257/у),
 * учет наработки бактерицидных ламп (Р 3.5.1904-04), генеральные уборки и дезсредства.
 * ============================================================================
 */

import {
	CABINET_READINESS_PRESETS,
	DENTAL_INSTRUMENT_CATEGORIES,
	GENERAL_CLEANING_PRESETS,
	SANPIN_DETERGENTS_CATALOG,
	SANPIN_PSO_CHEMICAL_TESTS,
	UV_RECIRCULATOR_MODELS,
	getCabinetReadinessPreset,
	type CabinetReadinessPreset,
	type DentalAppointmentType,
	type DentalInstrumentCategoryDefinition,
	type GeneralCleaningPresetDefinition,
	type PsoChemicalTestDefinition,
	type PsoChemicalTestId,
	type UvRecirculatorModelDefinition,
} from "./sanpinJournalsPresets.js";

// ─────────────────────────────────────────────────────────────────────────────
// 1. DATA TYPES & INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

export interface PsoJournalRecord {
	readonly id: string;
	readonly timestamp: string; // ISO 8601
	readonly instrumentName: string;
	readonly categoryId: string;
	readonly batchItemCount: number;
	readonly testedSampleCount: number;
	readonly testType: PsoChemicalTestId;
	readonly isAzopyramNegative: boolean; // true = отрицательная (норма), false = положительная (фиолетовое окрашивание / кровь)
	readonly isPhenolphthaleinNegative: boolean; // true = отрицательная (норма), false = положительная (розовое окрашивание / щелочь)
	readonly isSudanNegative: boolean; // true = отрицательная (норма), false = положительная (масло)
	readonly detergentBrand: string;
	readonly isBatchApproved: boolean;
	readonly rejectionReason?: string | undefined;
	readonly operatorStaffFullName: string;
	readonly operatorStaffPosition: string;
	readonly electronicStampVerified: boolean;
	readonly notes?: string | undefined;
}

export type SterilizationRegimeId =
	| "steam_134_5min"
	| "steam_134_20min"
	| "steam_121_20min"
	| "dry_heat_180_60min";

export interface SterilizationRegimeDefinition {
	readonly id: SterilizationRegimeId;
	readonly nameRu: string;
	readonly methodType: "steam_autoclave" | "dry_heat";
	readonly targetTemperatureCelsius: number;
	readonly targetPressureBar: number;
	readonly exposureTimeMinutes: number;
	readonly tempToleranceCelsius: { readonly min: number; readonly max: number };
	readonly pressureToleranceBar: { readonly min: number; readonly max: number };
	readonly recommendedUsageRu: string;
	readonly sanpinStandardClauseRu: string;
}

export const STATUTORY_STERILIZATION_REGIMES: readonly SterilizationRegimeDefinition[] = [
	{
		id: "steam_134_5min",
		nameRu: "Паровой 134°C / 5 мин (2.0-2.2 атм / бар) — Скоростной B-класс",
		methodType: "steam_autoclave",
		targetTemperatureCelsius: 134,
		targetPressureBar: 2.1,
		exposureTimeMinutes: 5,
		tempToleranceCelsius: { min: 134, max: 138 },
		pressureToleranceBar: { min: 2.0, max: 2.3 },
		recommendedUsageRu: "Текстиль, металлический инструмент в одинарных крафт-пакетах, турбинные наконечники",
		sanpinStandardClauseRu: "СанПиН 3.3686-21 п. 3624 (Таблица 3.13) / Режим I",
	},
	{
		id: "steam_134_20min",
		nameRu: "Паровой 134°C / 20 мин (2.0-2.2 атм / бар) — Стандартный хирургический",
		methodType: "steam_autoclave",
		targetTemperatureCelsius: 134,
		targetPressureBar: 2.1,
		exposureTimeMinutes: 20,
		tempToleranceCelsius: { min: 134, max: 138 },
		pressureToleranceBar: { min: 2.0, max: 2.3 },
		recommendedUsageRu: "Хирургические и имплантологические наборы в двойных пакетах и биксах КСПФ",
		sanpinStandardClauseRu: "СанПиН 3.3686-21 п. 3624 / Режим I усиленный",
	},
	{
		id: "steam_121_20min",
		nameRu: "Паровой 121°C / 20 мин (1.1 атм / бар) — Щадящий для термолабильных изделий",
		methodType: "steam_autoclave",
		targetTemperatureCelsius: 121,
		targetPressureBar: 1.1,
		exposureTimeMinutes: 20,
		tempToleranceCelsius: { min: 120, max: 124 },
		pressureToleranceBar: { min: 1.0, max: 1.3 },
		recommendedUsageRu: "Изделия из резины, термостойких полимеров, латекса, оптоволоконные световоды",
		sanpinStandardClauseRu: "СанПиН 3.3686-21 п. 3624 (Таблица 3.13) / Режим II",
	},
	{
		id: "dry_heat_180_60min",
		nameRu: "Воздушный (Сухожаровой) 180°C / 60 мин",
		methodType: "dry_heat",
		targetTemperatureCelsius: 180,
		targetPressureBar: 0,
		exposureTimeMinutes: 60,
		tempToleranceCelsius: { min: 180, max: 185 },
		pressureToleranceBar: { min: 0, max: 0 },
		recommendedUsageRu: "Цельнометаллические боры, щипцы, элеваторы без оптических элементов",
		sanpinStandardClauseRu: "СанПиН 3.3686-21 п. 3626 (Воздушный метод стерилизации)",
	},
];

export interface ChamberControlPointDefinition {
	readonly pointIndex: 1 | 2 | 3 | 4 | 5;
	readonly code: string;
	readonly nameRu: string;
	readonly locationDescriptionRu: string;
}

export const STATUTORY_CHAMBER_5_POINTS: readonly ChamberControlPointDefinition[] = [
	{
		pointIndex: 1,
		code: "КТ-1",
		nameRu: "Верхний передний правый угол",
		locationDescriptionRu: "Верхняя полка у дверцы камеры автоклава",
	},
	{
		pointIndex: 2,
		code: "КТ-2",
		nameRu: "Нижний задний левый угол",
		locationDescriptionRu: "Нижняя полка у задней стенки (наиболее холодная зона)",
	},
	{
		pointIndex: 3,
		code: "КТ-3",
		nameRu: "Геометрический центр камеры",
		locationDescriptionRu: "Центральная полка в толще стерилизуемой загрузки",
	},
	{
		pointIndex: 4,
		code: "КТ-4",
		nameRu: "Зона выхода конденсата / дренаж",
		locationDescriptionRu: "Нижняя точка камеры у сливного патрубка",
	},
	{
		pointIndex: 5,
		code: "КТ-5",
		nameRu: "Верхняя задняя зона",
		locationDescriptionRu: "Верхняя полка у датчика температуры автоклава",
	},
];

export interface ChamberPointEvaluation {
	readonly pointIndex: 1 | 2 | 3 | 4 | 5;
	readonly code: string;
	readonly nameRu: string;
	readonly indicatorId: string;
	readonly indicatorTradeNameRu: string;
	readonly status: "passed" | "failed" | "untested";
	readonly initialColorRu: string;
	readonly actualColorRu: string;
	readonly notes?: string | undefined;
}

export interface PhysicalSensorsData {
	readonly actualTemperatureCelsius: number;
	readonly actualPressureBar: number;
	readonly actualExposureMinutes: number;
}

export interface SterilizationCycleCompliance {
	readonly isCompliant: boolean;
	readonly isTempCompliant: boolean;
	readonly isPressureCompliant: boolean;
	readonly isTimeCompliant: boolean;
	readonly tempDelta: number;
	readonly pressureDelta: number;
	readonly timeDelta: number;
	readonly failureReasons: readonly string[];
}

export interface BiologicalControlTestRecord {
	readonly id: string;
	readonly sterilizerId: string;
	readonly sterilizerCode: string;
	readonly datePlaced: string;
	readonly dateReadout: string;
	readonly bioIndicatorId: string;
	readonly sporeCultureNameRu: string;
	readonly lotNumber: string;
	readonly incubationHours: number;
	readonly incubationTempCelsius: number;
	readonly testPointIndex: 1 | 2 | 3 | 4 | 5;
	readonly result: "sterile_passed" | "growth_failed" | "pending";
	readonly laboratoryName: string;
	readonly protocolNumber: string;
	readonly responsibleSpecialistFullName: string;
	readonly notes?: string | undefined;
}

export interface Form257Record {
	readonly id: string;
	readonly date: string; // YYYY-MM-DD
	readonly cycleNumber: number;
	readonly sterilizerId: string;
	readonly sterilizerCode: string;
	readonly sterilizerBrandModel: string;
	readonly sterilizerSerialNumber: string;
	readonly regimeId: SterilizationRegimeId;
	readonly regimeNameRu: string;
	readonly targetTemperatureCelsius: number;
	readonly targetPressureBar: number;
	readonly targetExposureMinutes: number;
	readonly actualTemperatureCelsius: number;
	readonly actualPressureBar: number;
	readonly actualExposureMinutes: number;
	readonly itemsDescriptionRu: string;
	readonly packsCount: number;
	readonly packagingType: string;
	readonly packagingNameRu: string;
	readonly shelfLifeDays: number;
	readonly chamberPoints: readonly ChamberPointEvaluation[];
	readonly areAllPointsPassed: boolean;
	readonly chemicalIndicatorNameRu: string;
	readonly bioTestId?: string | undefined;
	readonly bioTestResult?: "sterile_passed" | "growth_failed" | "pending" | undefined;
	readonly isCyclePassed: boolean;
	readonly status: "sterile_passed" | "rejected_defect" | "quarantine";
	readonly rejectionReason?: string | undefined;
	readonly operatorStaffFullName: string;
	readonly operatorStaffPosition: string;
	readonly headNurseSignatureFullName?: string | undefined;
	readonly isHeadNurseVerified: boolean;
	readonly verificationTimestamp?: string | undefined;
	readonly digitalStampHash: string;
	readonly notes?: string | undefined;
	readonly createdAt: string;
}

export interface BactericidalEquipmentRecord {
	readonly id: string;
	readonly roomName: string;
	readonly roomVolumeM3: number;
	readonly deviceBrand: string;
	readonly serialNumber: string;
	readonly deviceType: "recirculator_closed" | "irradiator_open" | "combined";
	readonly lampType: string;
	readonly lampCount: number;
	readonly maxLampHours: number;
	readonly totalOperatingHours: number;
	readonly remainingLampHours: number;
	readonly remainingLampPercent: number;
	readonly lampStatus: "normal" | "warning_replace_soon" | "expired_replace_now";
	readonly isLampCritical: boolean;
	readonly lastLampReplacementDate?: string | undefined;
	readonly notes?: string | undefined;
}

export interface BactericidalSessionRecord {
	readonly id: string;
	readonly equipmentId: string;
	readonly date: string;
	readonly sessionStartTime: string;
	readonly sessionEndTime: string;
	readonly durationMinutes: number;
	readonly durationHours: number;
	readonly operatingMode: "continuous_presence" | "pre_op_preparation" | "post_cleaning" | "intermittent";
	readonly cumulativeHoursAfterSession: number;
	readonly roomName: string;
	readonly deviceBrand: string;
	readonly operatorStaffFullName: string;
	readonly notes?: string | undefined;
}

export interface GeneralCleaningJournalRecord {
	readonly id: string;
	readonly roomType: "surgical" | "therapeutic" | "cso_sterile" | "xray" | "utility";
	readonly roomName: string;
	readonly scheduledDate: string;
	readonly actualDateTime: string;
	readonly treatedAreaM2: number;
	readonly disinfectantName: string;
	readonly activeIngredient: string;
	readonly solutionConcentrationPercent: number;
	readonly applicationMethodRu: string;
	readonly exposureTimeMinutes: number;
	readonly uvIrradiationMinutes: number;
	readonly ventilationMinutes: number;
	readonly operatorStaffFullName: string;
	readonly inspectorStaffFullName?: string | undefined;
	readonly isInspectorVerified: boolean;
	readonly status: "completed" | "verified_by_inspector" | "rescheduled";
	readonly notes?: string | undefined;
}

export interface DisinfectantJournalRecord {
	readonly id: string;
	readonly timestamp: string;
	readonly operationType: "receipt" | "consumption";
	readonly tradeName: string;
	readonly amount: number;
	readonly unit: "л" | "кг";
	readonly invoiceOrObjectInfo: string;
	readonly batchOrExpirationDate?: string | undefined;
	readonly solutionPreparedLiters?: number | undefined;
	readonly concentrationPercent?: number | undefined;
	readonly isConcentrationNormal?: boolean | undefined;
	readonly resultingStockBalance: number;
	readonly operatorStaffFullName: string;
	readonly notes?: string | undefined;
}

export interface ClinicLegalInfo {
	readonly name: string;
	readonly ogrn: string;
	readonly inn: string;
	readonly address: string;
	readonly chiefDoctor: string;
	readonly headNurse: string;
	readonly licenseNumber?: string | undefined;
	readonly volumeNumber?: number | string | undefined;
}

export const DEFAULT_CLINIC_LEGAL: ClinicLegalInfo = {
	name: "ООО «Стоматологическая клиника ДЕНТЕ»",
	ogrn: "1027700123456",
	inn: "7701234567",
	address: "г. Москва, ул. Клиническая, д. 10",
	chiefDoctor: "Смирнов А. В.",
	headNurse: "Иванова М. П.",
	licenseNumber: "№ ЛО41-01137-77/00368421",
	volumeNumber: 1,
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. PSO SAMPLING & AZOPYRAM EVALUATION MATH (ФОРМА № 366/у)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Расчет минимального объема выборки по СанПиН 3.3686-21:
 * Норма: 1% от одновременно обработанной партии, но не менее 3–5 единиц каждого наименования.
 */
export function calculatePsoSampleRequirements(
	batchCount: number,
	isCriticalSurgical = false,
): {
	readonly minSampleCount: number;
	readonly formulaDescriptionRu: string;
	readonly ruleRefRu: string;
} {
	const count = Math.max(1, Math.floor(Number(batchCount) || 1));
	const absoluteMin = isCriticalSurgical ? 5 : 3;
	const onePercent = Math.ceil(count * 0.01);
	const minSampleCount = Math.max(absoluteMin, onePercent);

	return {
		minSampleCount,
		formulaDescriptionRu: `max(${absoluteMin}, ceil(${count} × 1%)) = ${minSampleCount} шт.`,
		ruleRefRu: "СанПиН 3.3686-21 п. 3584: 1% от партии изделий, не менее 3–5 единиц каждого наименования",
	};
}

/**
 * Валидация результатов химических проб ПСО (Азопирам, Фенолфталеин, Судан III).
 * - Азопирам: выявление скрытой крови (гемоглобина). Отрицательная — норма. Положительная (фиолетовое окрашивание) — брак.
 * - Фенолфталеин: выявление щелочных моющих средств. Отрицательная — норма. Положительная (розовое окрашивание) — брак.
 * - Судан III: выявление масляных загрязнений.
 */
export function evaluatePsoTrialResult(params: {
	batchCount: number;
	testedSampleCount: number;
	isAzopyramNegative: boolean;
	isPhenolphthaleinNegative: boolean;
	isSudanNegative?: boolean | undefined;
	isCriticalSurgical?: boolean | undefined;
}): {
	readonly isBatchApproved: boolean;
	readonly minSampleRequired: number;
	readonly samplingSatisfied: boolean;
	readonly rejectionReason: string | null;
	readonly complianceNoteRu: string;
} {
	const { minSampleCount } = calculatePsoSampleRequirements(params.batchCount, params.isCriticalSurgical);
	const samplingSatisfied = params.testedSampleCount >= minSampleCount;

	if (!samplingSatisfied) {
		return {
			isBatchApproved: false,
			minSampleRequired: minSampleCount,
			samplingSatisfied: false,
			rejectionReason: `Недостаточный объем выборки ПСО: проверено ${params.testedSampleCount} шт. из минимум ${minSampleCount} шт. (норма 1% по СанПиН 3.3686-21).`,
			complianceNoteRu: "Отказ: нарушение минимального объема выборочного контроля",
		};
	}

	if (!params.isAzopyramNegative) {
		return {
			isBatchApproved: false,
			minSampleRequired: minSampleCount,
			samplingSatisfied: true,
			rejectionReason:
				"БРАК: Положительная азопирамовая проба (фиолетово-синее окрашивание — обнаружена скрытая кровь / гемоглобин). Вся партия подлежит повторной дезинфекции и предстерилизационной очистке!",
			complianceNoteRu: "Брак ПСО: обнаружены следы крови (положительный азопирам)",
		};
	}

	if (!params.isPhenolphthaleinNegative) {
		return {
			isBatchApproved: false,
			minSampleRequired: minSampleCount,
			samplingSatisfied: true,
			rejectionReason:
				"БРАК: Положительная фенолфталеиновая проба (розово-малиновое окрашивание — остатки щелочных компонентов моющих средств). Вся партия подлежит повторному ополаскиванию дистиллированной водой!",
			complianceNoteRu: "Брак ПСО: обнаружены остатки моющего средства (положительный фенолфталеин)",
		};
	}

	if (params.isSudanNegative === false) {
		return {
			isBatchApproved: false,
			minSampleRequired: minSampleCount,
			samplingSatisfied: true,
			rejectionReason:
				"БРАК: Положительная проба с Суданом III (масляные/жировые загрязнения наконечников). Партия направляется на повторное обезжиривание!",
			complianceNoteRu: "Брак ПСО: обнаружены масляные загрязнения (положительный Судан III)",
		};
	}

	return {
		isBatchApproved: true,
		minSampleRequired: minSampleCount,
		samplingSatisfied: true,
		rejectionReason: null,
		complianceNoteRu: "Партия полностью соответствует СанПиН 3.3686-21 и допущена к автоклавированию / стерилизации",
	};
}

export function generatePsoRecordId(
	dateStr: string = new Date().toISOString().slice(0, 10),
	seq: number = Math.floor(100 + Math.random() * 900),
): string {
	const cleanDate = dateStr.replace(/[^0-9]/g, "").slice(0, 8);
	return `PSO-${cleanDate}-${seq.toString().padStart(4, "0")}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. AUTOCLAVE OPERATION CONTROL JOURNAL ENGINE (ФОРМА № 257/у)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Проверка физических параметров цикла стерилизации:
 * - 134°C / 2.0-2.2 атм / 5 мин (или 20 мин)
 * - 121°C / 1.1 атм / 20 мин
 * - 180°C / 60 мин (сухожар)
 */
export function evaluateCycleParameters(
	regimeId: SterilizationRegimeId,
	sensors: PhysicalSensorsData,
): SterilizationCycleCompliance {
	const regime = STATUTORY_STERILIZATION_REGIMES.find((r) => r.id === regimeId) || STATUTORY_STERILIZATION_REGIMES[0]!;
	const failureReasons: string[] = [];

	// Температура
	const isTempCompliant =
		sensors.actualTemperatureCelsius >= regime.tempToleranceCelsius.min &&
		sensors.actualTemperatureCelsius <= regime.tempToleranceCelsius.max;
	const tempDelta = Number((sensors.actualTemperatureCelsius - regime.targetTemperatureCelsius).toFixed(1));
	if (!isTempCompliant) {
		failureReasons.push(
			`Температура вне нормы: ${sensors.actualTemperatureCelsius}°C (норма ${regime.tempToleranceCelsius.min}–${regime.tempToleranceCelsius.max}°C, отклонение ${tempDelta > 0 ? `+${tempDelta}` : tempDelta}°C)`,
		);
	}

	// Давление
	let isPressureCompliant = true;
	let pressureDelta = 0;
	if (regime.methodType === "steam_autoclave") {
		isPressureCompliant =
			sensors.actualPressureBar >= regime.pressureToleranceBar.min &&
			sensors.actualPressureBar <= regime.pressureToleranceBar.max;
		pressureDelta = Number((sensors.actualPressureBar - regime.targetPressureBar).toFixed(2));
		if (!isPressureCompliant) {
			failureReasons.push(
				`Давление пара вне нормы: ${sensors.actualPressureBar} атм/бар (норма ${regime.pressureToleranceBar.min}–${regime.pressureToleranceBar.max} атм, отклонение ${pressureDelta > 0 ? `+${pressureDelta}` : pressureDelta} атм)`,
			);
		}
	}

	// Время экспозиции
	const isTimeCompliant = sensors.actualExposureMinutes >= regime.exposureTimeMinutes;
	const timeDelta = Number((sensors.actualExposureMinutes - regime.exposureTimeMinutes).toFixed(1));
	if (!isTimeCompliant) {
		failureReasons.push(
			`Недостаточная экспозиция: ${sensors.actualExposureMinutes} мин (требуется не менее ${regime.exposureTimeMinutes} мин)`,
		);
	}

	const isCompliant = isTempCompliant && isPressureCompliant && isTimeCompliant;

	return {
		isCompliant,
		isTempCompliant,
		isPressureCompliant,
		isTimeCompliant,
		tempDelta,
		pressureDelta,
		timeDelta,
		failureReasons,
	};
}

/**
 * Оценка результатов химических индикаторов (Интеграл, Медтест, Винар) во всех 5 контрольных точках камеры.
 */
export function evaluate5ChamberPoints(
	points: readonly ChamberPointEvaluation[],
): {
	readonly areAllPointsPassed: boolean;
	readonly passedPointsCount: number;
	readonly failedPointsCount: number;
	readonly failedPointIndices: readonly number[];
	readonly summaryRu: string;
} {
	if (points.length === 0) {
		return {
			areAllPointsPassed: false,
			passedPointsCount: 0,
			failedPointsCount: 0,
			failedPointIndices: [1, 2, 3, 4, 5],
			summaryRu: "Контрольные точки камеры не протестированы",
		};
	}

	const failedIndices: number[] = [];
	let passedCount = 0;

	for (const pt of points) {
		if (pt.status === "passed") {
			passedCount++;
		} else {
			failedIndices.push(pt.pointIndex);
		}
	}

	const areAllPointsPassed = points.length === 5 && passedCount === 5;
	const failedPointsCount = points.length - passedCount;

	let summaryRu = "Все 5 контрольных точек: СТЕРИЛЬНО (100% переход индикаторов Интеграл/Медтест)";
	if (!areAllPointsPassed) {
		if (failedIndices.length > 0) {
			summaryRu = `БРАК СТЕРИЛИЗАЦИИ: Индикаторы не сработали в точках: ${failedIndices.map((i) => `КТ-${i}`).join(", ")}`;
		} else {
			summaryRu = `БРАК СТЕРИЛИЗАЦИИ: Проверено только ${points.length} из 5 обязательных точек`;
		}
	}

	return {
		areAllPointsPassed,
		passedPointsCount: passedCount,
		failedPointsCount,
		failedPointIndices: failedIndices,
		summaryRu,
	};
}

export function createDefault5ChamberPoints(
	indicatorTradeNameRu = "Интеграл-134 (Класс 5)",
	allPassed = true,
): ChamberPointEvaluation[] {
	return STATUTORY_CHAMBER_5_POINTS.map((pt) => ({
		pointIndex: pt.pointIndex,
		code: pt.code,
		nameRu: pt.nameRu,
		indicatorId: "vinar_intetest_5",
		indicatorTradeNameRu,
		status: allPassed ? "passed" : "failed",
		initialColorRu: "Сине-зеленый",
		actualColorRu: allPassed ? "Темно-коричневый" : "Неполный переход",
		notes: allPassed ? "Смена цвета соответствует эталону" : "Недостаточное изменение цвета",
	}));
}

export function generateForm257RecordId(date: string, cycleNumber: number, sterilizerCode: string): string {
	const cleanDate = date.replace(/[^0-9]/g, "").slice(0, 8);
	const paddedCycle = String(cycleNumber).padStart(2, "0");
	const cleanCode = sterilizerCode.replace(/[^a-zA-Z0-9а-яА-ЯёЁ]/g, "").toUpperCase();
	return `F257-${cleanDate}-${cleanCode}-C${paddedCycle}`;
}

export function calculateDigitalStampHash(data: {
	id: string;
	date: string;
	cycleNumber: number;
	sterilizerCode: string;
	actualTemp: number;
	actualPressure: number;
	actualTime: number;
	isPassed: boolean;
	operatorName: string;
}): string {
	const raw = `${data.id}|${data.date}|${data.cycleNumber}|${data.sterilizerCode}|${data.actualTemp}|${data.actualPressure}|${data.actualTime}|${data.isPassed}|${data.operatorName}`;
	let hash = 0x811c9dc5;
	for (let i = 0; i < raw.length; i++) {
		hash ^= raw.charCodeAt(i);
		hash = Math.imul(hash, 0x01000193);
	}
	const hex = (hash >>> 0).toString(16).padStart(8, "0").toUpperCase();
	return `DENTE-CSO-257-${hex}`;
}

export function createForm257Record(params: {
	date: string;
	cycleNumber: number;
	sterilizerId: string;
	sterilizerCode?: string | undefined;
	sterilizerBrandModel?: string | undefined;
	sterilizerSerialNumber?: string | undefined;
	regimeId: SterilizationRegimeId;
	sensors: PhysicalSensorsData;
	itemsDescriptionRu: string;
	packsCount: number;
	packagingType?: string | undefined;
	packagingNameRu?: string | undefined;
	shelfLifeDays?: number | undefined;
	chamberPoints: readonly ChamberPointEvaluation[];
	operatorStaffFullName: string;
	operatorStaffPosition?: string | undefined;
	headNurseSignatureFullName?: string | undefined;
	isHeadNurseVerified?: boolean | undefined;
	bioTestId?: string | undefined;
	bioTestResult?: "sterile_passed" | "growth_failed" | "pending" | undefined;
	notes?: string | undefined;
}): Form257Record {
	const regime = STATUTORY_STERILIZATION_REGIMES.find((r) => r.id === params.regimeId) || STATUTORY_STERILIZATION_REGIMES[0]!;
	const cycleCompliance = evaluateCycleParameters(regime.id, params.sensors);
	const pointsEvaluation = evaluate5ChamberPoints(params.chamberPoints);

	const isCyclePassed = cycleCompliance.isCompliant && pointsEvaluation.areAllPointsPassed;
	const failureReasons: string[] = [...cycleCompliance.failureReasons];
	if (!pointsEvaluation.areAllPointsPassed) {
		failureReasons.push(pointsEvaluation.summaryRu);
	}

	const status = isCyclePassed ? "sterile_passed" : "rejected_defect";
	const rejectionReason = failureReasons.length > 0 ? failureReasons.join("; ") : undefined;
	const sterilizerCode = params.sterilizerCode || "АК-01";

	const id = generateForm257RecordId(params.date, params.cycleNumber, sterilizerCode);
	const digitalStampHash = calculateDigitalStampHash({
		id,
		date: params.date,
		cycleNumber: params.cycleNumber,
		sterilizerCode,
		actualTemp: params.sensors.actualTemperatureCelsius,
		actualPressure: params.sensors.actualPressureBar,
		actualTime: params.sensors.actualExposureMinutes,
		isPassed: isCyclePassed,
		operatorName: params.operatorStaffFullName,
	});

	const chemicalIndName = params.chamberPoints[0]?.indicatorTradeNameRu || "Интеграл-134 (Класс 5)";

	return {
		id,
		date: params.date,
		cycleNumber: params.cycleNumber,
		sterilizerId: params.sterilizerId,
		sterilizerCode,
		sterilizerBrandModel: params.sterilizerBrandModel || "Melag Vacuklav 23B+",
		sterilizerSerialNumber: params.sterilizerSerialNumber || "VK-2024-8841",
		regimeId: regime.id,
		regimeNameRu: regime.nameRu,
		targetTemperatureCelsius: regime.targetTemperatureCelsius,
		targetPressureBar: regime.targetPressureBar,
		targetExposureMinutes: regime.exposureTimeMinutes,
		actualTemperatureCelsius: params.sensors.actualTemperatureCelsius,
		actualPressureBar: params.sensors.actualPressureBar,
		actualExposureMinutes: params.sensors.actualExposureMinutes,
		itemsDescriptionRu: params.itemsDescriptionRu,
		packsCount: params.packsCount,
		packagingType: params.packagingType || "kraft_self_adhesive",
		packagingNameRu: params.packagingNameRu || "Крафт-пакет самоклеящийся (50 сут.)",
		shelfLifeDays: params.shelfLifeDays || 50,
		chamberPoints: params.chamberPoints,
		areAllPointsPassed: pointsEvaluation.areAllPointsPassed,
		chemicalIndicatorNameRu: chemicalIndName,
		bioTestId: params.bioTestId,
		bioTestResult: params.bioTestResult,
		isCyclePassed,
		status,
		rejectionReason,
		operatorStaffFullName: params.operatorStaffFullName,
		operatorStaffPosition: params.operatorStaffPosition || "Медсестра ЦСО",
		headNurseSignatureFullName: params.headNurseSignatureFullName,
		isHeadNurseVerified: Boolean(params.isHeadNurseVerified),
		verificationTimestamp: params.isHeadNurseVerified ? new Date().toISOString() : undefined,
		digitalStampHash,
		notes: params.notes,
		createdAt: new Date().toISOString(),
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. BACTERICIDAL LAMP HOURS & FLEET ENGINE (Р 3.5.1904-04)
// ─────────────────────────────────────────────────────────────────────────────

export function calculateLampOperatingHours(
	currentOperatingHours: number,
	sessionDurationMinutes: number,
	maxHours = 8000,
): {
	readonly sessionHours: number;
	readonly cumulativeHoursAfterSession: number;
	readonly remainingHours: number;
	readonly remainingPercent: number;
	readonly lampStatus: "normal" | "warning_replace_soon" | "expired_replace_now";
	readonly isCritical: boolean;
	readonly warningMessage: string | null;
} {
	const curHours = Math.max(0, Number(currentOperatingHours) || 0);
	const durationMin = Math.max(0, Number(sessionDurationMinutes) || 0);
	const sessionHours = Math.round((durationMin / 60) * 100) / 100;
	const cumulativeHoursAfterSession = Math.round((curHours + sessionHours) * 100) / 100;

	const remainingHours = Math.max(0, Math.round((maxHours - cumulativeHoursAfterSession) * 100) / 100);
	const remainingPercent = Number(
		Math.max(0, Math.min(100, (remainingHours / maxHours) * 100)).toFixed(1),
	);

	if (cumulativeHoursAfterSession >= maxHours) {
		return {
			sessionHours,
			cumulativeHoursAfterSession,
			remainingHours: 0,
			remainingPercent: 0,
			lampStatus: "expired_replace_now",
			isCritical: true,
			warningMessage: `РЕСУРС ЛАМП ПОЛНОСТЬЮ ИСЧЕРПАН (${cumulativeHoursAfterSession}/${maxHours} ч). Эксплуатация облучателя запрещена СанПиН 3.3686-21 / Р 3.5.1904-04! Бактерицидный поток УФ-излучения упал ниже нормы. Требуется немедленная замена ламп!`,
		};
	}

	if (cumulativeHoursAfterSession >= maxHours * 0.9) {
		return {
			sessionHours,
			cumulativeHoursAfterSession,
			remainingHours,
			remainingPercent,
			lampStatus: "warning_replace_soon",
			isCritical: false,
			warningMessage: `Предупреждение: выработано ${cumulativeHoursAfterSession} ч из ${maxHours} ч (${remainingPercent}% остатка). Запланируйте закупку и замену бактерицидных ламп.`,
		};
	}

	return {
		sessionHours,
		cumulativeHoursAfterSession,
		remainingHours,
		remainingPercent,
		lampStatus: "normal",
		isCritical: false,
		warningMessage: null,
	};
}

export function calculateAirDecontaminationDuration(
	roomVolumeM3: number,
	productivityM3PerHour: number,
	targetEfficiencyPercent: 95 | 99 | 99.9 = 99,
): {
	readonly requiredDurationMinutes: number;
	readonly recommendedDurationMinutes: number;
	readonly airExchangesCount: number;
	readonly formulaExplanationRu: string;
} {
	const vol = Math.max(1, Number(roomVolumeM3) || 1);
	const prod = Math.max(1, Number(productivityM3PerHour) || 1);

	let k = 4.6;
	if (targetEfficiencyPercent === 95) k = 2.3;
	if (targetEfficiencyPercent === 99.9) k = 6.9;

	const exactMinutes = (k * vol / prod) * 60;
	const requiredDurationMinutes = Math.ceil(exactMinutes);
	const recommendedDurationMinutes = Math.max(15, Math.ceil(requiredDurationMinutes / 15) * 15);

	return {
		requiredDurationMinutes,
		recommendedDurationMinutes,
		airExchangesCount: k,
		formulaExplanationRu: `T = (${k} × ${vol} м³ / ${prod} м³/ч) × 60 = ${requiredDurationMinutes} мин (рекомендовано ${recommendedDurationMinutes} мин)`,
	};
}

export function evaluateLampFleetHealth(
	equipments: readonly {
		id: string;
		deviceBrand: string;
		roomName: string;
		totalOperatingHours: number;
		maxLampHours: number;
	}[],
): {
	readonly totalEquipments: number;
	readonly normalCount: number;
	readonly warningCount: number;
	readonly expiredCount: number;
	readonly overallHealthStatus: "optimal" | "attention_needed" | "critical_violation";
	readonly summaryMessageRu: string;
} {
	const totalEquipments = equipments.length;
	let normalCount = 0;
	let warningCount = 0;
	let expiredCount = 0;

	for (const eq of equipments) {
		const res = calculateLampOperatingHours(eq.totalOperatingHours, 0, eq.maxLampHours);
		if (res.lampStatus === "expired_replace_now") expiredCount++;
		else if (res.lampStatus === "warning_replace_soon") warningCount++;
		else normalCount++;
	}

	let overallHealthStatus: "optimal" | "attention_needed" | "critical_violation" = "optimal";
	let summaryMessageRu = "Все бактерицидные установки работают в штатном режиме (ресурс ламп в норме)";

	if (expiredCount > 0) {
		overallHealthStatus = "critical_violation";
		summaryMessageRu = `КРИТИЧЕСКОЕ НАРУШЕНИЕ: ${expiredCount} облучателя имеют исчерпанный ресурс ламп (>100%). Необходима немедленная замена!`;
	} else if (warningCount > 0) {
		overallHealthStatus = "attention_needed";
		summaryMessageRu = `Внимание: ${warningCount} облучателя приближаются к лимиту наработки (>90% ресурса). Запланируйте закупку ламп.`;
	}

	return {
		totalEquipments,
		normalCount,
		warningCount,
		expiredCount,
		overallHealthStatus,
		summaryMessageRu,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. GENERAL CLEANING SCHEDULE & COMPLIANCE
// ─────────────────────────────────────────────────────────────────────────────

export function calculateNextGeneralCleaningDate(
	lastCleaningDate: string,
	roomType: "surgical" | "therapeutic" | "cso_sterile" | "xray" | "utility" = "therapeutic",
): string {
	const baseDate = new Date(lastCleaningDate);
	if (Number.isNaN(baseDate.getTime())) {
		const d = new Date();
		d.setDate(d.getDate() + 7);
		return d.toISOString().slice(0, 10);
	}

	const preset = GENERAL_CLEANING_PRESETS.find((p) => p.roomType === roomType);
	const intervalDays = preset?.statutoryFrequencyDays || 7;

	const nextDate = new Date(baseDate.getTime() + intervalDays * 24 * 60 * 60 * 1000);
	return nextDate.toISOString().slice(0, 10);
}

export function validateCleaningScheduleCompliance(
	scheduledDate: string,
	actualDateTime: string,
	roomType: "surgical" | "therapeutic" | "cso_sterile" | "xray" | "utility" = "therapeutic",
): {
	readonly isCompliant: boolean;
	readonly daysDifference: number;
	readonly status: "on_schedule" | "early" | "overdue" | "critical_overdue";
	readonly statusMessageRu: string;
} {
	const sched = new Date(scheduledDate).getTime();
	const actual = new Date(actualDateTime).getTime();

	if (Number.isNaN(sched) || Number.isNaN(actual)) {
		return {
			isCompliant: false,
			daysDifference: 0,
			status: "on_schedule",
			statusMessageRu: "Некорректная дата уборки",
		};
	}

	const diffDays = Math.round((actual - sched) / (1000 * 60 * 60 * 24));

	if (diffDays <= 0) {
		return {
			isCompliant: true,
			daysDifference: diffDays,
			status: diffDays === 0 ? "on_schedule" : "early",
			statusMessageRu: diffDays === 0 ? "Уборка выполнена строго по графику" : `Уборка выполнена досрочно (на ${Math.abs(diffDays)} дн. раньше плана)`,
		};
	}

	if (diffDays <= 2) {
		return {
			isCompliant: false,
			daysDifference: diffDays,
			status: "overdue",
			statusMessageRu: `Внимание: генеральная уборка просрочена на ${diffDays} дн. (требование СанПиН: 1 раз в 7 дней)`,
		};
	}

	return {
		isCompliant: false,
		daysDifference: diffDays,
		status: "critical_overdue",
		statusMessageRu: `КРИТИЧЕСКАЯ ПРОСРОЧКА: генеральная уборка просрочена на ${diffDays} дн.! Нарушение санитарно-эпидемиологического режима.`,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. DISINFECTANT SOLUTION MATH
// ─────────────────────────────────────────────────────────────────────────────

export function calculateDisinfectantSolutionMath(
	concentrateLiters: number,
	targetConcentrationPercent: number,
): {
	readonly solutionVolumeLiters: number;
	readonly waterVolumeLiters: number;
	readonly activeAgentVolumeLiters: number;
	readonly formulaRu: string;
} {
	const conc = Math.max(0.001, Number(concentrateLiters) || 0);
	const targetPct = Math.max(0.01, Number(targetConcentrationPercent) || 0.01);

	const solutionVolumeLiters = Math.round((conc / (targetPct / 100)) * 100) / 100;
	const waterVolumeLiters = Math.round(Math.max(0, solutionVolumeLiters - conc) * 100) / 100;
	const activeAgentVolumeLiters = Math.round(conc * 100) / 100;

	return {
		solutionVolumeLiters,
		waterVolumeLiters,
		activeAgentVolumeLiters,
		formulaRu: `${conc} л концентрата + ${waterVolumeLiters} л воды = ${solutionVolumeLiters} л ${targetPct}% рабочего раствора`,
	};
}

export function calculateRequiredConcentrateForVolume(
	desiredSolutionVolumeLiters: number,
	targetConcentrationPercent: number,
): {
	readonly concentrateLiters: number;
	readonly concentrateMilliliters: number;
	readonly waterLiters: number;
	readonly formulaRu: string;
} {
	const vol = Math.max(0.1, Number(desiredSolutionVolumeLiters) || 0);
	const targetPct = Math.max(0.01, Number(targetConcentrationPercent) || 0.01);

	const concentrateLiters = Math.round((vol * (targetPct / 100)) * 1000) / 1000;
	const concentrateMilliliters = Math.round(concentrateLiters * 1000);
	const waterLiters = Math.round((vol - concentrateLiters) * 1000) / 1000;

	return {
		concentrateLiters,
		concentrateMilliliters,
		waterLiters,
		formulaRu: `Для приготовления ${vol} л ${targetPct}% раствора: ${concentrateMilliliters} мл концентрата + ${waterLiters} л воды`,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. 1-CLICK EXPORT / PRINT GENERATORS (ROSPOTREBNADZOR INSPECTION READY)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 1-клик генерация официального печатного макета Журнала ПСО (Форма № 366/у)
 */
export function generatePsoJournalPrintHtml(params: {
	records: readonly PsoJournalRecord[];
	clinicInfo?: ClinicLegalInfo | undefined;
	dateRange?: { from: string; to: string } | undefined;
}): string {
	const clinic = params.clinicInfo || DEFAULT_CLINIC_LEGAL;
	const range = params.dateRange
		? `Период: с ${params.dateRange.from} по ${params.dateRange.to}`
		: `Дата формирования: ${new Date().toLocaleDateString("ru-RU")}`;

	const rowsHtml = params.records
		.map((r, i) => {
			return `<tr>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${i + 1}</td>
				<td style="border: 1px solid #000; padding: 4px; white-space: nowrap;">${new Date(r.timestamp).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" })}</td>
				<td style="border: 1px solid #000; padding: 4px; font-weight: bold;">${r.instrumentName}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${r.batchItemCount}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${r.testedSampleCount}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${r.isAzopyramNegative ? "Отрицат." : "ПОЛОЖИТ. (Кровь)"}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${r.isPhenolphthaleinNegative ? "Отрицат." : "ПОЛОЖИТ. (Щелочь)"}</td>
				<td style="border: 1px solid #000; padding: 4px;">${r.detergentBrand || "—"}</td>
				<td style="border: 1px solid #000; padding: 4px; font-weight: bold; text-align: center; color: ${r.isBatchApproved ? "#000" : "#d00"};">
					${r.isBatchApproved ? "Допущено" : "БРАК"}
				</td>
				<td style="border: 1px solid #000; padding: 4px; font-size: 8pt;">
					${r.operatorStaffFullName}<br>
					<span style="font-size: 7pt; color: #444;">${r.electronicStampVerified ? "[ЭЦП заверен]" : ""}</span>
				</td>
			</tr>`;
		})
		.join("\n");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>Журнал качества ПСО (Форма № 366/у)</title>
	<style>
		@page { size: A4 landscape; margin: 12mm; }
		body { font-family: 'Times New Roman', serif; font-size: 9pt; line-height: 1.2; color: #000; }
		.header { text-align: center; margin-bottom: 12px; }
		.clinic-name { font-size: 11pt; font-weight: bold; }
		.title { font-size: 12pt; font-weight: bold; text-transform: uppercase; margin-top: 4px; }
		.subtitle { font-size: 8pt; color: #333; margin-top: 2px; }
		table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 8.5pt; }
		th { border: 1px solid #000; padding: 4px; background: #f2f2f2; font-size: 8pt; text-align: center; }
		.signatures { display: flex; justify-content: space-between; margin-top: 25px; font-size: 9pt; }
		.sign-col { width: 45%; }
	</style>
</head>
<body>
	<div class="header">
		<div class="clinic-name">${clinic.name}</div>
		<div style="font-size: 8pt;">ИНН ${clinic.inn} | ОГРН ${clinic.ogrn} | ${clinic.address}</div>
		<div class="title">ЖУРНАЛ УЧЕТА КАЧЕСТВА ПРЕДСТЕРИЛИЗАЦИОННОЙ ОБРАБОТКИ (ФОРМА № 366/у)</div>
		<div class="subtitle">В соответствии с требованиями СанПиН 3.3686-21 «Профилактика инфекционных болезней» (раздел IV)</div>
		<div style="margin-top: 4px; font-size: 8.5pt;"><strong>${range}</strong></div>
	</div>

	<table>
		<thead>
			<tr>
				<th style="width: 25px;">№ п/п</th>
				<th style="width: 75px;">Дата и время</th>
				<th>Наименование изделий (партия)</th>
				<th style="width: 45px;">Кол-во в партии</th>
				<th style="width: 45px;">Кол-во проб (1%)</th>
				<th style="width: 65px;">Азопирам (кровь)</th>
				<th style="width: 65px;">Фенолфталеин (щелочь)</th>
				<th>Моющее/дез. средство</th>
				<th style="width: 70px;">Результат контроля</th>
				<th style="width: 120px;">Подпись лица, проводившего пробу</th>
			</tr>
		</thead>
		<tbody>
			${rowsHtml || '<tr><td colspan="10" style="text-align: center; padding: 15px; border: 1px solid #000;">Записи за выбранный период отсутствуют</td></tr>'}
		</tbody>
	</table>

	<div class="signatures">
		<div class="sign-col">
			Главная медицинская сестра: ________________ / ${clinic.headNurse} /
		</div>
		<div class="sign-col" style="text-align: right;">
			Главный врач: ________________ / ${clinic.chiefDoctor} /
		</div>
	</div>
</body>
</html>`;
}

/**
 * 1-клик генерация официального печатного макета Журнала работы стерилизаторов (Форма № 257/у)
 */
export function generateForm257PrintHtml(
	records: readonly Form257Record[],
	clinicInfo: ClinicLegalInfo = DEFAULT_CLINIC_LEGAL,
	periodLabelRu = "за текущий отчетный период",
): string {
	const rowsHtml = records
		.map((rec, index) => {
			const pt1 = rec.chamberPoints.find((p) => p.pointIndex === 1)?.status === "passed" ? "+" : "-";
			const pt2 = rec.chamberPoints.find((p) => p.pointIndex === 2)?.status === "passed" ? "+" : "-";
			const pt3 = rec.chamberPoints.find((p) => p.pointIndex === 3)?.status === "passed" ? "+" : "-";
			const pt4 = rec.chamberPoints.find((p) => p.pointIndex === 4)?.status === "passed" ? "+" : "-";
			const pt5 = rec.chamberPoints.find((p) => p.pointIndex === 5)?.status === "passed" ? "+" : "-";

			const verdictLabel = rec.isCyclePassed ? "СТЕРИЛЬНО" : "БРАК";

			return `
				<tr>
					<td style="border: 1px solid #000; text-align:center; font-weight:600;">${index + 1}</td>
					<td style="border: 1px solid #000; text-align:center; white-space:nowrap;">
						${rec.date}<br/>
						<span style="font-size:7.5pt; color:#475569;">Цикл №${rec.cycleNumber}</span>
					</td>
					<td style="border: 1px solid #000;">
						<strong>${rec.sterilizerCode}</strong> (${rec.sterilizerBrandModel})<br/>
						<span style="font-size:7pt; color:#64748b;">Зав. № ${rec.sterilizerSerialNumber}</span>
					</td>
					<td style="border: 1px solid #000;">${rec.itemsDescriptionRu}</td>
					<td style="border: 1px solid #000; text-align:center;">
						${rec.packsCount}<br/>
						<span style="font-size:7pt; color:#64748b;">${rec.packagingNameRu}</span>
					</td>
					<td style="border: 1px solid #000; text-align:center; white-space:nowrap;">
						${rec.actualTemperatureCelsius}°C / ${rec.actualPressureBar} бар<br/>
						<strong>${rec.actualExposureMinutes} мин</strong>
					</td>
					<td style="border: 1px solid #000; font-size:7.5pt;">
						${rec.chemicalIndicatorNameRu}<br/>
						<span style="font-family:monospace; font-weight:bold;">КТ: [${pt1}][${pt2}][${pt3}][${pt4}][${pt5}]</span>
					</td>
					<td style="border: 1px solid #000; text-align:center; font-weight:bold; color:${rec.isCyclePassed ? "#000" : "#d00"};">
						${verdictLabel}
						${rec.rejectionReason ? `<br/><span style="font-size:7pt; font-weight:normal; color:#dc2626;">${rec.rejectionReason}</span>` : ""}
					</td>
					<td style="border: 1px solid #000; font-size:7.5pt;">
						${rec.operatorStaffFullName}<br/>
						<span style="font-size:6.5pt; color:#64748b;">${rec.operatorStaffPosition}</span>
					</td>
					<td style="border: 1px solid #000; font-size:7pt; text-align:center;">
						${rec.isHeadNurseVerified ? `<strong style="color:#059669;">Заверено</strong><br/>${rec.headNurseSignatureFullName || ""}` : "—"}
					</td>
				</tr>
			`;
		})
		.join("\n");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>Журнал контроля работы стерилизаторов (Форма № 257/у)</title>
	<style>
		@page { size: A4 landscape; margin: 10mm; }
		body { font-family: 'Times New Roman', serif; font-size: 8.5pt; line-height: 1.2; color: #000; }
		.header { text-align: center; margin-bottom: 8px; }
		.clinic-title { font-size: 11pt; font-weight: bold; }
		.form-title { font-size: 11.5pt; font-weight: bold; text-transform: uppercase; margin-top: 2px; }
		table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 8pt; }
		th { border: 1px solid #000; padding: 4px 2px; background: #f2f2f2; font-size: 7.5pt; text-align: center; font-weight: bold; }
		.signatures { display: flex; justify-content: space-between; margin-top: 20px; font-size: 8.5pt; }
		.sign-col { width: 45%; }
	</style>
</head>
<body>
	<div class="header">
		<div class="clinic-title">${clinicInfo.name}</div>
		<div style="font-size: 7.5pt;">ИНН ${clinicInfo.inn} | ОГРН ${clinicInfo.ogrn} | ${clinicInfo.address}</div>
		<div class="form-title">ЖУРНАЛ КОНТРОЛЯ РАБОТЫ СТЕРИЛИЗАТОРОВ АВТОКЛАВОВ И СУХОЖАРОВЫХ ШКАФОВ (ФОРМА № 257/у)</div>
		<div style="font-size: 7.5pt; color: #333;">В соответствии с требованиями СанПиН 3.3686-21 «Профилактика инфекционных болезней» (${periodLabelRu})</div>
	</div>

	<table>
		<thead>
			<tr>
				<th style="width: 20px;">№</th>
				<th style="width: 65px;">Дата и № цикла</th>
				<th style="width: 110px;">Стерилизатор (марка, №)</th>
				<th>Стерилизуемые изделия</th>
				<th style="width: 65px;">Кол-во и упаковка</th>
				<th style="width: 75px;">Режим (T°, P, время)</th>
				<th style="width: 110px;">Хим. индикаторы (5 точек)</th>
				<th style="width: 65px;">Результат контроля</th>
				<th style="width: 85px;">Оператор ЦСО</th>
				<th style="width: 70px;">Контроль ст. медсестры</th>
			</tr>
		</thead>
		<tbody>
			${rowsHtml || '<tr><td colspan="10" style="text-align:center; padding:15px; border:1px solid #000;">Записи циклов стерилизации отсутствуют</td></tr>'}
		</tbody>
	</table>

	<div class="signatures">
		<div class="sign-col">
			Главная медицинская сестра: ________________ / ${clinicInfo.headNurse} /
		</div>
		<div class="sign-col" style="text-align: right;">
			Главный врач клиники: ________________ / ${clinicInfo.chiefDoctor} /
		</div>
	</div>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. RFC 4180 CSV EXPORTERS (WITH UTF-8 BOM)
// ─────────────────────────────────────────────────────────────────────────────

function escapeCsvField(val: unknown): string {
	if (val === null || val === undefined) return '""';
	const str = String(val).replace(/"/g, '""');
	return `"${str}"`;
}

export function exportPsoJournalToCsv(records: readonly PsoJournalRecord[]): string {
	const headers = [
		"ID записи",
		"Дата и время",
		"Наименование изделий",
		"Количество в партии",
		"Количество проб (1%)",
		"Азопирамовая проба (кровь)",
		"Фенолфталеиновая проба (щелочь)",
		"Проба с Суданом III",
		"Моющее средство",
		"Результат контроля",
		"Причина брака",
		"ФИО исполнителя",
		"ЭЦП заверен",
		"Примечания",
	];

	const rows = records.map((r) => [
		escapeCsvField(r.id),
		escapeCsvField(r.timestamp),
		escapeCsvField(r.instrumentName),
		escapeCsvField(r.batchItemCount),
		escapeCsvField(r.testedSampleCount),
		escapeCsvField(r.isAzopyramNegative ? "Отрицательная (Норма)" : "ПОЛОЖИТЕЛЬНАЯ (Кровь)"),
		escapeCsvField(r.isPhenolphthaleinNegative ? "Отрицательная (Норма)" : "ПОЛОЖИТЕЛЬНАЯ (Щелочь)"),
		escapeCsvField(r.isSudanNegative ? "Отрицательная (Норма)" : "ПОЛОЖИТЕЛЬНАЯ (Масло)"),
		escapeCsvField(r.detergentBrand),
		escapeCsvField(r.isBatchApproved ? "Допущено" : "БРАК"),
		escapeCsvField(r.rejectionReason ?? ""),
		escapeCsvField(r.operatorStaffFullName),
		escapeCsvField(r.electronicStampVerified ? "ДА" : "НЕТ"),
		escapeCsvField(r.notes ?? ""),
	]);

	const csvBody = [headers.join(";"), ...rows.map((row) => row.join(";"))].join("\r\n");
	return `\uFEFF${csvBody}`;
}

export function exportForm257ToCsv(records: readonly Form257Record[]): string {
	const headers = [
		"ID Записи",
		"Дата",
		"Номер цикла",
		"Код аппарата",
		"Марка и модель стерилизатора",
		"Заводской номер",
		"Режим стерилизации",
		"T° заданная (°C)",
		"T° фактическая (°C)",
		"Давление заданное (бар)",
		"Давление фактическое (бар)",
		"Время выдержки (мин)",
		"Наименование изделий",
		"Кол-во упаковок",
		"Тип упаковки",
		"Срок годности (дней)",
		"Хим. индикатор",
		"КТ-1",
		"КТ-2",
		"КТ-3",
		"КТ-4",
		"КТ-5",
		"Все 5 точек ОК",
		"Результат цикла",
		"Причина брака",
		"Медсестра ЦСО",
		"Проверено главной медсестрой",
		"Цифровой штамп валидации",
		"Примечания",
	];

	const rows = records.map((rec) => {
		const pt1 = rec.chamberPoints.find((p) => p.pointIndex === 1)?.status === "passed" ? "ОК" : "БРАК";
		const pt2 = rec.chamberPoints.find((p) => p.pointIndex === 2)?.status === "passed" ? "ОК" : "БРАК";
		const pt3 = rec.chamberPoints.find((p) => p.pointIndex === 3)?.status === "passed" ? "ОК" : "БРАК";
		const pt4 = rec.chamberPoints.find((p) => p.pointIndex === 4)?.status === "passed" ? "ОК" : "БРАК";
		const pt5 = rec.chamberPoints.find((p) => p.pointIndex === 5)?.status === "passed" ? "ОК" : "БРАК";

		return [
			escapeCsvField(rec.id),
			escapeCsvField(rec.date),
			escapeCsvField(rec.cycleNumber),
			escapeCsvField(rec.sterilizerCode),
			escapeCsvField(rec.sterilizerBrandModel),
			escapeCsvField(rec.sterilizerSerialNumber),
			escapeCsvField(rec.regimeNameRu),
			escapeCsvField(rec.targetTemperatureCelsius),
			escapeCsvField(rec.actualTemperatureCelsius),
			escapeCsvField(rec.targetPressureBar),
			escapeCsvField(rec.actualPressureBar),
			escapeCsvField(rec.actualExposureMinutes),
			escapeCsvField(rec.itemsDescriptionRu),
			escapeCsvField(rec.packsCount),
			escapeCsvField(rec.packagingNameRu),
			escapeCsvField(rec.shelfLifeDays),
			escapeCsvField(rec.chemicalIndicatorNameRu),
			escapeCsvField(pt1),
			escapeCsvField(pt2),
			escapeCsvField(pt3),
			escapeCsvField(pt4),
			escapeCsvField(pt5),
			escapeCsvField(rec.areAllPointsPassed ? "Да" : "Нет"),
			escapeCsvField(rec.isCyclePassed ? "СТЕРИЛЬНО" : "БРАК"),
			escapeCsvField(rec.rejectionReason ?? ""),
			escapeCsvField(rec.operatorStaffFullName),
			escapeCsvField(rec.isHeadNurseVerified ? `Да (${rec.headNurseSignatureFullName ?? ""})` : "Нет"),
			escapeCsvField(rec.digitalStampHash),
			escapeCsvField(rec.notes ?? ""),
		];
	});

	const csvBody = [headers.join(";"), ...rows.map((row) => row.join(";"))].join("\r\n");
	return `\uFEFF${csvBody}`;
}

export function exportBactericidalJournalToCsv(sessions: readonly BactericidalSessionRecord[]): string {
	const headers = [
		"ID",
		"Дата",
		"ID оборудования",
		"Помещение",
		"Марка аппарата",
		"Время начала",
		"Время окончания",
		"Длительность (мин)",
		"Длительность (ч)",
		"Режим работы",
		"Суммарная наработка (ч)",
		"Оператор",
	];

	const rows = sessions.map((s) => [
		escapeCsvField(s.id),
		escapeCsvField(s.date),
		escapeCsvField(s.equipmentId),
		escapeCsvField(s.roomName),
		escapeCsvField(s.deviceBrand),
		escapeCsvField(s.sessionStartTime),
		escapeCsvField(s.sessionEndTime),
		escapeCsvField(s.durationMinutes),
		escapeCsvField(s.durationHours),
		escapeCsvField(s.operatingMode),
		escapeCsvField(s.cumulativeHoursAfterSession),
		escapeCsvField(s.operatorStaffFullName),
	]);

	return `\uFEFF${[headers.join(";"), ...rows.map((r) => r.join(";"))].join("\r\n")}`;
}

export function exportGeneralCleaningJournalToCsv(records: readonly GeneralCleaningJournalRecord[]): string {
	const headers = [
		"ID",
		"План дата",
		"Факт дата",
		"Помещение",
		"Тип помещения",
		"Площадь (м²)",
		"Дезсредство",
		"Концентрация (%)",
		"Экспозиция (мин)",
		"УФ-лучи (мин)",
		"Проветривание (мин)",
		"Исполнитель",
		"Контроль заверен",
	];

	const rows = records.map((r) => [
		escapeCsvField(r.id),
		escapeCsvField(r.scheduledDate),
		escapeCsvField(r.actualDateTime),
		escapeCsvField(r.roomName),
		escapeCsvField(r.roomType),
		escapeCsvField(r.treatedAreaM2),
		escapeCsvField(r.disinfectantName),
		escapeCsvField(r.solutionConcentrationPercent),
		escapeCsvField(r.exposureTimeMinutes),
		escapeCsvField(r.uvIrradiationMinutes),
		escapeCsvField(r.ventilationMinutes),
		escapeCsvField(r.operatorStaffFullName),
		escapeCsvField(r.isInspectorVerified ? "ДА" : "НЕТ"),
	]);

	return `\uFEFF${[headers.join(";"), ...rows.map((r) => r.join(";"))].join("\r\n")}`;
}

export function exportDisinfectantJournalToCsv(records: readonly DisinfectantJournalRecord[]): string {
	const headers = [
		"ID",
		"Дата и время",
		"Тип операции",
		"Торговое название",
		"Количество",
		"Единица",
		"Накладная / Объект обработки",
		"Остаток на складе",
		"Ответственный",
	];

	const rows = records.map((r) => [
		escapeCsvField(r.id),
		escapeCsvField(r.timestamp),
		escapeCsvField(r.operationType === "receipt" ? "Приход" : "Расход"),
		escapeCsvField(r.tradeName),
		escapeCsvField(r.amount),
		escapeCsvField(r.unit),
		escapeCsvField(r.invoiceOrObjectInfo),
		escapeCsvField(r.resultingStockBalance),
		escapeCsvField(r.operatorStaffFullName),
	]);

	return `\uFEFF${[headers.join(";"), ...rows.map((r) => r.join(";"))].join("\r\n")}`;
}

export function generateBactericidalJournalPrintHtml(params: {
	equipment: BactericidalEquipmentRecord;
	sessions: readonly BactericidalSessionRecord[];
	clinicInfo?: ClinicLegalInfo | undefined;
}): string {
	const clinic = params.clinicInfo || DEFAULT_CLINIC_LEGAL;
	const eq = params.equipment;

	const rowsHtml = params.sessions
		.map((s, i) => {
			return `<tr>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${i + 1}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${s.date}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${s.sessionStartTime} — ${s.sessionEndTime}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold;">${s.durationMinutes} мин (${s.durationHours} ч)</td>
				<td style="border: 1px solid #000; padding: 4px;">
					${s.operatingMode === "continuous_presence" ? "В присутствии людей" : s.operatingMode === "pre_op_preparation" ? "Предоперационный" : s.operatingMode === "post_cleaning" ? "После генеральной уборки" : "Периодический"}
				</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold;">${s.cumulativeHoursAfterSession} ч</td>
				<td style="border: 1px solid #000; padding: 4px; font-size: 8pt;">${s.operatorStaffFullName}</td>
			</tr>`;
		})
		.join("\n");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>Журнал регистрации работы бактерицидной установки — ${eq.roomName}</title>
	<style>
		@page { size: A4 portrait; margin: 12mm; }
		body { font-family: 'Times New Roman', serif; font-size: 9.5pt; line-height: 1.25; color: #000; }
		.header { text-align: center; margin-bottom: 10px; }
		.title { font-size: 11.5pt; font-weight: bold; text-transform: uppercase; }
		.passport-box { border: 1px solid #000; padding: 8px; margin-bottom: 12px; background: #fafafa; }
		table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 9pt; }
		th { border: 1px solid #000; padding: 4px; background: #f0f0f0; font-size: 8.5pt; }
	</style>
</head>
<body>
	<div class="header">
		<div style="font-weight: bold;">${clinic.name}</div>
		<div class="title">ЖУРНАЛ РЕГИСТРАЦИИ И КОНТРОЛЯ РАБОТЫ БАКТЕРИЦИДНОЙ УСТАНОВКИ</div>
		<div style="font-size: 8.5pt; color: #333;">(Руководство Р 3.5.1904-04 / СанПиН 3.3686-21)</div>
	</div>

	<div class="passport-box">
		<strong>Паспортные данные установки:</strong><br>
		- Помещение: <strong>${eq.roomName}</strong> (Объем: ${eq.roomVolumeM3} м³)<br>
		- Марка / модель: <strong>${eq.deviceBrand}</strong>, Заводской номер: <strong>${eq.serialNumber}</strong><br>
		- Тип аппарата: ${eq.deviceType === "recirculator_closed" ? "Рециркулятор закрытого типа" : "Открытый облучатель"}<br>
		- Установленные лампы: ${eq.lampType} (${eq.lampCount} шт.), Паспортный ресурс: <strong>${eq.maxLampHours} часов</strong><br>
		- Текущая суммарная наработка: <strong>${eq.totalOperatingHours} часов</strong> (Остаток: ${eq.remainingLampHours} ч / ${eq.remainingLampPercent}%)
	</div>

	<table>
		<thead>
			<tr>
				<th style="width: 25px;">№</th>
				<th style="width: 75px;">Дата сеанса</th>
				<th style="width: 95px;">Время вкл / выкл</th>
				<th style="width: 80px;">Длительность</th>
				<th>Режим обеззараживания</th>
				<th style="width: 90px;">Суммарная наработка</th>
				<th style="width: 110px;">Подпись оператора</th>
			</tr>
		</thead>
		<tbody>
			${rowsHtml || '<tr><td colspan="7" style="text-align: center; padding: 15px; border: 1px solid #000;">Сеансы работы не зафиксированы</td></tr>'}
		</tbody>
	</table>
</body>
</html>`;
}

export function generateGeneralCleaningJournalPrintHtml(params: {
	records: readonly GeneralCleaningJournalRecord[];
	clinicInfo?: ClinicLegalInfo | undefined;
}): string {
	const clinic = params.clinicInfo || DEFAULT_CLINIC_LEGAL;

	const rowsHtml = params.records
		.map((r, i) => {
			return `<tr>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${i + 1}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${r.scheduledDate}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${new Date(r.actualDateTime).toLocaleDateString("ru-RU")}</td>
				<td style="border: 1px solid #000; padding: 4px; font-weight: bold;">${r.roomName}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${r.treatedAreaM2} м²</td>
				<td style="border: 1px solid #000; padding: 4px;">${r.disinfectantName} (${r.solutionConcentrationPercent}%)</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${r.exposureTimeMinutes} мин</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${r.uvIrradiationMinutes} мин</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${r.ventilationMinutes} мин</td>
				<td style="border: 1px solid #000; padding: 4px; font-size: 8pt;">${r.operatorStaffFullName}</td>
				<td style="border: 1px solid #000; padding: 4px; font-size: 8pt; text-align: center;">${r.isInspectorVerified ? "Заверено" : "—"}</td>
			</tr>`;
		})
		.join("\n");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>Журнал проведения генеральных уборок</title>
	<style>
		@page { size: A4 landscape; margin: 12mm; }
		body { font-family: 'Times New Roman', serif; font-size: 9pt; line-height: 1.2; color: #000; }
		.header { text-align: center; margin-bottom: 12px; }
		.title { font-size: 12pt; font-weight: bold; text-transform: uppercase; }
		table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 8.5pt; }
		th { border: 1px solid #000; padding: 4px; background: #f2f2f2; font-size: 8pt; text-align: center; }
	</style>
</head>
<body>
	<div class="header">
		<div style="font-weight: bold;">${clinic.name}</div>
		<div class="title">ЖУРНАЛ ПРОВЕДЕНИЯ ГЕНЕРАЛЬНЫХ УБОРОК И ДЕЗИНФЕКЦИИ ПОМЕЩЕНИЙ</div>
		<div style="font-size: 8pt; color: #333;">(В соответствии с требованиями СанПиН 3.3686-21, разд. IV)</div>
	</div>

	<table>
		<thead>
			<tr>
				<th style="width: 25px;">№</th>
				<th style="width: 70px;">План дата</th>
				<th style="width: 70px;">Факт дата</th>
				<th>Наименование помещения / кабинета</th>
				<th style="width: 45px;">Площадь</th>
				<th>Дезсредство (концентрация %)</th>
				<th style="width: 50px;">Экспозиция</th>
				<th style="width: 45px;">УФ-лучи</th>
				<th style="width: 50px;">Проветривание</th>
				<th style="width: 100px;">Исполнитель</th>
				<th style="width: 75px;">Контроль</th>
			</tr>
		</thead>
		<tbody>
			${rowsHtml || '<tr><td colspan="11" style="text-align: center; padding: 15px; border: 1px solid #000;">Записи генеральных уборок отсутствуют</td></tr>'}
		</tbody>
	</table>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. ЭКСПРЕСС-ЧЕК-ЛИСТ «ГОТОВНОСТЬ КАБИНЕТА И СТОМАТОЛОГИЧЕСКОЙ УСТАНОВКИ К ПРИЁМУ»
// ─────────────────────────────────────────────────────────────────────────────

export interface SurfaceDisinfectionCheck {
	readonly isCompleted: boolean;
	readonly disinfectantBrand: string;
	readonly exposureMinutes: number;
	readonly surfacesCleaned?: readonly string[] | undefined;
}

export interface HandpiecesSterilityCheck {
	readonly isCompleted: boolean;
	readonly turbineHandpieceSterile: boolean;
	readonly contraAngleHandpieceSterile: boolean;
	readonly micromotorHandpieceSterile?: boolean | undefined;
	readonly class5IndicatorsVerified: boolean;
	readonly packageIntegrityVerified: boolean;
}

export interface SterileTrayCheck {
	readonly isCompleted: boolean;
	readonly mirrorReady: boolean;
	readonly probeReady: boolean;
	readonly tweezersReady: boolean;
	readonly excavatorReady: boolean;
	readonly spatulaPluggerReady: boolean;
	readonly kraftPackageBatchId?: string | undefined;
}

export interface AspirationSystemCheck {
	readonly isCompleted: boolean;
	readonly salivaEjectorConnected: boolean;
	readonly hveVacuumConnected: boolean;
	readonly bacterialFilterChecked: boolean;
}

export interface CofferdamCheck {
	readonly isCompleted: boolean;
	readonly rubberDamSheetReady: boolean;
	readonly clampsReady: boolean;
	readonly forcepsReady: boolean;
	readonly isNotRequiredForProfile?: boolean | undefined;
}

export interface CabinetReadinessRecord {
	readonly id: string;
	readonly cabinetNumber: string;
	readonly appointmentType: DentalAppointmentType;
	readonly appointmentTypeTitleRu: string;
	readonly timestamp: string; // ISO 8601
	readonly operatorStaffFullName: string;
	readonly operatorStaffPosition: string;
	readonly surfaceDisinfection: SurfaceDisinfectionCheck;
	readonly handpiecesSterility: HandpiecesSterilityCheck;
	readonly sterileTray: SterileTrayCheck;
	readonly aspirationSystem: AspirationSystemCheck;
	readonly isolationCofferdam: CofferdamCheck;
	readonly isFullyReady: boolean;
	readonly statusMessageRu: string;
	readonly summaryBadgeRu: string;
	readonly missingItems: readonly string[];
	readonly digitalStampHash: string;
	readonly notes?: string | undefined;
	readonly createdAt: string;
}

export interface EvaluateCabinetReadinessParams {
	readonly appointmentType: DentalAppointmentType;
	readonly surfaceDisinfection: SurfaceDisinfectionCheck;
	readonly handpiecesSterility: HandpiecesSterilityCheck;
	readonly sterileTray: SterileTrayCheck;
	readonly aspirationSystem: AspirationSystemCheck;
	readonly isolationCofferdam: CofferdamCheck;
}

export interface CabinetReadinessEvaluationResult {
	readonly isFullyReady: boolean;
	readonly statusMessageRu: string;
	readonly summaryBadgeRu: string;
	readonly missingItems: readonly string[];
	readonly preset: CabinetReadinessPreset;
}

/**
 * Оценивает выполнение всех обязательных пунктов чек-листа подготовки кабинета.
 */
export function evaluateCabinetReadiness(
	params: EvaluateCabinetReadinessParams,
): CabinetReadinessEvaluationResult {
	const preset = getCabinetReadinessPreset(params.appointmentType);
	const missingItems: string[] = [];

	// 1. Дезинфекция поверхностей
	if (!params.surfaceDisinfection.isCompleted) {
		missingItems.push("Дезинфекция поверхностей не отмечена как выполненная");
	} else if (params.surfaceDisinfection.exposureMinutes < preset.minExposureMinutes) {
		missingItems.push(
			`Недостаточная экспозиция дезинфекции: ${params.surfaceDisinfection.exposureMinutes} мин (требуется >= ${preset.minExposureMinutes} мин для ${preset.shortLabelRu})`,
		);
	}

	// 2. Стерильные наконечники и крафт-пакеты (индикаторы 5 класса)
	if (!params.handpiecesSterility.isCompleted) {
		missingItems.push("Стерильность наконечников не подтверждена");
	} else {
		if (!params.handpiecesSterility.turbineHandpieceSterile) {
			missingItems.push("Турбинный наконечник не проверен или не стерилен");
		}
		if (!params.handpiecesSterility.contraAngleHandpieceSterile) {
			missingItems.push("Угловой наконечник не проверен или не стерилен");
		}
		if (!params.handpiecesSterility.class5IndicatorsVerified) {
			missingItems.push("Химические индикаторы 5 класса в крафт-пакетах наконечников не проверены");
		}
		if (!params.handpiecesSterility.packageIntegrityVerified) {
			missingItems.push("Целостность крафт-пакетов наконечников нарушена");
		}
	}

	// 3. Базовый стерильный лоток (зеркало, зонд, пинцет, экскаватор, гладилка)
	if (!params.sterileTray.isCompleted) {
		missingItems.push("Базовый смотровой лоток не укомплектован");
	} else {
		const trayMissing: string[] = [];
		if (!params.sterileTray.mirrorReady) trayMissing.push("зеркало");
		if (!params.sterileTray.probeReady) trayMissing.push("зонд");
		if (!params.sterileTray.tweezersReady) trayMissing.push("пинцет");
		if (!params.sterileTray.excavatorReady) trayMissing.push("экскаватор");
		if (!params.sterileTray.spatulaPluggerReady) trayMissing.push("гладилка-штопфер");
		if (trayMissing.length > 0) {
			missingItems.push(`В стерильном лотке отсутствуют: ${trayMissing.join(", ")}`);
		}
	}

	// 4. Аспирационная система
	if (!params.aspirationSystem.isCompleted) {
		missingItems.push("Аспирационная система не подключена");
	} else {
		if (!params.aspirationSystem.salivaEjectorConnected) {
			missingItems.push("Слюноотсос не подключен или отсутствует одноразовый наконечник");
		}
		if (!params.aspirationSystem.hveVacuumConnected) {
			missingItems.push("Пылесос (высокообъемный аспиратор) не подключен");
		}
		if (!params.aspirationSystem.bacterialFilterChecked) {
			missingItems.push("Бактериальный фильтр / сетка аспиратора не проверены");
		}
	}

	// 5. Коффердам (обязателен для Терапии, Эндодонтии, Детства)
	if (preset.requiresCofferdam) {
		if (!params.isolationCofferdam.isCompleted && !params.isolationCofferdam.isNotRequiredForProfile) {
			missingItems.push("Коффердам не подготовлен для изоляции рабочего поля");
		} else if (!params.isolationCofferdam.isNotRequiredForProfile) {
			const coffMissing: string[] = [];
			if (!params.isolationCofferdam.rubberDamSheetReady) coffMissing.push("латексный/силиконовый платок");
			if (!params.isolationCofferdam.clampsReady) coffMissing.push("клампы (2A, W8A)");
			if (!params.isolationCofferdam.forcepsReady) coffMissing.push("щипцы для клампов");
			if (coffMissing.length > 0) {
				missingItems.push(`Для коффердама не подготовлены: ${coffMissing.join(", ")}`);
			}
		}
	}

	const isFullyReady = missingItems.length === 0;
	const statusMessageRu = isFullyReady
		? "Кабинет стерилен и готов к приёму"
		: `Кабинет не готов: ${missingItems.join("; ")}`;
	const summaryBadgeRu = isFullyReady ? "Готов к приёму" : "Не готов";

	return {
		isFullyReady,
		statusMessageRu,
		summaryBadgeRu,
		missingItems,
		preset,
	};
}

export function generateCabinetReadinessId(
	dateStr: string = new Date().toISOString().slice(0, 10),
	cabinetNumber = "1",
	seq: number = Math.floor(100 + Math.random() * 900),
): string {
	const cleanDate = dateStr.replace(/[^0-9]/g, "").slice(0, 8);
	const cleanCab = cabinetNumber.replace(/[^0-9a-zA-Zа-яА-Я]/g, "").toUpperCase();
	return `CR-${cleanDate}-CAB${cleanCab}-${seq.toString().padStart(3, "0")}`;
}

export function calculateCabinetStampHash(data: {
	id: string;
	cabinetNumber: string;
	appointmentType: string;
	timestamp: string;
	operatorStaffFullName: string;
	isFullyReady: boolean;
}): string {
	const raw = `${data.id}|${data.cabinetNumber}|${data.appointmentType}|${data.timestamp}|${data.operatorStaffFullName}|${data.isFullyReady}`;
	let hash = 0x811c9dc5;
	for (let i = 0; i < raw.length; i++) {
		hash ^= raw.charCodeAt(i);
		hash = Math.imul(hash, 0x01000193);
	}
	const hex = (hash >>> 0).toString(16).padStart(8, "0").toUpperCase();
	return `CAB-CHECK-${hex}`;
}

export function createCabinetReadinessRecord(params: {
	cabinetNumber: string;
	appointmentType: DentalAppointmentType;
	operatorStaffFullName: string;
	operatorStaffPosition?: string | undefined;
	surfaceDisinfection: SurfaceDisinfectionCheck;
	handpiecesSterility: HandpiecesSterilityCheck;
	sterileTray: SterileTrayCheck;
	aspirationSystem: AspirationSystemCheck;
	isolationCofferdam: CofferdamCheck;
	notes?: string | undefined;
	timestamp?: string | undefined;
}): CabinetReadinessRecord {
	const evaluation = evaluateCabinetReadiness({
		appointmentType: params.appointmentType,
		surfaceDisinfection: params.surfaceDisinfection,
		handpiecesSterility: params.handpiecesSterility,
		sterileTray: params.sterileTray,
		aspirationSystem: params.aspirationSystem,
		isolationCofferdam: params.isolationCofferdam,
	});

	const now = params.timestamp || new Date().toISOString();
	const id = generateCabinetReadinessId(now.slice(0, 10), params.cabinetNumber);

	const digitalStampHash = calculateCabinetStampHash({
		id,
		cabinetNumber: params.cabinetNumber,
		appointmentType: params.appointmentType,
		timestamp: now,
		operatorStaffFullName: params.operatorStaffFullName,
		isFullyReady: evaluation.isFullyReady,
	});

	return {
		id,
		cabinetNumber: params.cabinetNumber,
		appointmentType: params.appointmentType,
		appointmentTypeTitleRu: evaluation.preset.titleRu,
		timestamp: now,
		operatorStaffFullName: params.operatorStaffFullName,
		operatorStaffPosition: params.operatorStaffPosition || "Медсестра / Ассистент",
		surfaceDisinfection: params.surfaceDisinfection,
		handpiecesSterility: params.handpiecesSterility,
		sterileTray: params.sterileTray,
		aspirationSystem: params.aspirationSystem,
		isolationCofferdam: params.isolationCofferdam,
		isFullyReady: evaluation.isFullyReady,
		statusMessageRu: evaluation.statusMessageRu,
		summaryBadgeRu: evaluation.summaryBadgeRu,
		missingItems: evaluation.missingItems,
		digitalStampHash,
		notes: params.notes,
		createdAt: new Date().toISOString(),
	};
}

export function exportCabinetReadinessToCsv(records: readonly CabinetReadinessRecord[]): string {
	const headers = [
		"ID Записи",
		"Дата и время",
		"Кабинет",
		"Профиль приёма",
		"Статус готовности",
		"Дезинфекция поверхностей",
		"Дезсредство и экспозиция",
		"Стерильные наконечники (индикаторы 5 кл.)",
		"Базовый стерильный лоток",
		"Аспирация (слюноотсос/пылесос)",
		"Коффердам",
		"Замечания / Отсутствующие позиции",
		"Исполнитель (медсестра/ассистент)",
		"Цифровой штамп ЭЦП",
		"Примечания",
	];

	const rows = records.map((r) => [
		escapeCsvField(r.id),
		escapeCsvField(new Date(r.timestamp).toLocaleString("ru-RU")),
		escapeCsvField(r.cabinetNumber),
		escapeCsvField(r.appointmentTypeTitleRu),
		escapeCsvField(r.isFullyReady ? "ГОТОВ К ПРИЁМУ" : "НЕ ГОТОВ"),
		escapeCsvField(r.surfaceDisinfection.isCompleted ? "ДА" : "НЕТ"),
		escapeCsvField(`${r.surfaceDisinfection.disinfectantBrand} (${r.surfaceDisinfection.exposureMinutes} мин)`),
		escapeCsvField(r.handpiecesSterility.isCompleted && r.handpiecesSterility.class5IndicatorsVerified ? "ДА (5 кл. ОК)" : "НЕТ"),
		escapeCsvField(r.sterileTray.isCompleted ? "ДА (Укомплектован)" : "НЕТ"),
		escapeCsvField(r.aspirationSystem.isCompleted ? "ДА (Подключена)" : "НЕТ"),
		escapeCsvField(r.isolationCofferdam.isCompleted ? "ДА" : r.isolationCofferdam.isNotRequiredForProfile ? "Не требуется" : "НЕТ"),
		escapeCsvField(r.missingItems.join("; ") || "Замечаний нет"),
		escapeCsvField(`${r.operatorStaffFullName} (${r.operatorStaffPosition})`),
		escapeCsvField(r.digitalStampHash),
		escapeCsvField(r.notes ?? ""),
	]);

	const csvBody = [headers.join(";"), ...rows.map((row) => row.join(";"))].join("\r\n");
	return `\uFEFF${csvBody}`;
}

export function generateCabinetReadinessPrintHtml(params: {
	records: readonly CabinetReadinessRecord[];
	clinicInfo?: ClinicLegalInfo | undefined;
}): string {
	const clinic = params.clinicInfo || DEFAULT_CLINIC_LEGAL;

	const rowsHtml = params.records
		.map((r, i) => {
			return `<tr>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${i + 1}</td>
				<td style="border: 1px solid #000; padding: 4px; white-space: nowrap;">${new Date(r.timestamp).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" })}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold;">${r.cabinetNumber}</td>
				<td style="border: 1px solid #000; padding: 4px;">${r.appointmentTypeTitleRu}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold; color: ${r.isFullyReady ? "#059669" : "#dc2626"};">
					${r.isFullyReady ? "ГОТОВ" : "НЕ ГОТОВ"}
				</td>
				<td style="border: 1px solid #000; padding: 4px; font-size: 8pt;">
					${r.surfaceDisinfection.disinfectantBrand} (${r.surfaceDisinfection.exposureMinutes} мин)
				</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center; font-size: 8pt;">
					${r.handpiecesSterility.class5IndicatorsVerified ? "Индикаторы 5 кл. ОК" : "Не проверены"}
				</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center; font-size: 8pt;">
					${r.sterileTray.isCompleted ? "Лоток ОК" : "Не укомплектован"}
				</td>
				<td style="border: 1px solid #000; padding: 4px; font-size: 8pt;">
					${r.operatorStaffFullName}<br>
					<span style="font-size: 7pt; color: #64748b;">${r.digitalStampHash}</span>
				</td>
			</tr>`;
		})
		.join("\n");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>Журнал экспресс-контроля готовности кабинетов к приёму</title>
	<style>
		@page { size: A4 landscape; margin: 12mm; }
		body { font-family: 'Times New Roman', serif; font-size: 9pt; line-height: 1.2; color: #000; }
		.header { text-align: center; margin-bottom: 12px; }
		.title { font-size: 12pt; font-weight: bold; text-transform: uppercase; }
		table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 8.5pt; }
		th { border: 1px solid #000; padding: 4px; background: #f2f2f2; font-size: 8pt; text-align: center; }
	</style>
</head>
<body>
	<div class="header">
		<div style="font-weight: bold;">${clinic.name}</div>
		<div class="title">ЖУРНАЛ ЭКСПРЕСС-КОНТРОЛЯ ГОТОВНОСТИ КАБИНЕТОВ И СТОМАТОЛОГИЧЕСКИХ УСТАНОВОК К ПРИЁМУ</div>
		<div style="font-size: 8pt; color: #333;">(В соответствии с требованиями СанПиН 3.3686-21)</div>
	</div>

	<table>
		<thead>
			<tr>
				<th style="width: 25px;">№</th>
				<th style="width: 75px;">Дата и время</th>
				<th style="width: 60px;">Кабинет</th>
				<th>Профиль приёма</th>
				<th style="width: 75px;">Статус</th>
				<th style="width: 110px;">Дезинфекция</th>
				<th style="width: 100px;">Наконечники</th>
				<th style="width: 75px;">Лоток</th>
				<th style="width: 120px;">Медсестра / ЭЦП</th>
			</tr>
		</thead>
		<tbody>
			${rowsHtml || '<tr><td colspan="9" style="text-align: center; padding: 15px; border: 1px solid #000;">Записи готовности кабинетов отсутствуют</td></tr>'}
		</tbody>
	</table>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. TEMPERATURE & HUMIDITY MONITORING (ORDER 706n / 646n)
// ─────────────────────────────────────────────────────────────────────────────

export interface TemperatureHumidityLogRecord {
	readonly id: string;
	readonly measurementDate: string;
	readonly measurementPeriod: "morning" | "evening" | string;
	readonly equipmentName: string;
	readonly equipmentType?: string | undefined;
	readonly location: string;
	readonly meterDeviceName: string;
	readonly meterSerialNumber?: string | undefined;
	readonly temperatureCelsius: number;
	readonly relativeHumidityPercent?: number | undefined;
	readonly targetTempMinCelsius: number;
	readonly targetTempMaxCelsius: number;
	readonly isWithinNorm: boolean;
	readonly deviationReason?: string | undefined;
	readonly correctiveAction?: string | undefined;
	readonly operatorStaffFullName: string;
	readonly notes?: string | undefined;
}

export function exportTemperatureHumidityJournalToCsv(records: readonly TemperatureHumidityLogRecord[]): string {
	const headers = [
		"ID",
		"Дата замера",
		"Период",
		"Объект контроля",
		"Место установки",
		"Прибор учета",
		"Фактическая T° (°C)",
		"Влажность (%)",
		"Норматив T° (°C)",
		"В пределах нормы",
		"Причина отклонения / Меры",
		"Ответственный",
		"Примечания",
	];

	const rows = records.map((r) => [
		escapeCsvField(r.id),
		escapeCsvField(r.measurementDate),
		escapeCsvField(r.measurementPeriod === "morning" ? "Утро (09:00)" : r.measurementPeriod === "evening" ? "Вечер (18:00)" : r.measurementPeriod),
		escapeCsvField(r.equipmentName),
		escapeCsvField(r.location),
		escapeCsvField(r.meterSerialNumber ? `${r.meterDeviceName} (№${r.meterSerialNumber})` : r.meterDeviceName),
		escapeCsvField(r.temperatureCelsius),
		escapeCsvField(r.relativeHumidityPercent !== undefined && r.relativeHumidityPercent !== null ? r.relativeHumidityPercent : ""),
		escapeCsvField(`${r.targetTempMinCelsius}..${r.targetTempMaxCelsius}`),
		escapeCsvField(r.isWithinNorm ? "ДА" : "ОТКЛОНЕНИЕ"),
		escapeCsvField(r.correctiveAction || r.deviationReason || ""),
		escapeCsvField(r.operatorStaffFullName),
		escapeCsvField(r.notes || ""),
	]);

	const csvBody = [headers.join(";"), ...rows.map((row) => row.join(";"))].join("\r\n");
	return `\uFEFF${csvBody}`;
}

export function generateTemperatureHumidityJournalPrintHtml(params: {
	records: readonly TemperatureHumidityLogRecord[];
	clinicInfo?: ClinicLegalInfo | undefined;
	periodLabelRu?: string | undefined;
}): string {
	const clinic = params.clinicInfo || DEFAULT_CLINIC_LEGAL;
	const period = params.periodLabelRu || `Дата формирования: ${new Date().toLocaleDateString("ru-RU")}`;

	const rowsHtml = params.records
		.map((r, i) => {
			return `<tr>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${i + 1}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${r.measurementDate}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${r.measurementPeriod === "morning" ? "Утро (09:00)" : r.measurementPeriod === "evening" ? "Вечер (18:00)" : r.measurementPeriod}</td>
				<td style="border: 1px solid #000; padding: 4px;">
					<strong>${r.equipmentName}</strong><br>
					<span style="font-size: 7.5pt; color: #444;">${r.location} (Прибор: ${r.meterDeviceName}${r.meterSerialNumber ? ` №${r.meterSerialNumber}` : ""})</span>
				</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold; color: ${r.isWithinNorm ? "#000" : "#dc2626"};">
					${r.temperatureCelsius}°C
				</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">
					${r.relativeHumidityPercent !== undefined && r.relativeHumidityPercent !== null ? `${r.relativeHumidityPercent}%` : "—"}
				</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center; font-size: 8pt;">
					${r.targetTempMinCelsius}..${r.targetTempMaxCelsius}°C
				</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold; color: ${r.isWithinNorm ? "#059669" : "#dc2626"};">
					${r.isWithinNorm ? "Норма" : "ОТКЛОНЕНИЕ"}
					${r.correctiveAction ? `<br><span style="font-size: 7pt; font-weight: normal; color: #dc2626;">${r.correctiveAction}</span>` : ""}
				</td>
				<td style="border: 1px solid #000; padding: 4px; font-size: 8pt;">
					${r.operatorStaffFullName}
				</td>
			</tr>`;
		})
		.join("\n");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>Журнал регистрации температурного режима холодильников (Приказ 706н)</title>
	<style>
		@page { size: A4 landscape; margin: 10mm; }
		body { font-family: 'Times New Roman', serif; font-size: 8.5pt; line-height: 1.2; color: #000; }
		.header { text-align: center; margin-bottom: 8px; }
		.clinic-name { font-size: 11pt; font-weight: bold; }
		.title { font-size: 11.5pt; font-weight: bold; text-transform: uppercase; margin-top: 2px; }
		.subtitle { font-size: 8pt; color: #333; }
		table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 8pt; }
		th { border: 1px solid #000; padding: 4px 2px; background: #f2f2f2; font-size: 7.5pt; text-align: center; font-weight: bold; }
		.signatures { display: flex; justify-content: space-between; margin-top: 20px; font-size: 8.5pt; }
		.sign-col { width: 45%; }
	</style>
</head>
<body>
	<div class="header">
		<div class="clinic-name">${clinic.name}</div>
		<div style="font-size: 7.5pt;">ИНН ${clinic.inn} | ОГРН ${clinic.ogrn} | Лицензия ${clinic.licenseNumber || "№ ЛО41-01137-77/00368421"} | ${clinic.address}</div>
		<div class="title">ЖУРНАЛ РЕГИСТРАЦИИ ТЕМПЕРАТУРНОГО РЕЖИМА И ВЛАЖНОСТИ В ХОЛОДИЛЬНИКАХ И ЗОНАХ ХРАНЕНИЯ ЛЕКАРСТВЕННЫХ СРЕДСТВ</div>
		<div class="subtitle">(Приказ Минздравсоцразвития РФ № 706н / Приказ Минздрава РФ № 646н • ${period})</div>
	</div>

	<table>
		<thead>
			<tr>
				<th style="width: 25px;">№</th>
				<th style="width: 70px;">Дата</th>
				<th style="width: 75px;">Период</th>
				<th>Объект контроля (холодильник, место, прибор)</th>
				<th style="width: 60px;">Факт T°</th>
				<th style="width: 60px;">Влажность</th>
				<th style="width: 70px;">Норма T°</th>
				<th style="width: 90px;">Результат контроля</th>
				<th style="width: 110px;">Ответственное лицо</th>
			</tr>
		</thead>
		<tbody>
			${rowsHtml || '<tr><td colspan="9" style="text-align: center; padding: 15px; border: 1px solid #000;">Записи температурного режима отсутствуют</td></tr>'}
		</tbody>
	</table>

	<div class="signatures">
		<div class="sign-col">
			Ответственное лицо: ________________ / ${clinic.headNurse} /
		</div>
		<div class="sign-col" style="text-align: right;">
			Главный врач: ________________ / ${clinic.chiefDoctor} /
		</div>
	</div>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 11. CONSOLIDATED PRODUCTION CONTROL JOURNAL BINDER (ROSPOTREBNADZOR DOSSIER)
// ─────────────────────────────────────────────────────────────────────────────

export interface ConsolidatedSanpinJournalData {
	readonly clinicInfo?: ClinicLegalInfo | undefined;
	readonly periodLabelRu?: string | undefined;
	readonly dateRange?: { readonly from: string; readonly to: string } | undefined;
	readonly volumeNumber?: number | string | undefined;
	readonly totalPagesCount?: number | undefined;
	// Раздел 1: Журнал предстерилизационной очистки (Форма № 366/у)
	readonly psoRecords: readonly PsoJournalRecord[];
	// Раздел 2: Журнал работы стерилизаторов (Форма № 257/у)
	readonly form257Records: readonly Form257Record[];
	// Раздел 3: Журнал бактерицидных установок и генеральных уборок
	readonly bactericidalSessions: readonly BactericidalSessionRecord[];
	readonly bactericidalEquipments?: readonly BactericidalEquipmentRecord[] | undefined;
	readonly generalCleanings: readonly GeneralCleaningJournalRecord[];
	// Раздел 4: Журнал температурного режима холодильников
	readonly temperatureLogs: readonly TemperatureHumidityLogRecord[];
}

export function integerToRussianWords(num: number): string {
	const n = Math.max(0, Math.floor(num));
	if (n === 0) return "ноль";

	const units = ["", "один", "два", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"];
	const teens = [
		"десять",
		"одиннадцать",
		"двенадцать",
		"тринадцать",
		"четырнадцать",
		"пятнадцать",
		"шестнадцать",
		"семнадцать",
		"восемнадцать",
		"девятнадцать",
	];
	const tens = ["", "", "двадцать", "тридцать", "сорок", "пятьдесят", "шестьдесят", "семьдесят", "восемьдесят", "девяносто"];
	const hundreds = [
		"",
		"сто",
		"двести",
		"триста",
		"четыреста",
		"пятьсот",
		"шестьсот",
		"семьсот",
		"восемьсот",
		"девятьсот",
	];

	if (n < 10) return units[n]!;
	if (n < 20) return teens[n - 10]!;
	if (n < 100) {
		const ten = Math.floor(n / 10);
		const unit = n % 10;
		return unit === 0 ? tens[ten]! : `${tens[ten]} ${units[unit]}`;
	}
	if (n < 1000) {
		const hundred = Math.floor(n / 100);
		const rest = n % 100;
		if (rest === 0) return hundreds[hundred]!;
		return `${hundreds[hundred]} ${integerToRussianWords(rest)}`;
	}

	const thousands = Math.floor(n / 1000);
	const rest = n % 1000;
	let thousandWord = "тысяч";
	if (thousands % 10 === 1 && thousands % 100 !== 11) thousandWord = "тысяча";
	else if (thousands % 10 >= 2 && thousands % 10 <= 4 && (thousands % 100 < 10 || thousands % 100 >= 20))
		thousandWord = "тысячи";

	let thousandPrefix = integerToRussianWords(thousands);
	if (thousands % 10 === 1 && thousands % 100 !== 11) thousandPrefix = thousandPrefix.replace(/один$/, "одна");
	if (thousands % 10 === 2 && thousands % 100 !== 12) thousandPrefix = thousandPrefix.replace(/два$/, "две");

	if (rest === 0) return `${thousandPrefix} ${thousandWord}`;
	return `${thousandPrefix} ${thousandWord} ${integerToRussianWords(rest)}`;
}

export { integerToRussianWords as numberToRussianWords };

export function formatRussianSheetsCount(count: number): {
	readonly count: number;
	readonly countInWords: string;
	readonly declensionRu: string;
	readonly formattedRu: string;
} {
	const n = Math.max(1, Math.floor(Number(count) || 1));
	const countInWords = integerToRussianWords(n);
	const mod10 = n % 10;
	const mod100 = n % 100;

	let declensionRu = "листов";
	if (mod10 === 1 && mod100 !== 11) {
		declensionRu = "лист";
	} else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
		declensionRu = "листа";
	}

	return {
		count: n,
		countInWords,
		declensionRu,
		formattedRu: `${n} (${countInWords}) ${declensionRu}`,
	};
}

/**
 * Генератор сшива журналов «Сводный журнал производственного контроля СанПиН за период» (А4 Альбомная):
 * - Титульный лист с реквизитами клиники, лицензии № ЛО41-01137-77/00368421, номером тома и подписью главного врача;
 * - Раздел 1: Журнал предстерилизационной очистки (Форма № 366/у);
 * - Раздел 2: Журнал работы стерилизаторов (Форма № 257/у);
 * - Раздел 3: Журнал бактерицидных установок и генеральных уборок;
 * - Раздел 4: Журнал температурного режима холодильников;
 * - Лист сшива и заверения («В настоящем журнале пронумеровано, прошнуровано и скреплено печатью X листов»).
 */
export function generateSanpinConsolidatedInspectionHtml(data: ConsolidatedSanpinJournalData): string {
	const clinic = data.clinicInfo || DEFAULT_CLINIC_LEGAL;
	const license = clinic.licenseNumber || "№ ЛО41-01137-77/00368421";
	const volume = data.volumeNumber || clinic.volumeNumber || 1;
	const periodLabel = data.periodLabelRu
		? data.periodLabelRu
		: data.dateRange
			? `с ${data.dateRange.from} по ${data.dateRange.to}`
			: `за текущий отчетный период (${new Date().toLocaleDateString("ru-RU")})`;

	// Calculate sheet count if not explicitly given
	const psoSheets = Math.max(1, Math.ceil(data.psoRecords.length / 14));
	const f257Sheets = Math.max(1, Math.ceil(data.form257Records.length / 10));
	const bacSheets = Math.max(1, Math.ceil(data.bactericidalSessions.length / 14));
	const cleanSheets = Math.max(1, Math.ceil(data.generalCleanings.length / 12));
	const tempSheets = Math.max(1, Math.ceil(data.temperatureLogs.length / 14));
	const computedTotalSheets = 1 + psoSheets + f257Sheets + bacSheets + cleanSheets + tempSheets + 1;
	const totalSheets = data.totalPagesCount || computedTotalSheets;
	const sheetsFormatted = formatRussianSheetsCount(totalSheets);

	// Section 1: PSO rows
	const psoRowsHtml = data.psoRecords
		.map((r, i) => `<tr>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${i + 1}</td>
			<td style="border: 1px solid #000; padding: 4px; white-space: nowrap;">${new Date(r.timestamp).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" })}</td>
			<td style="border: 1px solid #000; padding: 4px; font-weight: bold;">${r.instrumentName}</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${r.batchItemCount}</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${r.testedSampleCount}</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${r.isAzopyramNegative ? "Отрицат." : "ПОЛОЖИТ. (Кровь)"}</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${r.isPhenolphthaleinNegative ? "Отрицат." : "ПОЛОЖИТ. (Щелочь)"}</td>
			<td style="border: 1px solid #000; padding: 4px;">${r.detergentBrand || "—"}</td>
			<td style="border: 1px solid #000; padding: 4px; font-weight: bold; text-align: center; color: ${r.isBatchApproved ? "#000" : "#d00"};">
				${r.isBatchApproved ? "Допущено" : "БРАК"}
			</td>
			<td style="border: 1px solid #000; padding: 4px; font-size: 8pt;">
				${r.operatorStaffFullName}<br>
				<span style="font-size: 7pt; color: #444;">${r.electronicStampVerified ? "[ЭЦП заверен]" : ""}</span>
			</td>
		</tr>`)
		.join("\n");

	// Section 2: Form 257 rows
	const f257RowsHtml = (data.form257Records || [])
		.map((rec, index) => {
			const pt1 = (rec.chamberPoints || []).find((p) => p.pointIndex === 1)?.status === "passed" ? "+" : "-";
			const pt2 = (rec.chamberPoints || []).find((p) => p.pointIndex === 2)?.status === "passed" ? "+" : "-";
			const pt3 = (rec.chamberPoints || []).find((p) => p.pointIndex === 3)?.status === "passed" ? "+" : "-";
			const pt4 = (rec.chamberPoints || []).find((p) => p.pointIndex === 4)?.status === "passed" ? "+" : "-";
			const pt5 = (rec.chamberPoints || []).find((p) => p.pointIndex === 5)?.status === "passed" ? "+" : "-";
			const verdictLabel = rec.isCyclePassed ? "СТЕРИЛЬНО" : "БРАК";

			return `<tr>
				<td style="border: 1px solid #000; text-align:center; font-weight:600;">${index + 1}</td>
				<td style="border: 1px solid #000; text-align:center; white-space:nowrap;">
					${rec.date}<br/>
					<span style="font-size:7.5pt; color:#475569;">Цикл №${rec.cycleNumber}</span>
				</td>
				<td style="border: 1px solid #000;">
					<strong>${rec.sterilizerCode}</strong> (${rec.sterilizerBrandModel})<br/>
					<span style="font-size:7pt; color:#64748b;">Зав. № ${rec.sterilizerSerialNumber}</span>
				</td>
				<td style="border: 1px solid #000;">${rec.itemsDescriptionRu}</td>
				<td style="border: 1px solid #000; text-align:center;">
					${rec.packsCount}<br/>
					<span style="font-size:7pt; color:#64748b;">${rec.packagingNameRu}</span>
				</td>
				<td style="border: 1px solid #000; text-align:center; white-space:nowrap;">
					${rec.actualTemperatureCelsius}°C / ${rec.actualPressureBar} бар<br/>
					<strong>${rec.actualExposureMinutes} мин</strong>
				</td>
				<td style="border: 1px solid #000; font-size:7.5pt;">
					${rec.chemicalIndicatorNameRu}<br/>
					<span style="font-family:monospace; font-weight:bold;">КТ: [${pt1}][${pt2}][${pt3}][${pt4}][${pt5}]</span>
				</td>
				<td style="border: 1px solid #000; text-align:center; font-weight:bold; color:${rec.isCyclePassed ? "#000" : "#d00"};">
					${verdictLabel}
					${rec.rejectionReason ? `<br/><span style="font-size:7pt; font-weight:normal; color:#dc2626;">${rec.rejectionReason}</span>` : ""}
				</td>
				<td style="border: 1px solid #000; font-size:7.5pt;">
					${rec.operatorStaffFullName}<br/>
					<span style="font-size:6.5pt; color:#64748b;">${rec.operatorStaffPosition}</span>
				</td>
				<td style="border: 1px solid #000; font-size:7pt; text-align:center;">
					${rec.isHeadNurseVerified ? `<strong style="color:#059669;">Заверено</strong><br/>${rec.headNurseSignatureFullName || ""}` : "—"}
				</td>
			</tr>`;
		})
		.join("\n");

	// Section 3.1: Bactericidal sessions
	const bacRowsHtml = data.bactericidalSessions
		.map((s, i) => `<tr>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${i + 1}</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${s.date}</td>
			<td style="border: 1px solid #000; padding: 4px;"><strong>${s.roomName}</strong> (${s.deviceBrand})</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${s.sessionStartTime} — ${s.sessionEndTime}</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold;">${s.durationMinutes} мин (${s.durationHours} ч)</td>
			<td style="border: 1px solid #000; padding: 4px;">
				${s.operatingMode === "continuous_presence" ? "В присутствии людей" : s.operatingMode === "pre_op_preparation" ? "Предоперационный" : s.operatingMode === "post_cleaning" ? "После генеральной уборки" : "Периодический"}
			</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold;">${s.cumulativeHoursAfterSession} ч</td>
			<td style="border: 1px solid #000; padding: 4px; font-size: 8pt;">${s.operatorStaffFullName}</td>
		</tr>`)
		.join("\n");

	// Section 3.2: General cleaning rows
	const cleanRowsHtml = data.generalCleanings
		.map((r, i) => `<tr>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${i + 1}</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${r.scheduledDate}</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${new Date(r.actualDateTime).toLocaleDateString("ru-RU")}</td>
			<td style="border: 1px solid #000; padding: 4px; font-weight: bold;">${r.roomName}</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${r.treatedAreaM2} м²</td>
			<td style="border: 1px solid #000; padding: 4px;">${r.disinfectantName} (${r.solutionConcentrationPercent}%)</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${r.exposureTimeMinutes} мин</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${r.uvIrradiationMinutes} мин</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${r.ventilationMinutes} мин</td>
			<td style="border: 1px solid #000; padding: 4px; font-size: 8pt;">${r.operatorStaffFullName}</td>
			<td style="border: 1px solid #000; padding: 4px; font-size: 8pt; text-align: center;">${r.isInspectorVerified ? "Заверено" : "—"}</td>
		</tr>`)
		.join("\n");

	// Section 4: Temperature logs
	const tempRowsHtml = data.temperatureLogs
		.map((r, i) => `<tr>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${i + 1}</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${r.measurementDate}</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${r.measurementPeriod === "morning" ? "Утро (09:00)" : r.measurementPeriod === "evening" ? "Вечер (18:00)" : r.measurementPeriod}</td>
			<td style="border: 1px solid #000; padding: 4px;">
				<strong>${r.equipmentName}</strong><br>
				<span style="font-size: 7.5pt; color: #444;">${r.location} (Прибор: ${r.meterDeviceName}${r.meterSerialNumber ? ` №${r.meterSerialNumber}` : ""})</span>
			</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold; color: ${r.isWithinNorm ? "#000" : "#dc2626"};">
				${r.temperatureCelsius}°C
			</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">
				${r.relativeHumidityPercent !== undefined && r.relativeHumidityPercent !== null ? `${r.relativeHumidityPercent}%` : "—"}
			</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center; font-size: 8pt;">
				${r.targetTempMinCelsius}..${r.targetTempMaxCelsius}°C
			</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold; color: ${r.isWithinNorm ? "#059669" : "#dc2626"};">
				${r.isWithinNorm ? "Норма" : "ОТКЛОНЕНИЕ"}
				${r.correctiveAction ? `<br><span style="font-size: 7pt; font-weight: normal; color: #dc2626;">${r.correctiveAction}</span>` : ""}
			</td>
			<td style="border: 1px solid #000; padding: 4px; font-size: 8pt;">
				${r.operatorStaffFullName}
			</td>
		</tr>`)
		.join("\n");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>Сводный журнал производственного контроля СанПиН (Том №${volume}) — ${clinic.name}</title>
	<style>
		@page {
			size: A4 landscape;
			margin: 12mm 10mm 12mm 10mm;
			@bottom-right {
				content: "Том №${volume} • Лист " counter(page);
				font-family: 'Times New Roman', serif;
				font-size: 8pt;
			}
		}
		body {
			font-family: 'Times New Roman', Times, serif;
			font-size: 8.5pt;
			line-height: 1.2;
			color: #000;
			background: #fff;
			margin: 0;
			padding: 0;
		}
		.page-break {
			page-break-after: always;
			break-after: page;
		}
		.cover-page {
			height: 175mm;
			display: flex;
			flex-direction: column;
			justify-content: space-between;
			border: 2px double #000;
			padding: 12mm;
			box-sizing: border-box;
			text-align: center;
		}
		.cover-gov {
			font-size: 9pt;
			text-transform: uppercase;
			letter-spacing: 0.5px;
			font-weight: bold;
			border-bottom: 1px solid #000;
			padding-bottom: 4px;
			margin-bottom: 8px;
		}
		.cover-clinic {
			font-size: 13pt;
			font-weight: bold;
			margin-top: 4px;
		}
		.cover-legal {
			font-size: 8.5pt;
			color: #222;
			margin-top: 2px;
		}
		.cover-license-badge {
			display: inline-block;
			border: 1px solid #000;
			padding: 3px 10px;
			font-weight: bold;
			font-size: 9pt;
			margin-top: 6px;
			background: #fbfbfb;
		}
		.cover-main-title {
			font-size: 16pt;
			font-weight: bold;
			text-transform: uppercase;
			letter-spacing: 1px;
			margin: 14px 0 6px 0;
			line-height: 1.25;
		}
		.cover-volume {
			font-size: 14pt;
			font-weight: bold;
			color: #000;
			margin: 6px 0;
		}
		.cover-period {
			font-size: 10.5pt;
			font-weight: 600;
			margin-top: 4px;
		}
		.cover-subrules {
			font-size: 8.5pt;
			color: #333;
			max-width: 80%;
			margin: 6px auto;
		}
		.cover-approvals {
			display: flex;
			justify-content: space-between;
			text-align: left;
			font-size: 9pt;
			margin-top: 15px;
			padding: 0 10px;
		}
		.cover-footer-city {
			font-size: 9.5pt;
			font-weight: bold;
			margin-top: 10px;
		}
		.section-header {
			text-align: center;
			margin-bottom: 8px;
			border-bottom: 1px solid #000;
			padding-bottom: 4px;
		}
		.section-number {
			font-size: 9pt;
			font-weight: bold;
			color: #444;
			text-transform: uppercase;
		}
		.section-title {
			font-size: 11.5pt;
			font-weight: bold;
			text-transform: uppercase;
			margin: 2px 0;
		}
		.section-legal-ref {
			font-size: 7.5pt;
			color: #333;
		}
		table {
			width: 100%;
			border-collapse: collapse;
			margin-top: 6px;
			font-size: 8pt;
		}
		th {
			border: 1px solid #000;
			padding: 4px 2px;
			background: #f2f2f2;
			font-size: 7.5pt;
			text-align: center;
			font-weight: bold;
		}
		td {
			border: 1px solid #000;
			padding: 3px 2px;
		}
		.cert-sheet-container {
			height: 175mm;
			display: flex;
			flex-direction: column;
			justify-content: center;
			align-items: center;
			box-sizing: border-box;
		}
		.cert-sheet-box {
			width: 190mm;
			border: 2px solid #000;
			padding: 15mm;
			text-align: center;
			background: #fafafa;
			box-shadow: inset 0 0 0 1px #000;
		}
		.cert-title {
			font-size: 13pt;
			font-weight: bold;
			text-transform: uppercase;
			letter-spacing: 1px;
			margin-bottom: 15px;
			border-bottom: 1px solid #000;
			padding-bottom: 6px;
		}
		.cert-statement {
			font-size: 11pt;
			line-height: 1.6;
			margin: 15px 0 25px 0;
			text-align: justify;
		}
		.cert-signatures {
			display: flex;
			justify-content: space-between;
			margin-top: 25px;
			font-size: 9.5pt;
			text-align: left;
		}
		.stamp-place {
			display: inline-block;
			border: 1px dashed #555;
			padding: 10px 18px;
			font-size: 8.5pt;
			color: #444;
			font-weight: bold;
			margin-top: 15px;
		}
	</style>
</head>
<body>

	<!-- ===================================================================== -->
	<!-- 1. ТИТУЛЬНЫЙ ЛИСТ С РЕКВИЗИТАМИ И ЛИЦЕНЗИЕЙ (COVER PAGE)               -->
	<!-- ===================================================================== -->
	<div class="cover-page">
		<div>
			<div class="cover-gov">МИНИСТЕРСТВО ЗДРАВООХРАНЕНИЯ РОССИЙСКОЙ ФЕДЕРАЦИИ • ОРГАНЫ ГОСУДАРСТВЕННОГО САНИТАРНО-ЭПИДЕМИОЛОГИЧЕСКОГО НАДЗОРА</div>
			<div class="cover-clinic">${clinic.name}</div>
			<div class="cover-legal">ИНН: ${clinic.inn} | ОГРН: ${clinic.ogrn} | Адрес: ${clinic.address}</div>
			<div class="cover-license-badge">Лицензия на медицинскую деятельность: ${license}</div>
		</div>

		<div>
			<div class="cover-main-title">
				СВОДНЫЙ ЖУРНАЛ ПРОИЗВОДСТВЕННОГО КОНТРОЛЯ<br>
				СОБЛЮДЕНИЯ САНИТАРНО-ПРОТИВОЭПИДЕМИЧЕСКОГО РЕЖИМА
			</div>
			<div class="cover-volume">ТОМ № ${volume}</div>
			<div class="cover-period">Отчетный период: <strong>${periodLabel}</strong></div>
			<div class="cover-subrules">
				В соответствии с требованиями Федерального закона № 52-ФЗ «О санитарно-эпидемиологическом благополучии населения»,
				СанПиН 3.3686-21, СанПиН 2.1.3684-21, Приказа Минздравсоцразвития РФ № 706н и Приказа Минздрава РФ № 646н.
			</div>
		</div>

		<div>
			<div class="cover-approvals">
				<div style="width: 48%;">
					<strong>УТВЕРЖДАЮ:</strong><br>
					Главный врач клиники<br>
					___________________ / ${clinic.chiefDoctor} /<br>
					<span style="font-size: 8pt; color: #444;">«___» ____________ 2026 г. [ М.П. ]</span>
				</div>
				<div style="width: 48%; text-align: right;">
					<strong>ОТВЕТСТВЕННЫЙ ЗА КОНТРОЛЬ:</strong><br>
					Главная медицинская сестра<br>
					___________________ / ${clinic.headNurse} /<br>
					<span style="font-size: 8pt; color: #444;">«___» ____________ 2026 г.</span>
				</div>
			</div>
			<div class="cover-footer-city">г. Москва, 2026 год</div>
		</div>
	</div>

	<div class="page-break"></div>

	<!-- ===================================================================== -->
	<!-- 2. РАЗДЕЛ 1: ЖУРНАЛ ПСО (ФОРМА № 366/у)                                -->
	<!-- ===================================================================== -->
	<div class="section-header">
		<div class="section-number">Раздел 1 • СанПиН 3.3686-21 (п. 3584)</div>
		<div class="section-title">ЖУРНАЛ УЧЕТА КАЧЕСТВА ПРЕДСТЕРИЛИЗАЦИОННОЙ ОБРАБОТКИ (ФОРМА № 366/у)</div>
		<div class="section-legal-ref">Азопирамовая, фенолфталеиновая и масляная пробы (выборка 1% от партии изделий, не менее 3–5 единиц) • ${clinic.name}</div>
	</div>

	<table>
		<thead>
			<tr>
				<th style="width: 20px;">№</th>
				<th style="width: 75px;">Дата и время</th>
				<th>Наименование изделий (партия)</th>
				<th style="width: 40px;">В партии</th>
				<th style="width: 40px;">Проб</th>
				<th style="width: 65px;">Азопирам (кровь)</th>
				<th style="width: 65px;">Фенолфталеин</th>
				<th>Моющее / дез. средство</th>
				<th style="width: 65px;">Результат</th>
				<th style="width: 105px;">Исполнитель / ЭЦП</th>
			</tr>
		</thead>
		<tbody>
			${psoRowsHtml || '<tr><td colspan="10" style="text-align: center; padding: 15px;">Записи за отчетный период отсутствуют</td></tr>'}
		</tbody>
	</table>

	<div class="page-break"></div>

	<!-- ===================================================================== -->
	<!-- 3. РАЗДЕЛ 2: ЖУРНАЛ РАБОТЫ СТЕРИЛИЗАТОРОВ (ФОРМА № 257/у)             -->
	<!-- ===================================================================== -->
	<div class="section-header">
		<div class="section-number">Раздел 2 • СанПиН 3.3686-21 (п. 3624, Таблица 3.13)</div>
		<div class="section-title">ЖУРНАЛ КОНТРОЛЯ РАБОТЫ СТЕРИЛИЗАТОРОВ АВТОКЛАВОВ (ФОРМА № 257/у)</div>
		<div class="section-legal-ref">Физический, химический (5 точек камеры КТ 1–5) и бактериологический контроль стерилизации • ${clinic.name}</div>
	</div>

	<table>
		<thead>
			<tr>
				<th style="width: 20px;">№</th>
				<th style="width: 65px;">Дата / Цикл</th>
				<th style="width: 110px;">Стерилизатор (марка, №)</th>
				<th>Стерилизуемые изделия</th>
				<th style="width: 65px;">Кол-во / Упаковка</th>
				<th style="width: 75px;">Режим (T°, P, время)</th>
				<th style="width: 110px;">Индикаторы (5 точек)</th>
				<th style="width: 65px;">Результат</th>
				<th style="width: 85px;">Оператор ЦСО</th>
				<th style="width: 70px;">Заверка</th>
			</tr>
		</thead>
		<tbody>
			${f257RowsHtml || '<tr><td colspan="10" style="text-align:center; padding:15px;">Записи циклов стерилизации отсутствуют</td></tr>'}
		</tbody>
	</table>

	<div class="page-break"></div>

	<!-- ===================================================================== -->
	<!-- 4. РАЗДЕЛ 3: БАКТЕРИЦИДНЫЕ УСТАНОВКИ И ГЕНЕРАЛЬНЫЕ УБОРКИ              -->
	<!-- ===================================================================== -->
	<div class="section-header">
		<div class="section-number">Раздел 3 • Часть 1 • Руководство Р 3.5.1904-04 / СанПиН 3.3686-21</div>
		<div class="section-title">ЖУРНАЛ РЕГИСТРАЦИИ И КОНТРОЛЯ РАБОТЫ БАКТЕРИЦИДНЫХ УСТАНОВОК</div>
		<div class="section-legal-ref">Учет наработки часов ультрафиолетовых ламп и режимов обеззараживания воздуха помещений • ${clinic.name}</div>
	</div>

	<table>
		<thead>
			<tr>
				<th style="width: 20px;">№</th>
				<th style="width: 65px;">Дата</th>
				<th>Помещение и марка аппарата</th>
				<th style="width: 85px;">Время вкл/выкл</th>
				<th style="width: 75px;">Длительность</th>
				<th>Режим обеззараживания</th>
				<th style="width: 75px;">Наработка</th>
				<th style="width: 100px;">Оператор</th>
			</tr>
		</thead>
		<tbody>
			${bacRowsHtml || '<tr><td colspan="8" style="text-align: center; padding: 15px;">Сеансы работы установок отсутствуют</td></tr>'}
		</tbody>
	</table>

	<div style="margin-top: 12px;" class="section-header">
		<div class="section-number">Раздел 3 • Часть 2 • СанПиН 3.3686-21 (раздел IV)</div>
		<div class="section-title">ЖУРНАЛ ПРОВЕДЕНИЯ ГЕНЕРАЛЬНЫХ УБОРОК И ЗАКЛЮЧИТЕЛЬНОЙ ДЕЗИНФЕКЦИИ</div>
		<div class="section-legal-ref">График 1 раз в 7 дней для клинических кабинетов и ЦСО • ${clinic.name}</div>
	</div>

	<table>
		<thead>
			<tr>
				<th style="width: 20px;">№</th>
				<th style="width: 65px;">План</th>
				<th style="width: 65px;">Факт</th>
				<th>Помещение / Кабинет</th>
				<th style="width: 40px;">Площадь</th>
				<th>Дезсредство (%)</th>
				<th style="width: 45px;">Эксп.</th>
				<th style="width: 40px;">УФ</th>
				<th style="width: 45px;">Проветр.</th>
				<th style="width: 90px;">Исполнитель</th>
				<th style="width: 60px;">Контроль</th>
			</tr>
		</thead>
		<tbody>
			${cleanRowsHtml || '<tr><td colspan="11" style="text-align: center; padding: 15px;">Записи генеральных уборок отсутствуют</td></tr>'}
		</tbody>
	</table>

	<div class="page-break"></div>

	<!-- ===================================================================== -->
	<!-- 5. РАЗДЕЛ 4: ТЕМПЕРАТУРНЫЙ РЕЖИМ ХОЛОДИЛЬНИКОВ (ПРИКАЗ 706н)           -->
	<!-- ===================================================================== -->
	<div class="section-header">
		<div class="section-number">Раздел 4 • Приказ Минздравсоцразвития РФ № 706н / Приказ Минздрава РФ № 646н</div>
		<div class="section-title">ЖУРНАЛ РЕГИСТРАЦИИ ТЕМПЕРАТУРНОГО РЕЖИМА И ВЛАЖНОСТИ В ХОЛОДИЛЬНИКАХ</div>
		<div class="section-legal-ref">Ежедневный двукратный контроль условий хранения лекарственных средств и термолабильных препаратов • ${clinic.name}</div>
	</div>

	<table>
		<thead>
			<tr>
				<th style="width: 20px;">№</th>
				<th style="width: 70px;">Дата</th>
				<th style="width: 75px;">Период</th>
				<th>Объект контроля (холодильник, место, прибор)</th>
				<th style="width: 60px;">Факт T°</th>
				<th style="width: 55px;">Влажность</th>
				<th style="width: 70px;">Норма T°</th>
				<th style="width: 85px;">Результат</th>
				<th style="width: 105px;">Ответственный</th>
			</tr>
		</thead>
		<tbody>
			${tempRowsHtml || '<tr><td colspan="9" style="text-align: center; padding: 15px;">Записи температурного режима отсутствуют</td></tr>'}
		</tbody>
	</table>

	<div class="page-break"></div>

	<!-- ===================================================================== -->
	<!-- 6. ЛИСТ СШИВА И ЗАВЕРЕНИЯ ТОМА (CERTIFICATION SHEET)                   -->
	<!-- ===================================================================== -->
	<div class="cert-sheet-container">
		<div class="cert-sheet-box">
			<div class="cert-title">ЗАВЕРИТЕЛЬНАЯ НАДПИСЬ СШИВА ТОМА № ${volume}</div>
			<div class="cert-statement">
				В настоящем Сводном журнале производственного контроля соблюдения санитарно-противоэпидемического режима
				(СанПиН 3.3686-21, СанПиН 2.1.3684-21, Приказ 706н) за период <strong>${periodLabel}</strong><br><br>
				пронумеровано, прошнуровано и скреплено оттиском печати:<br><br>
				<span style="font-size: 14pt; font-weight: bold; text-decoration: underline;">
					${sheetsFormatted.formattedRu}
				</span>
			</div>

			<div class="cert-signatures">
				<div style="width: 48%;">
					Главный врач клиники:<br><br>
					___________________ / ${clinic.chiefDoctor} /
				</div>
				<div style="width: 48%; text-align: right;">
					Главная медицинская сестра:<br><br>
					___________________ / ${clinic.headNurse} /
				</div>
			</div>

			<div style="margin-top: 20px;">
				<div class="stamp-place">
					МЕСТО ДЛЯ ОТТИСКА ПЕЧАТИ [ М.П. ]
				</div>
			</div>

			<div style="margin-top: 15px; font-size: 8pt; color: #444;">
				Медицинская организация: ${clinic.name} (ИНН: ${clinic.inn}, ОГРН: ${clinic.ogrn})<br>
				Лицензия на осуществление медицинской деятельности: ${license}<br>
				Дата оформления и опломбирования сшива: «___» ____________ 2026 г.
			</div>
		</div>
	</div>

</body>
</html>`;
}

/**
 * 1-клик экспорт в единый многостраничный CSV/Excel архив с разделителями страниц и разделов:
 * - Метаданные клиники и лицензии № ЛО41-01137-77/00368421;
 * - Раздел 1: ПСО (Форма № 366/у);
 * - Раздел 2: Автоклавы (Форма № 257/у);
 * - Раздел 3: Бактерицидные установки и Генеральные уборки;
 * - Раздел 4: Температурный режим холодильников;
 * - Лист сшива и заверения тома.
 */
export function exportSanpinConsolidatedArchiveToCsv(data: ConsolidatedSanpinJournalData): string {
	const clinic = data.clinicInfo || DEFAULT_CLINIC_LEGAL;
	const license = clinic.licenseNumber || "№ ЛО41-01137-77/00368421";
	const volume = data.volumeNumber || clinic.volumeNumber || 1;
	const periodLabel = data.periodLabelRu
		? data.periodLabelRu
		: data.dateRange
			? `с ${data.dateRange.from} по ${data.dateRange.to}`
			: `за текущий отчетный период (${new Date().toLocaleDateString("ru-RU")})`;

	const psoSheets = Math.max(1, Math.ceil(data.psoRecords.length / 14));
	const f257Sheets = Math.max(1, Math.ceil(data.form257Records.length / 10));
	const bacSheets = Math.max(1, Math.ceil(data.bactericidalSessions.length / 14));
	const cleanSheets = Math.max(1, Math.ceil(data.generalCleanings.length / 12));
	const tempSheets = Math.max(1, Math.ceil(data.temperatureLogs.length / 14));
	const totalSheets = data.totalPagesCount || (1 + psoSheets + f257Sheets + bacSheets + cleanSheets + tempSheets + 1);
	const sheetsFormatted = formatRussianSheetsCount(totalSheets);

	const lines: string[] = [];

	// HEADER BANNER
	lines.push(`"СВОДНЫЙ ЖУРНАЛ ПРОИЗВОДСТВЕННОГО КОНТРОЛЯ САНПИН (ТОМ № ${volume})"`);
	lines.push(`"Медицинская организация";${escapeCsvField(clinic.name)}`);
	lines.push(`"Лицензия на медицинскую деятельность";${escapeCsvField(license)}`);
	lines.push(`"Реквизиты";${escapeCsvField(`ИНН ${clinic.inn} | ОГРН ${clinic.ogrn} | ${clinic.address}`)}`);
	lines.push(`"Отчетный период";${escapeCsvField(periodLabel)}`);
	lines.push(`"Главный врач";${escapeCsvField(clinic.chiefDoctor)}`);
	lines.push(`"Главная медсестра";${escapeCsvField(clinic.headNurse)}`);
	lines.push("");

	// SECTION 1: PSO FORM 366/U
	lines.push(`"=== РАЗДЕЛ 1: ЖУРНАЛ УЧЕТА КАЧЕСТВА ПРЕДСТЕРИЛИЗАЦИОННОЙ ОБРАБОТКИ (ФОРМА № 366/У) ==="`);
	const psoHeaders = [
		"№ п/п",
		"ID записи",
		"Дата и время",
		"Наименование изделий",
		"Количество в партии",
		"Количество проб (1%)",
		"Азопирамовая проба (кровь)",
		"Фенолфталеиновая проба (щелочь)",
		"Проба с Суданом III",
		"Моющее средство",
		"Результат контроля",
		"Причина брака",
		"ФИО исполнителя",
		"ЭЦП заверен",
		"Примечания",
	];
	lines.push(psoHeaders.join(";"));
	data.psoRecords.forEach((r, i) => {
		lines.push([
			escapeCsvField(i + 1),
			escapeCsvField(r.id),
			escapeCsvField(r.timestamp),
			escapeCsvField(r.instrumentName),
			escapeCsvField(r.batchItemCount),
			escapeCsvField(r.testedSampleCount),
			escapeCsvField(r.isAzopyramNegative ? "Отрицательная (Норма)" : "ПОЛОЖИТЕЛЬНАЯ (Кровь)"),
			escapeCsvField(r.isPhenolphthaleinNegative ? "Отрицательная (Норма)" : "ПОЛОЖИТЕЛЬНАЯ (Щелочь)"),
			escapeCsvField(r.isSudanNegative ? "Отрицательная (Норма)" : "ПОЛОЖИТЕЛЬНАЯ (Масло)"),
			escapeCsvField(r.detergentBrand),
			escapeCsvField(r.isBatchApproved ? "Допущено" : "БРАК"),
			escapeCsvField(r.rejectionReason ?? ""),
			escapeCsvField(r.operatorStaffFullName),
			escapeCsvField(r.electronicStampVerified ? "ДА" : "НЕТ"),
			escapeCsvField(r.notes ?? ""),
		].join(";"));
	});
	lines.push("");

	// SECTION 2: FORM 257/U
	lines.push(`"=== РАЗДЕЛ 2: ЖУРНАЛ КОНТРОЛЯ РАБОТЫ СТЕРИЛИЗАТОРОВ АВТОКЛАВОВ (ФОРМА № 257/У) ==="`);
	const f257Headers = [
		"№ п/п",
		"ID Записи",
		"Дата",
		"Номер цикла",
		"Код аппарата",
		"Марка и модель стерилизатора",
		"Заводской номер",
		"Режим стерилизации",
		"T° факт (°C)",
		"Давление факт (бар)",
		"Время выдержки (мин)",
		"Наименование изделий",
		"Кол-во упаковок",
		"Тип упаковки",
		"Хим. индикатор",
		"КТ-1",
		"КТ-2",
		"КТ-3",
		"КТ-4",
		"КТ-5",
		"Все 5 точек ОК",
		"Результат цикла",
		"Причина брака",
		"Медсестра ЦСО",
		"Заверка ст. медсестры",
		"Цифровой штамп ЭЦП",
		"Примечания",
	];
	lines.push(f257Headers.join(";"));
	data.form257Records.forEach((rec, i) => {
		const pt1 = rec.chamberPoints.find((p) => p.pointIndex === 1)?.status === "passed" ? "ОК" : "БРАК";
		const pt2 = rec.chamberPoints.find((p) => p.pointIndex === 2)?.status === "passed" ? "ОК" : "БРАК";
		const pt3 = rec.chamberPoints.find((p) => p.pointIndex === 3)?.status === "passed" ? "ОК" : "БРАК";
		const pt4 = rec.chamberPoints.find((p) => p.pointIndex === 4)?.status === "passed" ? "ОК" : "БРАК";
		const pt5 = rec.chamberPoints.find((p) => p.pointIndex === 5)?.status === "passed" ? "ОК" : "БРАК";

		lines.push([
			escapeCsvField(i + 1),
			escapeCsvField(rec.id),
			escapeCsvField(rec.date),
			escapeCsvField(rec.cycleNumber),
			escapeCsvField(rec.sterilizerCode),
			escapeCsvField(rec.sterilizerBrandModel),
			escapeCsvField(rec.sterilizerSerialNumber),
			escapeCsvField(rec.regimeNameRu),
			escapeCsvField(rec.actualTemperatureCelsius),
			escapeCsvField(rec.actualPressureBar),
			escapeCsvField(rec.actualExposureMinutes),
			escapeCsvField(rec.itemsDescriptionRu),
			escapeCsvField(rec.packsCount),
			escapeCsvField(rec.packagingNameRu),
			escapeCsvField(rec.chemicalIndicatorNameRu),
			escapeCsvField(pt1),
			escapeCsvField(pt2),
			escapeCsvField(pt3),
			escapeCsvField(pt4),
			escapeCsvField(pt5),
			escapeCsvField(rec.areAllPointsPassed ? "Да" : "Нет"),
			escapeCsvField(rec.isCyclePassed ? "СТЕРИЛЬНО" : "БРАК"),
			escapeCsvField(rec.rejectionReason ?? ""),
			escapeCsvField(rec.operatorStaffFullName),
			escapeCsvField(rec.isHeadNurseVerified ? `Да (${rec.headNurseSignatureFullName ?? ""})` : "Нет"),
			escapeCsvField(rec.digitalStampHash),
			escapeCsvField(rec.notes ?? ""),
		].join(";"));
	});
	lines.push("");

	// SECTION 3.1: BACTERICIDAL
	lines.push(`"=== РАЗДЕЛ 3.1: ЖУРНАЛ РЕГИСТРАЦИИ РАБОТЫ БАКТЕРИЦИДНЫХ УСТАНОВОК (Р 3.5.1904-04) ==="`);
	const bacHeaders = [
		"№ п/п",
		"ID",
		"Дата",
		"Помещение",
		"Марка аппарата",
		"Время начала",
		"Время окончания",
		"Длительность (мин)",
		"Длительность (ч)",
		"Режим работы",
		"Суммарная наработка (ч)",
		"Оператор",
	];
	lines.push(bacHeaders.join(";"));
	data.bactericidalSessions.forEach((s, i) => {
		lines.push([
			escapeCsvField(i + 1),
			escapeCsvField(s.id),
			escapeCsvField(s.date),
			escapeCsvField(s.roomName),
			escapeCsvField(s.deviceBrand),
			escapeCsvField(s.sessionStartTime),
			escapeCsvField(s.sessionEndTime),
			escapeCsvField(s.durationMinutes),
			escapeCsvField(s.durationHours),
			escapeCsvField(s.operatingMode),
			escapeCsvField(s.cumulativeHoursAfterSession),
			escapeCsvField(s.operatorStaffFullName),
		].join(";"));
	});
	lines.push("");

	// SECTION 3.2: GENERAL CLEANING
	lines.push(`"=== РАЗДЕЛ 3.2: ЖУРНАЛ ПРОВЕДЕНИЯ ГЕНЕРАЛЬНЫХ УБОРОК (САНПИН 3.3686-21) ==="`);
	const cleanHeaders = [
		"№ п/п",
		"ID",
		"План дата",
		"Факт дата",
		"Помещение",
		"Тип помещения",
		"Площадь (м²)",
		"Дезсредство",
		"Концентрация (%)",
		"Экспозиция (мин)",
		"УФ (мин)",
		"Проветривание (мин)",
		"Исполнитель",
		"Контроль заверен",
	];
	lines.push(cleanHeaders.join(";"));
	data.generalCleanings.forEach((r, i) => {
		lines.push([
			escapeCsvField(i + 1),
			escapeCsvField(r.id),
			escapeCsvField(r.scheduledDate),
			escapeCsvField(r.actualDateTime),
			escapeCsvField(r.roomName),
			escapeCsvField(r.roomType),
			escapeCsvField(r.treatedAreaM2),
			escapeCsvField(r.disinfectantName),
			escapeCsvField(r.solutionConcentrationPercent),
			escapeCsvField(r.exposureTimeMinutes),
			escapeCsvField(r.uvIrradiationMinutes),
			escapeCsvField(r.ventilationMinutes),
			escapeCsvField(r.operatorStaffFullName),
			escapeCsvField(r.isInspectorVerified ? "ДА" : "НЕТ"),
		].join(";"));
	});
	lines.push("");

	// SECTION 4: REFRIGERATOR TEMPERATURE LOGS
	lines.push(`"=== РАЗДЕЛ 4: ЖУРНАЛ ТЕМПЕРАТУРНОГО РЕЖИМА ХОЛОДИЛЬНИКОВ И ХРАНЕНИЯ ЛС (ПРИКАЗ 706Н) ==="`);
	const tempHeaders = [
		"№ п/п",
		"ID",
		"Дата замера",
		"Период",
		"Объект контроля",
		"Место установки",
		"Прибор учета",
		"Фактическая T° (°C)",
		"Влажность (%)",
		"Норматив T° (°C)",
		"В пределах нормы",
		"Причина отклонения / Меры",
		"Ответственный",
	];
	lines.push(tempHeaders.join(";"));
	data.temperatureLogs.forEach((r, i) => {
		lines.push([
			escapeCsvField(i + 1),
			escapeCsvField(r.id),
			escapeCsvField(r.measurementDate),
			escapeCsvField(r.measurementPeriod === "morning" ? "Утро" : r.measurementPeriod === "evening" ? "Вечер" : r.measurementPeriod),
			escapeCsvField(r.equipmentName),
			escapeCsvField(r.location),
			escapeCsvField(r.meterSerialNumber ? `${r.meterDeviceName} (№${r.meterSerialNumber})` : r.meterDeviceName),
			escapeCsvField(r.temperatureCelsius),
			escapeCsvField(r.relativeHumidityPercent !== undefined && r.relativeHumidityPercent !== null ? r.relativeHumidityPercent : ""),
			escapeCsvField(`${r.targetTempMinCelsius}..${r.targetTempMaxCelsius}`),
			escapeCsvField(r.isWithinNorm ? "ДА" : "ОТКЛОНЕНИЕ"),
			escapeCsvField(r.correctiveAction || r.deviationReason || ""),
			escapeCsvField(r.operatorStaffFullName),
		].join(";"));
	});
	lines.push("");

	// SECTION 5: CERTIFICATION SHEET
	lines.push(`"=== ЗАВЕРИТЕЛЬНЫЙ ЛИСТ СШИВА ТОМА № ${volume} ==="`);
	lines.push(`"Заверительная надпись";${escapeCsvField(`В настоящем журнале пронумеровано, прошнуровано и скреплено печатью ${sheetsFormatted.formattedRu}`)}`);
	lines.push(`"Главный врач";${escapeCsvField(clinic.chiefDoctor)}`);
	lines.push(`"Главная медсестра";${escapeCsvField(clinic.headNurse)}`);
	lines.push(`"Медицинская лицензия";${escapeCsvField(license)}`);
	lines.push(`"Дата заверения";${escapeCsvField(new Date().toLocaleDateString("ru-RU"))}`);

	return `\uFEFF${lines.join("\r\n")}`;
}


