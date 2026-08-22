/**
 * ============================================================================
 * SANPIN 3.3686-21 & FORM № 257/U STERILIZATION JOURNAL ENGINE
 * Математический и нормативный движок верификации циклов стерилизации,
 * оценки 5 контрольных точек камеры, биоконтроля, экспорта в CSV и печати А4.
 * ============================================================================
 */

import {
	STATUTORY_BIO_INDICATORS,
	STATUTORY_CHAMBER_5_POINTS,
	STATUTORY_CHEMICAL_INDICATORS,
	STATUTORY_PACKAGING_TYPES,
	STATUTORY_STERILIZATION_REGIMES,
	STATUTORY_STERILIZERS_CATALOG,
	type BioIndicatorDefinition,
	type ChamberControlPointDefinition,
	type ChemicalIndicatorDefinition,
	type PackagingTypeId,
	type SterilizationRegimeDefinition,
	type SterilizationRegimeId,
	type SterilizerApparatusDefinition,
} from "./autoclaveLogPresets.js";

// ─────────────────────────────────────────────────────────────────────────────
// DATA CONTRACTS & INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

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
	readonly packagingType: PackagingTypeId;
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

export interface ClinicLegalInfo {
	readonly name: string;
	readonly ogrn: string;
	readonly inn: string;
	readonly address: string;
	readonly chiefDoctor: string;
	readonly headNurse: string;
}

export interface Form257FilterCriteria {
	readonly searchQuery?: string | undefined;
	readonly startDate?: string | undefined;
	readonly endDate?: string | undefined;
	readonly sterilizerId?: string | undefined;
	readonly regimeId?: SterilizationRegimeId | "all" | undefined;
	readonly status?: "all" | "sterile_passed" | "rejected_defect" | "quarantine" | undefined;
}

export interface SterilizerStatisticsSummary {
	readonly totalCycles: number;
	readonly successfulCycles: number;
	readonly failedCycles: number;
	readonly successRatePercent: number;
	readonly totalPacksProcessed: number;
	readonly cyclesByRegime: Readonly<Record<string, number>>;
	readonly cyclesBySterilizer: Readonly<Record<string, number>>;
	readonly bioTestsTotal: number;
	readonly bioTestsPassed: number;
	readonly bioTestsFailed: number;
	readonly nextBioControlOverdue: boolean;
	readonly daysUntilNextBioControl: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. CYCLE COMPLIANCE & PHYSICAL SENSORS EVALUATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Проверка соответствия физических параметров цикла стерилизации нормам СанПиН 3.3686-21:
 * - Температура: отклонение не ниже target, не выше max tolerance (обычно target <= T <= target + 4°C).
 * - Давление: отклонение не ниже target tolerance (для паровых режимов).
 * - Время выдержки: время не может быть меньше нормативного.
 */
export function evaluateCycleParameters(
	regimeId: SterilizationRegimeId,
	sensors: PhysicalSensorsData,
): SterilizationCycleCompliance {
	const regime = STATUTORY_STERILIZATION_REGIMES.find((r) => r.id === regimeId);
	if (!regime) {
		return {
			isCompliant: false,
			isTempCompliant: false,
			isPressureCompliant: false,
			isTimeCompliant: false,
			tempDelta: 0,
			pressureDelta: 0,
			timeDelta: 0,
			failureReasons: [`Неизвестный режим стерилизации: ${regimeId}`],
		};
	}

	const failureReasons: string[] = [];

	// Проверка температуры
	const isTempCompliant =
		sensors.actualTemperatureCelsius >= regime.tempToleranceCelsius.min &&
		sensors.actualTemperatureCelsius <= regime.tempToleranceCelsius.max;
	const tempDelta = Number((sensors.actualTemperatureCelsius - regime.targetTemperatureCelsius).toFixed(1));
	if (!isTempCompliant) {
		failureReasons.push(
			`Температура вне нормы: ${sensors.actualTemperatureCelsius}°C (норма ${regime.tempToleranceCelsius.min}–${regime.tempToleranceCelsius.max}°C, отклонение ${tempDelta > 0 ? `+${tempDelta}` : tempDelta}°C)`,
		);
	}

	// Проверка давления (для парового метода)
	let isPressureCompliant = true;
	let pressureDelta = 0;
	if (regime.methodType === "steam_autoclave") {
		isPressureCompliant =
			sensors.actualPressureBar >= regime.pressureToleranceBar.min &&
			sensors.actualPressureBar <= regime.pressureToleranceBar.max;
		pressureDelta = Number((sensors.actualPressureBar - regime.targetPressureBar).toFixed(2));
		if (!isPressureCompliant) {
			failureReasons.push(
				`Давление пара вне нормы: ${sensors.actualPressureBar} бар (норма ${regime.pressureToleranceBar.min}–${regime.pressureToleranceBar.max} бар, отклонение ${pressureDelta > 0 ? `+${pressureDelta}` : pressureDelta} бар)`,
			);
		}
	}

	// Проверка времени экспозиции
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

// ─────────────────────────────────────────────────────────────────────────────
// 2. 5 CHAMBER CONTROL POINTS EVALUATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Оценка результатов химического контроля во всех 5 контрольных точках камеры автоклава.
 * Согласно СанПиН 3.3686-21: если хотя бы в 1 точке индикатор не изменил цвет на эталонный,
 * вся партия инструмента признается нестерильной (брак).
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
			summaryRu: "Контрольные точки не протестированы",
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

	let summaryRu = "Все 5 контрольных точек: СТЕРИЛЬНО (100% переход индикаторов)";
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

/**
 * Создает базовый набор 5 контрольных точек для выбранного режима и индикатора.
 */
export function createDefault5ChamberPoints(
	indicatorId = "intetest_v_134_5",
	allPassed = true,
): ChamberPointEvaluation[] {
	const indicator = STATUTORY_CHEMICAL_INDICATORS.find((ind) => ind.id === indicatorId) ?? STATUTORY_CHEMICAL_INDICATORS[0];
	const initialColor = indicator?.initialColorRu ?? "Сине-зеленый";
	const passedColor = indicator?.passedColorRu ?? "Темно-коричневый";
	const failedColor = indicator?.failedColorRu ?? "Неполный переход цвета";
	const indName = indicator?.tradeNameRu ?? "ИнтеТЕСТ-В-134/5";

	return STATUTORY_CHAMBER_5_POINTS.map((pt) => ({
		pointIndex: pt.pointIndex,
		code: pt.code,
		nameRu: pt.nameRu,
		indicatorId: indicator?.id ?? "intetest_v_134_5",
		indicatorTradeNameRu: indName,
		status: allPassed ? "passed" : "failed",
		initialColorRu: initialColor,
		actualColorRu: allPassed ? passedColor : failedColor,
		notes: allPassed ? "Смена цвета соответствует эталону" : "Недостаточное изменение цвета",
	}));
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. ID GENERATION & CRYPTOGRAPHIC VERIFICATION STAMP
// ─────────────────────────────────────────────────────────────────────────────

export function generateForm257RecordId(date: string, cycleNumber: number, sterilizerCode: string): string {
	const cleanDate = date.replace(/[^0-9]/g, "");
	const paddedCycle = String(cycleNumber).padStart(2, "0");
	const cleanCode = sterilizerCode.replace(/[^a-zA-Z0-9а-яА-ЯёЁ]/g, "").toUpperCase();
	return `F257-${cleanDate}-${cleanCode}-C${paddedCycle}`;
}

/**
 * Вычисляет цифровой хеш-штамп валидации записи журнала Формы № 257/у
 * (предотвращает подделку записей и фиксирует неизменность параметров).
 */
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

// ─────────────────────────────────────────────────────────────────────────────
// 4. FORM 257 RECORD FACTORY & OVERALL BATCH VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateForm257RecordParams {
	readonly date: string;
	readonly cycleNumber: number;
	readonly sterilizerId: string;
	readonly regimeId: SterilizationRegimeId;
	readonly sensors: PhysicalSensorsData;
	readonly itemsDescriptionRu: string;
	readonly packsCount: number;
	readonly packagingType: PackagingTypeId;
	readonly chamberPoints: readonly ChamberPointEvaluation[];
	readonly operatorStaffFullName: string;
	readonly operatorStaffPosition?: string | undefined;
	readonly headNurseSignatureFullName?: string | undefined;
	readonly isHeadNurseVerified?: boolean | undefined;
	readonly bioTestId?: string | undefined;
	readonly bioTestResult?: "sterile_passed" | "growth_failed" | "pending" | undefined;
	readonly notes?: string | undefined;
}

export function createForm257Record(params: CreateForm257RecordParams): Form257Record {
	const sterilizer = STATUTORY_STERILIZERS_CATALOG.find((s) => s.id === params.sterilizerId) ?? STATUTORY_STERILIZERS_CATALOG[0];
	const regime = STATUTORY_STERILIZATION_REGIMES.find((r) => r.id === params.regimeId) ?? STATUTORY_STERILIZATION_REGIMES[0];
	const packaging = STATUTORY_PACKAGING_TYPES.find((p) => p.id === params.packagingType) ?? STATUTORY_PACKAGING_TYPES[0];

	const cycleCompliance = evaluateCycleParameters(regime?.id ?? "steam_134_5min", params.sensors);
	const pointsEvaluation = evaluate5ChamberPoints(params.chamberPoints);

	// Общий вердикт цикла: физические параметры ОК + все 5 точек ОК
	const isCyclePassed = cycleCompliance.isCompliant && pointsEvaluation.areAllPointsPassed;

	const failureReasons: string[] = [...cycleCompliance.failureReasons];
	if (!pointsEvaluation.areAllPointsPassed) {
		failureReasons.push(pointsEvaluation.summaryRu);
	}

	const status = isCyclePassed ? "sterile_passed" : "rejected_defect";
	const rejectionReason = failureReasons.length > 0 ? failureReasons.join("; ") : undefined;

	const id = generateForm257RecordId(params.date, params.cycleNumber, sterilizer?.code ?? "АК-01");
	const digitalStampHash = calculateDigitalStampHash({
		id,
		date: params.date,
		cycleNumber: params.cycleNumber,
		sterilizerCode: sterilizer?.code ?? "АК-01",
		actualTemp: params.sensors.actualTemperatureCelsius,
		actualPressure: params.sensors.actualPressureBar,
		actualTime: params.sensors.actualExposureMinutes,
		isPassed: isCyclePassed,
		operatorName: params.operatorStaffFullName,
	});

	const chemicalIndName = params.chamberPoints[0]?.indicatorTradeNameRu ?? "ИнтеТЕСТ-В-134/5";

	return {
		id,
		date: params.date,
		cycleNumber: params.cycleNumber,
		sterilizerId: sterilizer?.id ?? "autoclave-melag-vacuklav-23b",
		sterilizerCode: sterilizer?.code ?? "АК-01",
		sterilizerBrandModel: `${sterilizer?.brand ?? ""} ${sterilizer?.model ?? ""}`.trim(),
		sterilizerSerialNumber: sterilizer?.serialNumber ?? "",
		regimeId: regime?.id ?? "steam_134_5min",
		regimeNameRu: regime?.nameRu ?? "",
		targetTemperatureCelsius: regime?.targetTemperatureCelsius ?? 134,
		targetPressureBar: regime?.targetPressureBar ?? 2.1,
		targetExposureMinutes: regime?.exposureTimeMinutes ?? 5,
		actualTemperatureCelsius: params.sensors.actualTemperatureCelsius,
		actualPressureBar: params.sensors.actualPressureBar,
		actualExposureMinutes: params.sensors.actualExposureMinutes,
		itemsDescriptionRu: params.itemsDescriptionRu,
		packsCount: params.packsCount,
		packagingType: packaging?.id ?? "kraft_pouch_sealed",
		packagingNameRu: packaging?.nameRu ?? "",
		shelfLifeDays: packaging?.shelfLifeDays ?? 30,
		chamberPoints: params.chamberPoints,
		areAllPointsPassed: pointsEvaluation.areAllPointsPassed,
		chemicalIndicatorNameRu: chemicalIndName,
		bioTestId: params.bioTestId,
		bioTestResult: params.bioTestResult,
		isCyclePassed,
		status,
		rejectionReason,
		operatorStaffFullName: params.operatorStaffFullName,
		operatorStaffPosition: params.operatorStaffPosition ?? "Медсестра ЦСО",
		headNurseSignatureFullName: params.headNurseSignatureFullName,
		isHeadNurseVerified: Boolean(params.isHeadNurseVerified),
		verificationTimestamp: params.isHeadNurseVerified ? new Date().toISOString() : undefined,
		digitalStampHash,
		notes: params.notes,
		createdAt: new Date().toISOString(),
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. BIOLOGICAL CONTROL SCHEDULE & EVALUATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Оценка результата бактериологического контроля стерилизатора.
 * СанПиН 3.3686-21: рост тест-культуры свидетельствует о неэффективности стерилизации.
 */
export function evaluateBioControlResult(record: BiologicalControlTestRecord): {
	readonly isCompliant: boolean;
	readonly statusRu: string;
	readonly conclusionRu: string;
} {
	if (record.result === "pending") {
		return {
			isCompliant: false,
			statusRu: "В процессе инкубации",
			conclusionRu: `Посевы в термостате (${record.incubationHours} ч при ${record.incubationTempCelsius}°C). Результат ожидается ${record.dateReadout}.`,
		};
	}

	if (record.result === "growth_failed") {
		return {
			isCompliant: false,
			statusRu: "БРАК (ОБНАРУЖЕН РОСТ МИКРООРГАНИЗМОВ)",
			conclusionRu: `Аварийная ситуация: обнаружен рост тест-культуры ${record.sporeCultureNameRu}. Стерилизатор ${record.sterilizerCode} подлежит немедленному выводу из эксплуатации и внеплановому ТО.`,
		};
	}

	return {
		isCompliant: true,
		statusRu: "СТЕРИЛЬНО (РОСТ ОТСУТСТВУЕТ)",
		conclusionRu: `Эффективность стерилизации подтверждена. Рост тест-культуры ${record.sporeCultureNameRu} отсутствует. Стерилизатор ${record.sterilizerCode} допущен к эксплуатации.`,
	};
}

/**
 * Проверка сроков планового бактериологического контроля (1 раз в 6 месяцев по СанПиН 3.3686-21).
 */
export function checkNextBioControlDeadline(
	lastBioTestDateStr: string,
	currentDate: Date = new Date(),
): {
	readonly nextDueDate: string;
	readonly isOverdue: boolean;
	readonly daysRemaining: number;
	readonly statusDescriptionRu: string;
} {
	const lastDate = new Date(lastBioTestDateStr);
	if (Number.isNaN(lastDate.getTime())) {
		return {
			nextDueDate: "Не определено",
			isOverdue: true,
			daysRemaining: -999,
			statusDescriptionRu: "Дата предыдущего биоконтроля не указана (ТРЕБУЕТСЯ СРОЧНЫЙ БИОКОНТРОЛЬ)",
		};
	}

	// Добавляем 6 месяцев (182 дня)
	const nextDueDateObj = new Date(lastDate);
	nextDueDateObj.setMonth(nextDueDateObj.getMonth() + 6);

	const diffTime = nextDueDateObj.getTime() - currentDate.getTime();
	const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
	const isOverdue = daysRemaining < 0;

	const yyyy = nextDueDateObj.getFullYear();
	const mm = String(nextDueDateObj.getMonth() + 1).padStart(2, "0");
	const dd = String(nextDueDateObj.getDate()).padStart(2, "0");
	const nextDueDate = `${yyyy}-${mm}-${dd}`;

	let statusDescriptionRu = `Плановый биоконтроль в норме (осталось ${daysRemaining} дн. до ${nextDueDate})`;
	if (isOverdue) {
		statusDescriptionRu = `ВНИМАНИЕ: Срок планового биоконтроля истек (${Math.abs(daysRemaining)} дн. назад, норма 1 раз в 6 мес)`;
	} else if (daysRemaining <= 14) {
		statusDescriptionRu = `ПРЕДУПРЕЖДЕНИЕ: До планового биоконтроля осталось ${daysRemaining} дн. (срок ${nextDueDate})`;
	}

	return {
		nextDueDate,
		isOverdue,
		daysRemaining,
		statusDescriptionRu,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. FILTERING & STATISTICS CALCULATION
// ─────────────────────────────────────────────────────────────────────────────

export function filterForm257Records(
	records: readonly Form257Record[],
	criteria: Form257FilterCriteria,
): Form257Record[] {
	return records.filter((rec) => {
		if (criteria.searchQuery && criteria.searchQuery.trim().length > 0) {
			const query = criteria.searchQuery.trim().toLowerCase();
			const matchId = rec.id.toLowerCase().includes(query);
			const matchItems = rec.itemsDescriptionRu.toLowerCase().includes(query);
			const matchOperator = rec.operatorStaffFullName.toLowerCase().includes(query);
			const matchSterilizer = rec.sterilizerBrandModel.toLowerCase().includes(query) || rec.sterilizerCode.toLowerCase().includes(query);
			if (!matchId && !matchItems && !matchOperator && !matchSterilizer) {
				return false;
			}
		}

		if (criteria.startDate && rec.date < criteria.startDate) {
			return false;
		}

		if (criteria.endDate && rec.date > criteria.endDate) {
			return false;
		}

		if (criteria.sterilizerId && criteria.sterilizerId !== "all" && rec.sterilizerId !== criteria.sterilizerId) {
			return false;
		}

		if (criteria.regimeId && criteria.regimeId !== "all" && rec.regimeId !== criteria.regimeId) {
			return false;
		}

		if (criteria.status && criteria.status !== "all" && rec.status !== criteria.status) {
			return false;
		}

		return true;
	});
}

export function calculateSterilizerStatistics(
	records: readonly Form257Record[],
	bioRecords: readonly BiologicalControlTestRecord[] = [],
): SterilizerStatisticsSummary {
	const totalCycles = records.length;
	let successfulCycles = 0;
	let failedCycles = 0;
	let totalPacksProcessed = 0;
	const cyclesByRegime: Record<string, number> = {};
	const cyclesBySterilizer: Record<string, number> = {};

	for (const rec of records) {
		if (rec.isCyclePassed) {
			successfulCycles++;
		} else {
			failedCycles++;
		}

		totalPacksProcessed += rec.packsCount;

		cyclesByRegime[rec.regimeId] = (cyclesByRegime[rec.regimeId] ?? 0) + 1;
		cyclesBySterilizer[rec.sterilizerCode] = (cyclesBySterilizer[rec.sterilizerCode] ?? 0) + 1;
	}

	const successRatePercent = totalCycles > 0 ? Number(((successfulCycles / totalCycles) * 100).toFixed(1)) : 100;

	const bioTestsTotal = bioRecords.length;
	let bioTestsPassed = 0;
	let bioTestsFailed = 0;
	for (const bio of bioRecords) {
		if (bio.result === "sterile_passed") bioTestsPassed++;
		if (bio.result === "growth_failed") bioTestsFailed++;
	}

	// Находим последний завершенный биоконтроль
	const sortedBio = [...bioRecords].sort((a, b) => b.dateReadout.localeCompare(a.dateReadout));
	const latestBio = sortedBio[0];
	const bioDeadline = checkNextBioControlDeadline(latestBio ? latestBio.dateReadout : "2026-01-01");

	return {
		totalCycles,
		successfulCycles,
		failedCycles,
		successRatePercent,
		totalPacksProcessed,
		cyclesByRegime,
		cyclesBySterilizer,
		bioTestsTotal,
		bioTestsPassed,
		bioTestsFailed,
		nextBioControlOverdue: bioDeadline.isOverdue,
		daysUntilNextBioControl: bioDeadline.daysRemaining,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. RFC 4180 CSV EXPORT ENGINE (WITH UTF-8 BOM)
// ─────────────────────────────────────────────────────────────────────────────

function escapeCsvField(value: unknown): string {
	if (value === null || value === undefined) {
		return '""';
	}
	const str = String(value);
	if (str.includes('"') || str.includes(",") || str.includes(";") || str.includes("\n") || str.includes("\r")) {
		return `"${str.replace(/"/g, '""')}"`;
	}
	return `"${str}"`;
}

/**
 * Экспорт реестра Журнала формы № 257/у в формат CSV (RFC 4180) с UTF-8 BOM.
 */
export function exportForm257ToCsv(records: readonly Form257Record[]): string {
	const BOM = "\uFEFF";
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
		"КТ-1 (Верхний угол)",
		"КТ-2 (Нижний угол)",
		"КТ-3 (Центр камеры)",
		"КТ-4 (У дверцы)",
		"КТ-5 (Задняя стенка)",
		"Все 5 точек ОК",
		"Результат цикла",
		"Причина брака",
		"Медсестра ЦСО",
		"Проверено главной медсестрой",
		"Цифровой штамп валидации",
		"Примечания",
	];

	const rows: string[] = [headers.map(escapeCsvField).join(";")];

	for (const rec of records) {
		const pt1 = rec.chamberPoints.find((p) => p.pointIndex === 1)?.status === "passed" ? "ОК" : "БРАК";
		const pt2 = rec.chamberPoints.find((p) => p.pointIndex === 2)?.status === "passed" ? "ОК" : "БРАК";
		const pt3 = rec.chamberPoints.find((p) => p.pointIndex === 3)?.status === "passed" ? "ОК" : "БРАК";
		const pt4 = rec.chamberPoints.find((p) => p.pointIndex === 4)?.status === "passed" ? "ОК" : "БРАК";
		const pt5 = rec.chamberPoints.find((p) => p.pointIndex === 5)?.status === "passed" ? "ОК" : "БРАК";

		const row = [
			rec.id,
			rec.date,
			rec.cycleNumber,
			rec.sterilizerCode,
			rec.sterilizerBrandModel,
			rec.sterilizerSerialNumber,
			rec.regimeNameRu,
			rec.targetTemperatureCelsius,
			rec.actualTemperatureCelsius,
			rec.targetPressureBar,
			rec.actualPressureBar,
			rec.actualExposureMinutes,
			rec.itemsDescriptionRu,
			rec.packsCount,
			rec.packagingNameRu,
			rec.shelfLifeDays,
			rec.chemicalIndicatorNameRu,
			pt1,
			pt2,
			pt3,
			pt4,
			pt5,
			rec.areAllPointsPassed ? "Да" : "Нет",
			rec.isCyclePassed ? "СТЕРИЛЬНО" : "БРАК",
			rec.rejectionReason ?? "",
			rec.operatorStaffFullName,
			rec.isHeadNurseVerified ? `Да (${rec.headNurseSignatureFullName ?? ""})` : "Нет",
			rec.digitalStampHash,
			rec.notes ?? "",
		];

		rows.push(row.map(escapeCsvField).join(";"));
	}

	return BOM + rows.join("\r\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. OFFICIAL PRINTABLE FORM № 257/U HTML GENERATION (A4 LANDSCAPE)
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_CLINIC_LEGAL_INFO: ClinicLegalInfo = {
	name: 'ООО «ДЕНТЕ КЛИНИК» (Стоматологический центр «DENTE»)',
	ogrn: "1187746123456",
	inn: "7701987654",
	address: "г. Москва, ул. Клиническая, д. 18, стр. 2",
	chiefDoctor: "Д-р Воронов Михаил Александрович",
	headNurse: "Смирнова Анна Викторовна",
};

/**
 * Генерирует официальный печатный макет листа Журнала формы № 257/у
 * в строгом соответствии с приказом Минздрава СССР № 1030 и СанПиН 3.3686-21.
 */
export function generateForm257PrintHtml(
	records: readonly Form257Record[],
	clinicInfo: ClinicLegalInfo = DEFAULT_CLINIC_LEGAL_INFO,
	periodLabelRu = "за текущий отчетный период",
): string {
	const printDateStr = new Date().toLocaleDateString("ru-RU", {
		day: "2-digit",
		month: "long",
		year: "numeric",
	});

	const rowsHtml = records
		.map((rec, index) => {
			const pt1 = rec.chamberPoints.find((p) => p.pointIndex === 1)?.status === "passed" ? "+" : "-";
			const pt2 = rec.chamberPoints.find((p) => p.pointIndex === 2)?.status === "passed" ? "+" : "-";
			const pt3 = rec.chamberPoints.find((p) => p.pointIndex === 3)?.status === "passed" ? "+" : "-";
			const pt4 = rec.chamberPoints.find((p) => p.pointIndex === 4)?.status === "passed" ? "+" : "-";
			const pt5 = rec.chamberPoints.find((p) => p.pointIndex === 5)?.status === "passed" ? "+" : "-";

			const verdictClass = rec.isCyclePassed ? "pass-text" : "fail-text";
			const verdictLabel = rec.isCyclePassed ? "СТЕРИЛЬНО" : "БРАК";

			return `
				<tr>
					<td style="text-align:center; font-weight:600;">${index + 1}</td>
					<td style="text-align:center; white-space:nowrap;">
						${rec.date}<br/>
						<span style="font-size:8pt; color:#475569;">Цикл №${rec.cycleNumber}</span>
					</td>
					<td>
						<strong>${rec.sterilizerCode}</strong> (${rec.sterilizerBrandModel})<br/>
						<span style="font-size:7.5pt; color:#64748b;">Зав. № ${rec.sterilizerSerialNumber}</span>
					</td>
					<td>${rec.itemsDescriptionRu}</td>
					<td style="text-align:center;">
						${rec.packsCount}<br/>
						<span style="font-size:7.5pt; color:#64748b;">${rec.packagingNameRu}</span>
					</td>
					<td style="text-align:center; white-space:nowrap;">
						${rec.actualTemperatureCelsius}°C / ${rec.actualPressureBar} бар<br/>
						<strong>${rec.actualExposureMinutes} мин</strong>
					</td>
					<td style="font-size:7.5pt;">
						${rec.chemicalIndicatorNameRu}<br/>
						<span style="font-family:monospace; font-weight:bold;">КТ: [${pt1}][${pt2}][${pt3}][${pt4}][${pt5}]</span>
					</td>
					<td style="text-align:center; font-weight:bold;" class="${verdictClass}">
						${verdictLabel}
						${rec.rejectionReason ? `<br/><span style="font-size:7pt; font-weight:normal; color:#dc2626;">${rec.rejectionReason}</span>` : ""}
					</td>
					<td style="font-size:8pt;">
						${rec.operatorStaffFullName}<br/>
						<span style="font-size:7pt; color:#64748b;">${rec.operatorStaffPosition}</span>
					</td>
					<td style="font-size:7.5pt; text-align:center;">
						${rec.isHeadNurseVerified ? `Подписано:<br/>${rec.headNurseSignatureFullName ?? clinicInfo.headNurse}` : "—"}
					</td>
				</tr>
			`;
		})
		.join("\n");

	return `
<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="UTF-8">
	<title>Журнал контроля работы стерилизаторов (Форма № 257/у)</title>
	<style>
		@page {
			size: A4 landscape;
			margin: 12mm 10mm 12mm 10mm;
		}
		* {
			box-sizing: border-box;
		}
		body {
			font-family: 'Times New Roman', Times, serif, Arial, sans-serif;
			font-size: 9pt;
			line-height: 1.25;
			color: #000;
			background: #fff;
			margin: 0;
			padding: 0;
		}
		.header-box {
			display: flex;
			justify-content: space-between;
			align-items: flex-start;
			border-bottom: 2px solid #000;
			padding-bottom: 6px;
			margin-bottom: 8px;
		}
		.clinic-title {
			font-size: 11pt;
			font-weight: bold;
			text-transform: uppercase;
		}
		.clinic-sub {
			font-size: 8pt;
			color: #333;
		}
		.form-stamp {
			text-align: right;
			font-size: 8pt;
		}
		.form-stamp strong {
			font-size: 9pt;
		}
		.journal-title {
			text-align: center;
			margin: 10px 0 6px 0;
		}
		.journal-title h1 {
			font-size: 13pt;
			margin: 0;
			font-weight: bold;
			letter-spacing: 0.5px;
		}
		.journal-title h2 {
			font-size: 9.5pt;
			margin: 3px 0 0 0;
			font-weight: normal;
			color: #333;
		}
		table.form-table {
			width: 100%;
			border-collapse: collapse;
			margin-top: 8px;
			font-size: 8pt;
		}
		table.form-table th,
		table.form-table td {
			border: 1px solid #000;
			padding: 4px 5px;
			vertical-align: middle;
		}
		table.form-table th {
			background-color: #f1f5f9;
			font-weight: bold;
			text-align: center;
			font-size: 7.5pt;
		}
		.pass-text {
			color: #166534;
		}
		.fail-text {
			color: #991b1b;
		}
		.footer-sign {
			margin-top: 14px;
			display: flex;
			justify-content: space-between;
			font-size: 8.5pt;
		}
		.sign-col {
			width: 45%;
		}
		.sign-line {
			border-bottom: 1px solid #000;
			margin-top: 18px;
			display: flex;
			justify-content: space-between;
			font-size: 7.5pt;
		}
		@media print {
			.no-print { display: none !important; }
			body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
		}
	</style>
</head>
<body>
	<div class="header-box">
		<div>
			<div class="clinic-title">${clinicInfo.name}</div>
			<div class="clinic-sub">ОГРН: ${clinicInfo.ogrn} • ИНН: ${clinicInfo.inn} • Адрес: ${clinicInfo.address}</div>
		</div>
		<div class="form-stamp">
			<strong>МЕДИЦИНСКАЯ ДОКУМЕНТАЦИЯ</strong><br/>
			Форма № 257/у<br/>
			Утверждена Минздравом СССР № 1030<br/>
			СанПиН 3.3686-21 (раздел III)
		</div>
	</div>

	<div class="journal-title">
		<h1>ЖУРНАЛ КОНТРОЛЯ РАБОТЫ СТЕРИЛИЗАТОРОВ ВОЗДУШНОГО, ПАРОВОГО (АВТОКЛАВА)</h1>
		<h2>Отчетный период: ${periodLabelRu} • Дата формирования: ${printDateStr}</h2>
	</div>

	<table class="form-table">
		<thead>
			<tr>
				<th style="width:3%;">№ п/п</th>
				<th style="width:7%;">Дата и № цикла</th>
				<th style="width:12%;">Марка, номер стерилизатора</th>
				<th style="width:20%;">Наименование стерилизуемых изделий</th>
				<th style="width:9%;">Кол-во и вид упаковки</th>
				<th style="width:10%;">Режим (T°, P, время)</th>
				<th style="width:14%;">Химический контроль (5 точек)</th>
				<th style="width:8%;">Результат контроля</th>
				<th style="width:10%;">Подпись проводившего</th>
				<th style="width:7%;">Отметка гл. медсестры</th>
			</tr>
			<tr style="background:#f8fafc; font-size:7pt; color:#475569;">
				<th>1</th>
				<th>2</th>
				<th>3</th>
				<th>4</th>
				<th>5</th>
				<th>6</th>
				<th>7</th>
				<th>8</th>
				<th>9</th>
				<th>10</th>
			</tr>
		</thead>
		<tbody>
			${rowsHtml}
		</tbody>
	</table>

	<div class="footer-sign">
		<div class="sign-col">
			<div>Ответственный за стерилизацию в ЦСО: <strong>${clinicInfo.headNurse}</strong></div>
			<div class="sign-line">
				<span>(должность)</span>
				<span>(подпись)</span>
				<span>(расшифровка подписи)</span>
			</div>
		</div>
		<div class="sign-col">
			<div>Главный врач / Руководитель клиники: <strong>${clinicInfo.chiefDoctor}</strong></div>
			<div class="sign-line">
				<span>(должность)</span>
				<span>(подпись)</span>
				<span>(расшифровка подписи)</span>
			</div>
		</div>
	</div>
</body>
</html>
	`;
}
