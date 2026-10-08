/**
 * ============================================================================
 * SANPIN 3.3686-21 AUTOCLAVE & PSO VALIDATION ENGINE (LAYER 2)
 * ============================================================================
 */

import { sha256Hex } from "../../sync/hashing.js";
import { generateDeterministicOrSecureInteger } from "../../utils/idGenerators.js";
import {
	STATUTORY_CHAMBER_5_POINTS,
	STATUTORY_STERILIZATION_REGIMES,
} from "./sanpinNorms.js";
import type {
	ChamberPointEvaluation,
	Form257Record,
	PhysicalSensorsData,
	SterilizationCycleCompliance,
	SterilizationRegimeId,
} from "./types.js";

// ─────────────────────────────────────────────────────────────────────────────
// 1. PSO SAMPLING & AZOPYRAM EVALUATION MATH (ФОРМА № 366/у)
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
	seq?: number,
): string {
	const effectiveSeq = seq ?? generateDeterministicOrSecureInteger(100, 999, dateStr);
	const cleanDate = dateStr.replace(/[^0-9]/g, "").slice(0, 8);
	return `PSO-${cleanDate}-${effectiveSeq.toString().padStart(4, "0")}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. AUTOCLAVE OPERATION CONTROL JOURNAL ENGINE (ФОРМА № 257/у)
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
	const hex = sha256Hex(raw).toUpperCase();
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
