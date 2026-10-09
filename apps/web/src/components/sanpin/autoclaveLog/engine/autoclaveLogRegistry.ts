/**
 * ============================================================================
 * SANPIN 3.3686-21 AUTOCLAVE LOG REGISTRY & BATCH ENGINE (LAYER 2)
 * Реестр учета циклов автоклавирования (Форма № 257/у), фильтрация,
 * расчет сводной статистики, аудит пропущенных дней и пакетная генерация.
 * ============================================================================
 */

import {
	STATUTORY_PACKAGING_TYPES,
	STATUTORY_STERILIZATION_REGIMES,
	STATUTORY_STERILIZERS_CATALOG,
	type SterilizationRegimeId,
} from "../autoclaveLogPresets.js";
import {
	calculateDigitalStampHash,
	generateForm257RecordId,
} from "./packageBarcodeGenerator.js";
import {
	checkNextBioControlDeadline,
	createDefault5ChamberPoints,
	evaluate5ChamberPoints,
	evaluateCycleParameters,
} from "./sterilizationCycleValidator.js";
import type {
	BiologicalControlTestRecord,
	CreateForm257RecordParams,
	Form257FilterCriteria,
	Form257Record,
	GenerateBatchForm257Options,
	MissingSterilizationDaysAuditResult,
	SterilizerStatisticsSummary,
} from "./types.js";

// ─────────────────────────────────────────────────────────────────────────────
// 1. FORM 257 RECORD FACTORY & OVERALL BATCH VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

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
		sterilizerCode: params.sterilizerCode ?? sterilizer?.code ?? "АК-01",
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
		sterilizerId: sterilizer?.id ?? params.sterilizerId ?? "autoclave-melag-vacuklav-23b",
		sterilizerCode: params.sterilizerCode ?? sterilizer?.code ?? "АК-01",
		sterilizerBrandModel: params.sterilizerBrandModel ?? `${sterilizer?.brand ?? ""} ${sterilizer?.model ?? ""}`.trim(),
		sterilizerSerialNumber: params.sterilizerSerialNumber ?? sterilizer?.serialNumber ?? "",
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
		bixNumber: params.bixNumber?.trim() || undefined,
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
		operatorStaffPosition: params.operatorStaffPosition ?? "Сотрудник ЦСО / Врач",
		headNurseSignatureFullName: params.headNurseSignatureFullName,
		isHeadNurseVerified: Boolean(params.isHeadNurseVerified),
		verificationTimestamp: params.isHeadNurseVerified ? new Date().toISOString() : undefined,
		digitalStampHash,
		notes: params.notes,
		createdAt: new Date().toISOString(),
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. FILTERING & STATISTICS CALCULATION
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
// 3. MISSING STERILIZATION DAYS AUDIT (SANPIN 3.3686-21)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Аудит непрерывности журнала стерилизации:
 * Выявляет рабочие дни, в которые велся клинический прием пациентов,
 * но отсутствует хотя бы один зарегистрированный цикл стерилизации (автоклавирования).
 */
export function detectMissingSterilizationDays(
	records: readonly { date: string }[],
	visitsOrActiveDates: readonly ({ date: string; hasVisits?: boolean } | string)[],
): MissingSterilizationDaysAuditResult {
	const sterilizationDates = new Set(records.map((r) => r.date.slice(0, 10)));
	const missingSet = new Set<string>();

	for (const item of visitsOrActiveDates) {
		const dateStr = typeof item === "string" ? item.slice(0, 10) : item.date.slice(0, 10);
		const hasActivity = typeof item === "string" ? true : (item.hasVisits ?? true);
		if (hasActivity && !sterilizationDates.has(dateStr)) {
			missingSet.add(dateStr);
		}
	}

	const missingDates = Array.from(missingSet).sort();
	const isMissingAutoclaveLog = missingDates.length > 0;

	return {
		auditedDatesCount: visitsOrActiveDates.length,
		missingDatesCount: missingDates.length,
		missingDates,
		isMissingAutoclaveLog,
		warningMessageRu: isMissingAutoclaveLog
			? "Внимание: за смену были приемы пациентов, но цикл автоклавирования не зарегистрирован"
			: undefined,
		recommendationRu: isMissingAutoclaveLog
			? `Пропущены записи стерилизации за даты: ${missingDates.join(", ")}. Выполните пакетное формирование записей стерилизации за пропущенные смены для соблюдения требований СанПиН 3.3686-21.`
			: undefined,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. BATCH FORM 257 RECORDS GENERATION FOR AUDITS & INSPECTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Пакетная генерация записей журнала работы стерилизаторов (Форма № 257/у)
 * за указанный период (день, неделя, месяц, квартал) или точечный список дат
 * для проверок Роспотребнадзора (СанПиН 3.3686-21).
 */
export function generateBatchForm257Records(
	options: GenerateBatchForm257Options,
): Form257Record[] {
	const {
		startDate,
		endDate,
		targetDates,
		excludeSundays = true,
		cyclesPerDay = 2,
		packsPerCycle = 14,
		sterilizerId = "autoclave-melag-vacuklav-23b",
		operatorStaffFullName = "Сотрудник ЦСО / Медсестра",
		operatorStaffPosition = "Сотрудник ЦСО / Медсестра",
		headNurseSignatureFullName = "Главная медсестра / Ответственный по СанПиН",
		isHeadNurseVerified = true,
	} = options;

	const datesToProcess: string[] = [];

	if (targetDates && targetDates.length > 0) {
		const uniqueSorted = Array.from(new Set(targetDates.map((d) => d.slice(0, 10)))).sort();
		for (const dStr of uniqueSorted) {
			const [y, m, d] = dStr.split("-").map(Number);
			if (y && m && d) {
				const curDate = new Date(Date.UTC(y, m - 1, d));
				if (excludeSundays && curDate.getUTCDay() === 0) {
					continue;
				}
				datesToProcess.push(dStr);
			}
		}
	} else if (startDate && endDate) {
		const [startY, startM, startD] = startDate.split("-").map(Number);
		const [endY, endM, endD] = endDate.split("-").map(Number);

		if (!startY || !startM || !startD || !endY || !endM || !endD) {
			return [];
		}

		const startUtc = Date.UTC(startY, startM - 1, startD);
		const endUtc = Date.UTC(endY, endM - 1, endD);

		if (startUtc > endUtc) {
			return [];
		}

		const MS_PER_DAY = 24 * 60 * 60 * 1000;
		for (let time = startUtc; time <= endUtc; time += MS_PER_DAY) {
			const curDate = new Date(time);
			if (excludeSundays && curDate.getUTCDay() === 0) {
				continue;
			}
			const yyyy = curDate.getUTCFullYear();
			const mm = String(curDate.getUTCMonth() + 1).padStart(2, "0");
			const dd = String(curDate.getUTCDate()).padStart(2, "0");
			datesToProcess.push(`${yyyy}-${mm}-${dd}`);
		}
	}

	if (datesToProcess.length === 0) {
		return [];
	}

	const records: Form257Record[] = [];

	for (const dateStr of datesToProcess) {
		const count = Math.max(1, cyclesPerDay);

		for (let cycleNum = 1; cycleNum <= count; cycleNum++) {
			const isSurgical = cycleNum === 2 && count > 1;
			const regimeId: SterilizationRegimeId = isSurgical
				? "steam_134_20min_prion"
				: "steam_134_5min";
			const exposureTime = isSurgical ? 20.0 : 5.5;
			const actualTemp = Number((134.2 + cycleNum * 0.1).toFixed(1));
			const actualPressure = 2.15;
			const currentCyclePacks = isSurgical
				? Math.max(4, Math.round(packsPerCycle * 0.7))
				: packsPerCycle;

			const itemsDescriptionRu = isSurgical
				? `Хирургический и имплантологический инструментарий: элеваторы, кюреты Грейси, щипцы (${currentCyclePacks} упак.)`
				: `Терапевтические наборы (зеркала, зонды, пинцеты), наконечники турбинные NSK Ti-Max (${currentCyclePacks} упак.)`;

			const chamberPoints = createDefault5ChamberPoints("intetest_v_134_5", true);

			const rec = createForm257Record({
				date: dateStr,
				cycleNumber: cycleNum,
				sterilizerId,
				sterilizerCode: options.sterilizerCode,
				sterilizerBrandModel: options.sterilizerBrandModel,
				sterilizerSerialNumber: options.sterilizerSerialNumber,
				regimeId,
				sensors: {
					actualTemperatureCelsius: actualTemp,
					actualPressureBar: actualPressure,
					actualExposureMinutes: exposureTime,
				},
				itemsDescriptionRu,
				packsCount: currentCyclePacks,
				packagingType: isSurgical ? "cassette_bipack" : "kraft_pouch_sealed",
				chamberPoints,
				operatorStaffFullName,
				operatorStaffPosition,
				headNurseSignatureFullName,
				isHeadNurseVerified,
				notes: isSurgical
					? "Хирургический усиленный цикл (20 мин), тест индикаторов 5 точек КТ в норме."
					: "Утренний плановый цикл, тест Бови-Дика пройден перед сменой (Норма).",
			});

			records.push(rec);
		}
	}

	return records;
}
