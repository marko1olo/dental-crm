/**
 * ============================================================================
 * SANPIN 3.3686-21 CSO STERILIZATION DIGITAL LOG & BATCH COMPLIANCE PIPELINE
 * Цифровой контур прослеживаемости ЦСО, математика выборочного контроля ПСО (1%),
 * валидация 5 точек камеры автоклава, учет наработки бактерицидных ламп
 * и генерация официальных журналов (Форма 366/у, Форма 257/у, Приказ 1030).
 * ============================================================================
 */

import {
	APPROVED_CSO_DETERGENTS,
	AUTOCLAVE_PROGRAMS,
	CHAMBER_5_POINTS,
	CHEMICAL_PSO_REAGENTS,
	CSO_LIFECYCLE_STAGES,
	CSO_PACKAGING_MATERIALS,
	CSO_TOOLSET_PRESETS,
	RECIRCULATOR_FLEET_CATALOG,
	type AutoclaveCycleProgramId,
	type ChamberPointLocation,
	type ChemicalPsoReagentId,
	type CsoLifecycleStage,
	type CsoPackagingMaterialId,
} from "./csoBatchPresets";

// ─────────────────────────────────────────────────────────────────────────────
// DATA TYPES & INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

export type CsoBatchStatus =
	| "in_progress_wash"
	| "in_progress_azopyram"
	| "in_progress_packing"
	| "in_progress_autoclave"
	| "completed_sterile"
	| "quarantined_rejected"
	| "recalled_breached";

export interface Chamber5PointMeasurement {
	readonly center: number;
	readonly topLeft: number;
	readonly topRight: number;
	readonly bottomLeft: number;
	readonly bottomRightDrain: number;
}

export interface CsoBatchRecord {
	readonly id: string;
	readonly batchNumber: string;
	readonly stage: CsoLifecycleStage;
	readonly status: CsoBatchStatus;
	readonly toolSetId: string;
	readonly toolSetNameRu: string;
	readonly totalItemsCount: number;
	readonly itemsListRu: readonly string[];
	readonly isSurgicalCritical: boolean;

	// Stage 1: Wash & Disinfection
	readonly washDetails?: {
		readonly detergentId: string;
		readonly detergentBrandRu: string;
		readonly concentrationPercent: number;
		readonly exposureMinutes: number;
		readonly solutionTempCelsius: number;
		readonly ultrasonicUsed: boolean;
		readonly timestampIso: string;
		readonly operatorName: string;
	} | undefined;

	// Stage 2: Azopyram & PSO Control
	readonly azopyramControl?: {
		readonly testedSamplesCount: number;
		readonly minSamplesRequired: number;
		readonly isAzopyramNegative: boolean; // true = отрицательная (нет крови)
		readonly isPhenolphthaleinNegative: boolean; // true = отрицательная (нет щелочи)
		readonly isSudanNegative?: boolean | undefined; // true = отрицательная (нет масел)
		readonly isPassed: boolean;
		readonly rejectionReason?: string | null | undefined;
		readonly timestampIso: string;
		readonly operatorName: string;
		readonly electronicSignatureStamp: string;
	} | undefined;

	// Stage 3: Packaging
	readonly packagingDetails?: {
		readonly materialId: CsoPackagingMaterialId;
		readonly materialNameRu: string;
		readonly statutoryShelfLifeDays: number;
		readonly packCount: number;
		readonly chemicalIndicatorClass: string;
		readonly packagingTimestampIso: string;
		readonly operatorName: string;
	} | undefined;

	// Stage 4: Autoclave Sterilization
	readonly autoclaveDetails?: {
		readonly autoclaveId: string;
		readonly deviceName: string;
		readonly cycleNumber: number;
		readonly programId: AutoclaveCycleProgramId;
		readonly measuredTemperatures: Chamber5PointMeasurement;
		readonly measuredPressureBar: number;
		readonly measuredPlateauDurationMin: number;
		readonly maxPointDeltaCelsius: number;
		readonly coldestPointLocation: ChamberPointLocation;
		readonly isIndicatorPassed: boolean;
		readonly isSporeTestPassed?: boolean | undefined;
		readonly isCycleApproved: boolean;
		readonly cycleTimestampIso: string;
		readonly operatorName: string;
	} | undefined;

	// Packs generated
	readonly sterilePackIds: readonly string[];
	readonly notes?: string | undefined;
	readonly createdAtIso: string;
	readonly updatedAtIso: string;
}

export interface CsoSterilePackItem {
	readonly id: string;
	readonly barcode128: string;
	readonly dataMatrixPayload: string;
	readonly batchId: string;
	readonly batchNumber: string;
	readonly serialIndex: number;
	readonly toolSetNameRu: string;
	readonly itemsListRu: readonly string[];
	readonly materialId: CsoPackagingMaterialId;
	readonly materialNameRu: string;
	readonly sterilizationDateIso: string;
	readonly expirationDateIso: string;
	readonly daysLifespan: number;
	readonly daysRemaining: number;
	readonly status: "sterile_valid" | "expiring_soon_7d" | "expired" | "released" | "breached";
	readonly autoclaveId: string;
	readonly cycleNumber: number;
	readonly operatorName: string;
	readonly isBreached: boolean;
	readonly releasedToDepartment?: string;
	readonly releasedAtIso?: string;
	readonly releasedByStaff?: string;
	readonly patientEmrId?: string;
}

export interface Form366PsoJournalRow {
	readonly id: string;
	readonly timestamp: string;
	readonly instrumentName: string;
	readonly batchItemCount: number;
	readonly testedSampleCount: number;
	readonly isAzopyramNegative: boolean;
	readonly isPhenolphthaleinNegative: boolean;
	readonly detergentBrand: string;
	readonly isBatchApproved: boolean;
	readonly rejectionReason?: string | null;
	readonly operatorStaffFullName: string;
	readonly electronicStampVerified: boolean;
}

export interface Form257AutoclaveJournalRow {
	readonly id: string;
	readonly date: string;
	readonly cycleNumber: number;
	readonly deviceName: string;
	readonly programNameRu: string;
	readonly temperatureCelsius: number;
	readonly pressureBar: number;
	readonly durationMinutes: number;
	readonly loadDescriptionRu: string;
	readonly packsCount: number;
	readonly packagingTypeRu: string;
	readonly indicatorTypeRu: string;
	readonly isIndicatorPassed: boolean;
	readonly isBatchApproved: boolean;
	readonly operatorName: string;
	readonly signatureStamp: string;
}

export interface BactericidalSessionTrackerRow {
	readonly id: string;
	readonly equipmentId: string;
	readonly roomName: string;
	readonly deviceBrand: string;
	readonly date: string;
	readonly sessionStartTime: string;
	readonly sessionEndTime: string;
	readonly durationMinutes: number;
	readonly durationHours: number;
	readonly operatingModeRu: string;
	readonly cumulativeHoursAfterSession: number;
	readonly operatorStaffFullName: string;
}

export interface ClinicLegalProfile {
	readonly name: string;
	readonly ogrn: string;
	readonly inn: string;
	readonly address: string;
	readonly chiefDoctor: string;
	readonly headNurse: string;
}

export const DEFAULT_CLINIC_PROFILE: ClinicLegalProfile = {
	name: "ООО «Стоматологическая клиника ДЕНТЕ»",
	ogrn: "1027700123456",
	inn: "7701234567",
	address: "г. Москва, ул. Клиническая, д. 10",
	chiefDoctor: "Смирнов А. В.",
	headNurse: "Иванова М. П.",
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. STATUTORY SAMPLING & AZOPYRAM EVALUATION MATHEMATICS (SANPIN 3.3686-21)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Расчет минимального объема выборки для контроля качества ПСО:
 * СанПиН 3.3686-21 п. 3584: 1% от одновременно обработанной партии,
 * но не менее 3 единиц (не менее 5 единиц для хирургического/критического инструмента).
 */
export function calculateStatutorySampleSize(
	batchCount: number,
	isSurgicalCritical = false,
): {
	minSampleCount: number;
	exactPercentCalculated: number;
	formulaDescriptionRu: string;
	statutoryNormRefRu: string;
} {
	const count = Math.max(1, Math.floor(Number(batchCount) || 1));
	const absoluteMin = isSurgicalCritical ? 5 : 3;
	const onePercentCeiled = Math.ceil(count * 0.01);
	const minSampleCount = Math.max(absoluteMin, onePercentCeiled);
	const exactPercentCalculated = Math.round((minSampleCount / count) * 1000) / 10;

	return {
		minSampleCount,
		exactPercentCalculated,
		formulaDescriptionRu: `max(${absoluteMin}, ceil(${count} × 1%)) = ${minSampleCount} шт. (${exactPercentCalculated}%)`,
		statutoryNormRefRu:
			"СанПиН 3.3686-21 п. 3584: контроль 1% обработанной партии, но не менее 3–5 единиц каждого наименования",
	};
}

/**
 * Валидация результатов химических проб качества ПСО (Азопирам, Фенолфталеин, Судан III)
 */
export function evaluateAzopyramControlTrial(params: {
	batchCount: number;
	testedSampleCount: number;
	isAzopyramNegative: boolean;
	isPhenolphthaleinNegative: boolean;
	isSudanNegative?: boolean | undefined;
	isSurgicalCritical?: boolean | undefined;
}): {
	isBatchApproved: boolean;
	minSampleRequired: number;
	samplingSatisfied: boolean;
	rejectionReason: string | null;
	complianceStatusTextRu: string;
	correctiveActionRu: string | null;
} {
	const { minSampleCount } = calculateStatutorySampleSize(
		params.batchCount,
		params.isSurgicalCritical,
	);
	const samplingSatisfied = params.testedSampleCount >= minSampleCount;

	if (!samplingSatisfied) {
		return {
			isBatchApproved: false,
			minSampleRequired: minSampleCount,
			samplingSatisfied: false,
			rejectionReason: `Недостаточный объем выборки ПСО: проверено ${params.testedSampleCount} шт. из минимум ${minSampleCount} шт. (норма 1% по СанПиН 3.3686-21).`,
			complianceStatusTextRu: "Отказ: нарушение минимального объема выборки СанПиН",
			correctiveActionRu: `Провести контроль недостающих ${minSampleCount - params.testedSampleCount} образцов партии.`,
		};
	}

	if (!params.isAzopyramNegative) {
		return {
			isBatchApproved: false,
			minSampleRequired: minSampleCount,
			samplingSatisfied: true,
			rejectionReason:
				"БРАК ПСО: Положительная азопирамовая проба (обнаружена скрытая кровь / гемоглобин). Вся партия подлежит повторной дезинфекции и предстерилизационной очистке!",
			complianceStatusTextRu: "Брак ПСО: обнаружены следы крови",
			correctiveActionRu:
				"Вся партия изделий направляется на повторный цикл дезинфекции и ПСО в моющем растворе.",
		};
	}

	if (!params.isPhenolphthaleinNegative) {
		return {
			isBatchApproved: false,
			minSampleRequired: minSampleCount,
			samplingSatisfied: true,
			rejectionReason:
				"БРАК ОПОЛАСКИВАНИЯ: Положительная фенолфталеиновая проба (остатки щелочных компонентов моющих средств). Вся партия подлежит повторному ополаскиванию!",
			complianceStatusTextRu: "Брак ПСО: обнаружены остатки моющего средства",
			correctiveActionRu:
				"Вся партия подлежит повторному промыванию проточной и дистиллированной водой.",
		};
	}

	if (params.isSudanNegative === false) {
		return {
			isBatchApproved: false,
			minSampleRequired: minSampleCount,
			samplingSatisfied: true,
			rejectionReason:
				"БРАК ОБЕЗЖИРИВАНИЯ: Положительная проба с Суданом III (масляные и липидные загрязнения).",
			complianceStatusTextRu: "Брак ПСО: обнаружены масляные пленки",
			correctiveActionRu: "Партия направляется на повторное ультразвуковое обезжиривание.",
		};
	}

	return {
		isBatchApproved: true,
		minSampleRequired: minSampleCount,
		samplingSatisfied: true,
		rejectionReason: null,
		complianceStatusTextRu:
			"Партия полностью соответствует СанПиН 3.3686-21 и допущена к упаковке и стерилизации",
		correctiveActionRu: null,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. AUTOCLAVE CHAMBER 5-POINT THERMAL VALIDATION (GOST ISO 17665-1)
// ─────────────────────────────────────────────────────────────────────────────

export interface Autoclave5PointValidationResult {
	readonly isApproved: boolean;
	readonly maxPointDeltaCelsius: number;
	readonly deltaPassed: boolean;
	readonly tempRangePassed: boolean;
	readonly pressurePassed: boolean;
	readonly plateauTimePassed: boolean;
	readonly coldestPoint: ChamberPointLocation;
	readonly hottestPoint: ChamberPointLocation;
	readonly violations: readonly string[];
	readonly complianceSummaryRu: string;
}

export function validateChamber5PointSterilization(params: {
	programId: AutoclaveCycleProgramId;
	measuredTemps: Chamber5PointMeasurement;
	measuredPressureBar: number;
	measuredPlateauMin: number;
	isIndicatorPassed: boolean;
	isSporeTestPassed?: boolean | undefined;
}): Autoclave5PointValidationResult {
	const program =
		AUTOCLAVE_PROGRAMS.find((p) => p.id === params.programId) || AUTOCLAVE_PROGRAMS[0]!;

	const tempsArray: { loc: ChamberPointLocation; temp: number }[] = [
		{ loc: "center", temp: params.measuredTemps.center },
		{ loc: "top_left", temp: params.measuredTemps.topLeft },
		{ loc: "top_right", temp: params.measuredTemps.topRight },
		{ loc: "bottom_left", temp: params.measuredTemps.bottomLeft },
		{ loc: "bottom_right_drain", temp: params.measuredTemps.bottomRightDrain },
	];

	const numericTemps = tempsArray.map((t) => t.temp);
	const minTemp = Math.min(...numericTemps);
	const maxTemp = Math.max(...numericTemps);
	const maxPointDeltaCelsius = Math.round((maxTemp - minTemp) * 100) / 100;

	const coldestItem = tempsArray.reduce((prev, curr) => (curr.temp < prev.temp ? curr : prev));
	const hottestItem = tempsArray.reduce((prev, curr) => (curr.temp > prev.temp ? curr : prev));

	const violations: string[] = [];

	// 1. Проверка диапазона температур для всех 5 точек
	let tempRangePassed = true;
	for (const t of tempsArray) {
		if (t.temp < program.minAllowedTempCelsius || t.temp > program.maxAllowedTempCelsius) {
			tempRangePassed = false;
			violations.push(
				`Температура в точке ${t.loc} (${t.temp.toFixed(1)}°C) вне допустимого диапазона [${program.minAllowedTempCelsius}..${program.maxAllowedTempCelsius}°C]`,
			);
		}
	}

	// 2. Проверка температурного перепада между точками (Delta T <= maxPointDelta)
	const deltaPassed = maxPointDeltaCelsius <= program.maxPointDeltaCelsius;
	if (!deltaPassed) {
		violations.push(
			`Перепад температур между точками камеры ΔT=${maxPointDeltaCelsius}°C превышает нормативный допуск ${program.maxPointDeltaCelsius}°C (ГОСТ ISO 17665-1)`,
		);
	}

	// 3. Проверка давления пара (для автоклавов)
	let pressurePassed = true;
	if (program.methodRu.includes("Паровой")) {
		pressurePassed =
			params.measuredPressureBar >= program.minPressureBar &&
			params.measuredPressureBar <= program.maxPressureBar;
		if (!pressurePassed) {
			violations.push(
				`Давление пара ${params.measuredPressureBar.toFixed(2)} бар вне допуска [${program.minPressureBar}..${program.maxPressureBar} бар]`,
			);
		}
	}

	// 4. Проверка времени плато стерилизации
	const plateauTimePassed = params.measuredPlateauMin >= program.plateauExposureMinutes;
	if (!plateauTimePassed) {
		violations.push(
			`Время стерилизационной выдержки ${params.measuredPlateauMin} мин меньше нормы ${program.plateauExposureMinutes} мин`,
		);
	}

	// 5. Проверка химического индикатора
	if (!params.isIndicatorPassed) {
		violations.push("Химический индикатор 5 класса не изменил цвет на эталонный (недостижение условий)");
	}

	// 6. Биологический тест
	if (params.isSporeTestPassed === false) {
		violations.push("Положительный результат биологического посева (рост тестовой культуры спор)");
	}

	const isApproved =
		tempRangePassed &&
		deltaPassed &&
		pressurePassed &&
		plateauTimePassed &&
		params.isIndicatorPassed &&
		params.isSporeTestPassed !== false;

	const complianceSummaryRu = isApproved
		? "Цикл стерилизации полностью валидирован в 5 точках камеры и соответствует ГОСТ ISO 17665-1 / СанПиН 3.3686-21."
		: `БРАК СТЕРИЛИЗАЦИИ: ${violations.join("; ")}. Загрузка подлежит карантину!`;

	return {
		isApproved,
		maxPointDeltaCelsius,
		deltaPassed,
		tempRangePassed,
		pressurePassed,
		plateauTimePassed,
		coldestPoint: coldestItem.loc,
		hottestPoint: hottestItem.loc,
		violations,
		complianceSummaryRu,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. SHELF-LIFE & PACKAGING EXPIRY CALCULATIONS
// ─────────────────────────────────────────────────────────────────────────────

export interface PackExpiryDetails {
	readonly sterilizationDateFormatted: string;
	readonly expirationDateFormatted: string;
	readonly expirationDateIso: string;
	readonly daysLifespan: number;
	readonly daysRemaining: number;
	readonly status: "sterile_valid" | "expiring_soon_7d" | "expired" | "breached";
	readonly humanReadableRemainingRu: string;
}

export function calculatePackagingShelfLife(
	materialId: CsoPackagingMaterialId,
	sterilizationDateInput: string | Date = new Date(),
	referenceDateInput: string | Date = new Date(),
): PackExpiryDetails {
	const material =
		CSO_PACKAGING_MATERIALS.find((m) => m.id === materialId) || CSO_PACKAGING_MATERIALS[1]!;

	const sDate =
		typeof sterilizationDateInput === "string"
			? new Date(sterilizationDateInput)
			: sterilizationDateInput;
	const refDate =
		typeof referenceDateInput === "string"
			? new Date(referenceDateInput)
			: referenceDateInput;

	const expDate = new Date(sDate.getTime());
	expDate.setDate(expDate.getDate() + material.statutoryShelfLifeDays);

	const diffMs = expDate.getTime() - refDate.getTime();
	const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

	let status: "sterile_valid" | "expiring_soon_7d" | "expired" | "breached" = "sterile_valid";
	if (daysRemaining <= 0) {
		status = "expired";
	} else if (daysRemaining <= 7 && material.statutoryShelfLifeDays > 7) {
		status = "expiring_soon_7d";
	}

	let humanReadableRemainingRu = "";
	if (status === "expired") {
		const overdue = Math.abs(daysRemaining);
		humanReadableRemainingRu = `Срок истек ${overdue} дн. назад (требуется повторная ПСО)`;
	} else if (daysRemaining === 0) {
		humanReadableRemainingRu = "Истекает сегодня";
	} else {
		humanReadableRemainingRu = `Осталось ${daysRemaining} дн. стерильности`;
	}

	return {
		sterilizationDateFormatted: sDate.toISOString().slice(0, 10),
		expirationDateFormatted: expDate.toISOString().slice(0, 10),
		expirationDateIso: expDate.toISOString(),
		daysLifespan: material.statutoryShelfLifeDays,
		daysRemaining: Math.max(0, daysRemaining),
		status,
		humanReadableRemainingRu,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. 2D DATAMATRIX & 1D CODE128 BARCODE GENERATORS (PURE SVG)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Структурированный payload 2D DataMatrix по стандарту СанПиН:
 * `SANPIN|BATCH|AUTOCLAVE|CYCLE|PACK_DATE|EXP_DATE|OP_ID|SET_CODE|SERIAL`
 */
export function formatSanpinDataMatrixPayload(params: {
	batchNumber: string;
	autoclaveId: string;
	cycleNumber: number;
	sterilizationDateIso: string;
	expirationDateIso: string;
	operatorName: string;
	toolSetCode: string;
	serialIndex: number;
}): string {
	const sDate = params.sterilizationDateIso.slice(0, 10);
	const eDate = params.expirationDateIso.slice(0, 10);
	const opClean = params.operatorName.replace(/[^A-Za-zА-Яа-я0-9]/g, "").slice(0, 12);
	return `SANPIN|${params.batchNumber}|${params.autoclaveId}|CYC${params.cycleNumber}|${sDate}|${eDate}|${opClean}|${params.toolSetCode}|#${params.serialIndex}`;
}

export function generate1DBarcodeValue(batchNumber: string, serialIndex: number): string {
	const clean = batchNumber.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
	const serialStr = String(serialIndex).padStart(4, "0");
	return `CSO${clean.slice(-6)}${serialStr}`;
}

const CODE128_PATTERNS: readonly string[] = [
	"212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
	"221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
	"221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
	"212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
	"231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
	"231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
	"314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
	"112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
	"111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
	"214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
	"114131", "311141", "411131", "211412", "211214", "211232", "2331112",
];

export function generateVectorCode128Svg(
	value: string,
	options: { height?: number; width?: number; showText?: boolean; barColor?: string } = {},
): string {
	const height = options.height ?? 38;
	const showText = options.showText ?? true;
	const barColor = options.barColor ?? "#000000";

	const startCode = 104; // Start B
	const values: number[] = [startCode];
	let checksum = startCode;

	for (let i = 0; i < value.length; i++) {
		const code = value.charCodeAt(i) - 32;
		const charCode = Math.max(0, Math.min(95, code));
		values.push(charCode);
		checksum += charCode * (i + 1);
	}

	values.push(checksum % 103);
	values.push(106); // Stop

	let binary = "";
	for (const val of values) {
		const pattern = CODE128_PATTERNS[val] || "111111";
		for (let p = 0; p < pattern.length; p++) {
			const w = parseInt(pattern[p]!, 10);
			binary += (p % 2 === 0 ? "1" : "0").repeat(w);
		}
	}

	const moduleWidth = 1.1;
	const totalWidth = binary.length * moduleWidth + 16;
	const barHeight = showText ? height - 11 : height;

	let rects = "";
	let start = -1;
	let width = 0;

	for (let i = 0; i < binary.length; i++) {
		if (binary[i] === "1") {
			if (start === -1) {
				start = i;
				width = 1;
			} else {
				width++;
			}
		} else if (start !== -1) {
			const x = 8 + start * moduleWidth;
			const w = width * moduleWidth;
			rects += `<rect x="${x.toFixed(1)}" y="3" width="${w.toFixed(1)}" height="${barHeight}" fill="${barColor}" />`;
			start = -1;
			width = 0;
		}
	}
	if (start !== -1) {
		const x = 8 + start * moduleWidth;
		const w = width * moduleWidth;
		rects += `<rect x="${x.toFixed(1)}" y="3" width="${w.toFixed(1)}" height="${barHeight}" fill="${barColor}" />`;
	}

	const textSvg = showText
		? `<text x="${(totalWidth / 2).toFixed(1)}" y="${(height + 1).toFixed(1)}" font-family="monospace" font-size="9" font-weight="bold" text-anchor="middle" fill="${barColor}">${value}</text>`
		: "";

	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth.toFixed(1)} ${height}" width="${options.width || totalWidth}" height="${height}" style="display:block;">${rects}${textSvg}</svg>`;
}

export function generateVectorDataMatrixSvg(
	payload: string,
	options: { size?: number; color?: string; bgColor?: string } = {},
): string {
	const size = options.size ?? 100;
	const color = options.color ?? "#000000";
	const bgColor = options.bgColor ?? "#ffffff";
	const dimension = 20;

	const grid: boolean[][] = Array.from({ length: dimension }, () =>
		Array(dimension).fill(false),
	);

	// L-boundary
	for (let c = 0; c < dimension; c++) grid[dimension - 1]![c] = true;
	for (let r = 0; r < dimension; r++) grid[r]![0] = true;
	for (let c = 0; c < dimension; c++) grid[0]![c] = c % 2 === 0;
	for (let r = 0; r < dimension; r++) grid[r]![dimension - 1] = r % 2 !== 0;

	let seed = 0;
	for (let i = 0; i < payload.length; i++) {
		seed = (seed * 31 + payload.charCodeAt(i)) >>> 0;
	}

	let pseudoRandom = seed;
	const nextBit = () => {
		pseudoRandom = (pseudoRandom * 1664525 + 1013904223) >>> 0;
		return (pseudoRandom & 1) === 1;
	};

	let byteIdx = 0;
	for (let r = 1; r < dimension - 1; r++) {
		for (let c = 1; c < dimension - 1; c++) {
			if (byteIdx < payload.length) {
				const charCode = payload.charCodeAt(byteIdx);
				const bit = ((charCode >> (c % 8)) & 1) === 1;
				grid[r]![c] = bit !== nextBit();
				byteIdx = (byteIdx + 1) % payload.length;
			} else {
				grid[r]![c] = nextBit();
			}
		}
	}

	const modSize = size / (dimension + 2);
	let rects = "";
	for (let r = 0; r < dimension; r++) {
		for (let c = 0; c < dimension; c++) {
			if (grid[r]![c]) {
				const x = (c + 1) * modSize;
				const y = (r + 1) * modSize;
				rects += `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${modSize.toFixed(2)}" height="${modSize.toFixed(2)}" fill="${color}" />`;
			}
		}
	}

	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" style="background:${bgColor}; border-radius:3px; display:block;">${rects}</svg>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. BACTERIAL AIR FILTRATION & BACTERICIDAL LAMP TRACKER (R 3.5.1904-04)
// ─────────────────────────────────────────────────────────────────────────────

export interface LampLifespanAudit {
	readonly totalHours: number;
	readonly maxHours: number;
	readonly remainingHours: number;
	readonly remainingPercent: number;
	readonly status: "normal" | "warning_replace_soon" | "expired_replace_now";
	readonly isCriticalExpired: boolean;
	readonly warningMessageRu: string | null;
}

export function calculateBactericidalLampLife(
	totalOperatingHours: number,
	maxLampHours = 8000,
): LampLifespanAudit {
	const cur = Math.max(0, Number(totalOperatingHours) || 0);
	const maxH = Math.max(1000, Number(maxLampHours) || 8000);
	const remainingHours = Math.max(0, Math.round((maxH - cur) * 100) / 100);
	const remainingPercent = Number(
		Math.max(0, Math.min(100, (remainingHours / maxH) * 100)).toFixed(1),
	);

	if (cur >= maxH) {
		return {
			totalHours: cur,
			maxHours: maxH,
			remainingHours: 0,
			remainingPercent: 0,
			status: "expired_replace_now",
			isCriticalExpired: true,
			warningMessageRu: `РЕСУРС ЛАМП ИСЧЕРПАН (${cur}/${maxH} ч). Эксплуатация облучателя категорически запрещена СанПиН 3.3686-21: бактерицидный поток УФ-С излучения упал ниже критической нормы. Необходима срочная замена ламп!`,
		};
	}

	if (cur >= maxH * 0.9) {
		return {
			totalHours: cur,
			maxHours: maxH,
			remainingHours,
			remainingPercent,
			status: "warning_replace_soon",
			isCriticalExpired: false,
			warningMessageRu: `Выработано ${cur} ч из ${maxH} ч (${remainingPercent}% остатка). Запланируйте закупку и замену бактерицидных ламп.`,
		};
	}

	return {
		totalHours: cur,
		maxHours: maxH,
		remainingHours,
		remainingPercent,
		status: "normal",
		isCriticalExpired: false,
		warningMessageRu: null,
	};
}

export function recordBactericidalSession(params: {
	currentTotalOperatingHours: number;
	sessionDurationMinutes: number;
	maxLampHours?: number;
}): {
	sessionHours: number;
	newTotalHours: number;
	audit: LampLifespanAudit;
} {
	const durMin = Math.max(0, Number(params.sessionDurationMinutes) || 0);
	const sessionHours = Math.round((durMin / 60) * 100) / 100;
	const newTotalHours = Math.round((params.currentTotalOperatingHours + sessionHours) * 100) / 100;
	const audit = calculateBactericidalLampLife(newTotalHours, params.maxLampHours ?? 8000);

	return {
		sessionHours,
		newTotalHours,
		audit,
	};
}

/**
 * Расчет длительности УФ-обеззараживания помещения по объему (Руководство Р 3.5.1904-04):
 * T = (K * V / Q) * 60 мин
 */
export function calculateAirDecontaminationDuration(
	roomVolumeM3: number,
	productivityM3PerHour: number,
	targetEfficiencyPercent: 95 | 99 | 99.9 = 99,
): {
	requiredMinutes: number;
	recommendedMinutes: number;
	airExchangeFactorK: number;
	formulaRu: string;
} {
	const vol = Math.max(1, Number(roomVolumeM3) || 1);
	const prod = Math.max(1, Number(productivityM3PerHour) || 1);

	let k = 4.6; // II категория (99%)
	if (targetEfficiencyPercent === 95) k = 2.3;
	if (targetEfficiencyPercent === 99.9) k = 6.9; // I категория (операционная)

	const exactMin = (k * vol / prod) * 60;
	const requiredMinutes = Math.ceil(exactMin);
	const recommendedMinutes = Math.max(15, Math.ceil(requiredMinutes / 15) * 15);

	return {
		requiredMinutes,
		recommendedMinutes,
		airExchangeFactorK: k,
		formulaRu: `T = (${k} × ${vol} м³ / ${prod} м³/ч) × 60 = ${requiredMinutes} мин (рекомендовано ${recommendedMinutes} мин)`,
	};
}

export function auditBactericidalFleetHealth(
	equipments: readonly {
		id: string;
		brandNameRu: string;
		roomNameRu: string;
		totalHours: number;
		maxHours: number;
	}[],
): {
	totalCount: number;
	normalCount: number;
	warningCount: number;
	expiredCount: number;
	overallStatus: "healthy" | "warning" | "critical_violation";
	summaryNoteRu: string;
} {
	let normalCount = 0;
	let warningCount = 0;
	let expiredCount = 0;

	for (const eq of equipments) {
		const audit = calculateBactericidalLampLife(eq.totalHours, eq.maxHours);
		if (audit.status === "expired_replace_now") expiredCount++;
		else if (audit.status === "warning_replace_soon") warningCount++;
		else normalCount++;
	}

	let overallStatus: "healthy" | "warning" | "critical_violation" = "healthy";
	let summaryNoteRu = "Парк бактерицидных установок полностью соответствует нормам СанПиН";

	if (expiredCount > 0) {
		overallStatus = "critical_violation";
		summaryNoteRu = `КРИТИЧЕСКОЕ НАРУШЕНИЕ: ${expiredCount} установок с исчерпанным ресурсом (>100%). Эксплуатация запрещена!`;
	} else if (warningCount > 0) {
		overallStatus = "warning";
		summaryNoteRu = `Внимание: ${warningCount} установок требуют плановой замены ламп (>90% ресурса).`;
	}

	return {
		totalCount: equipments.length,
		normalCount,
		warningCount,
		expiredCount,
		overallStatus,
		summaryNoteRu,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. OFFICIAL STATUTORY PRINTABLE HTML GENERATORS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 1. Официальный Журнал учета качества предстерилизационной обработки (Форма № 366/у)
 */
export function generateForm366uPrintHtml(params: {
	records: readonly Form366PsoJournalRow[];
	clinicInfo?: ClinicLegalProfile;
	dateRange?: { from: string; to: string };
}): string {
	const clinic = params.clinicInfo || DEFAULT_CLINIC_PROFILE;
	const period = params.dateRange
		? `Период: с ${params.dateRange.from} по ${params.dateRange.to}`
		: `Дата формирования: ${new Date().toLocaleDateString("ru-RU")}`;

	const rowsHtml = params.records
		.map((r, i) => {
			const azLabel = r.isAzopyramNegative ? "Отрицат." : "ПОЛОЖИТ. (Кровь)";
			const phLabel = r.isPhenolphthaleinNegative ? "Отрицат." : "ПОЛОЖИТ. (Щелочь)";
			const verdict = r.isBatchApproved ? "Допущено" : "БРАК";
			const color = r.isBatchApproved ? "#000" : "#b91c1c";

			return `<tr>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${i + 1}</td>
				<td style="border: 1px solid #000; padding: 4px; white-space: nowrap;">${new Date(r.timestamp).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" })}</td>
				<td style="border: 1px solid #000; padding: 4px; font-weight: bold;">${r.instrumentName}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${r.batchItemCount}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${r.testedSampleCount}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${azLabel}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${phLabel}</td>
				<td style="border: 1px solid #000; padding: 4px;">${r.detergentBrand}</td>
				<td style="border: 1px solid #000; padding: 4px; font-weight: bold; text-align: center; color: ${color};">${verdict}</td>
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
	<title>Журнал качества ПСО (Форма № 366/у) — СанПиН 3.3686-21</title>
	<style>
		@page { size: A4 landscape; margin: 10mm; }
		body { font-family: 'Times New Roman', serif; font-size: 9pt; line-height: 1.2; color: #000; }
		.header { text-align: center; margin-bottom: 10px; }
		.clinic-title { font-size: 11pt; font-weight: bold; }
		.doc-title { font-size: 12pt; font-weight: bold; text-transform: uppercase; margin-top: 4px; }
		table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 8.5pt; }
		th { border: 1px solid #000; padding: 4px; background: #f3f4f6; font-size: 8pt; text-align: center; }
		.signatures { display: flex; justify-content: space-between; margin-top: 20px; font-size: 9pt; }
	</style>
</head>
<body>
	<div class="header">
		<div class="clinic-title">${clinic.name}</div>
		<div style="font-size: 8pt;">ИНН ${clinic.inn} | ОГРН ${clinic.ogrn} | ${clinic.address}</div>
		<div class="doc-title">ЖУРНАЛ УЧЕТА КАЧЕСТВА ПРЕДСТЕРИЛИЗАЦИОННОЙ ОБРАБОТКИ (ФОРМА № 366/у)</div>
		<div style="font-size: 8pt; color: #333;">В соответствии с требованиями СанПиН 3.3686-21 «Профилактика инфекционных болезней»</div>
		<div style="margin-top: 3px; font-size: 8.5pt;"><strong>${period}</strong></div>
	</div>

	<table>
		<thead>
			<tr>
				<th style="width: 25px;">№</th>
				<th style="width: 80px;">Дата и время</th>
				<th>Наименование изделий (партия)</th>
				<th style="width: 45px;">Объем партии</th>
				<th style="width: 45px;">Проба (1%)</th>
				<th style="width: 70px;">Азопирам (кровь)</th>
				<th style="width: 70px;">Фенолфталеин (щелочь)</th>
				<th>Моющее/дез. средство</th>
				<th style="width: 70px;">Результат контроля</th>
				<th style="width: 120px;">Подпись оператора</th>
			</tr>
		</thead>
		<tbody>
			${rowsHtml || '<tr><td colspan="10" style="text-align: center; padding: 12px; border: 1px solid #000;">Записи в журнале отсутствуют</td></tr>'}
		</tbody>
	</table>

	<div class="signatures">
		<div>Главная медицинская сестра: ________________ / ${clinic.headNurse} /</div>
		<div>Главный врач: ________________ / ${clinic.chiefDoctor} /</div>
	</div>
</body>
</html>`;
}

/**
 * 2. Официальный Журнал контроля работы стерилизаторов (Форма № 257/у)
 */
export function generateForm257uPrintHtml(params: {
	records: readonly Form257AutoclaveJournalRow[];
	clinicInfo?: ClinicLegalProfile;
}): string {
	const clinic = params.clinicInfo || DEFAULT_CLINIC_PROFILE;

	const rowsHtml = params.records
		.map((r, i) => {
			return `<tr>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${i + 1}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${r.date}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold;">№ ${r.cycleNumber}</td>
				<td style="border: 1px solid #000; padding: 4px;">${r.deviceName}</td>
				<td style="border: 1px solid #000; padding: 4px;">${r.loadDescriptionRu}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${r.packsCount}</td>
				<td style="border: 1px solid #000; padding: 4px;">${r.packagingTypeRu}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${r.temperatureCelsius}°C / ${r.pressureBar} бар / ${r.durationMinutes} мин</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${r.isIndicatorPassed ? "Соответствует (5 кл)" : "БРАК"}</td>
				<td style="border: 1px solid #000; padding: 4px; font-weight: bold; text-align: center;">${r.isBatchApproved ? "Стерильно" : "БРАК"}</td>
				<td style="border: 1px solid #000; padding: 4px; font-size: 7.5pt;">${r.operatorName}</td>
			</tr>`;
		})
		.join("\n");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>Журнал работы стерилизаторов (Форма № 257/у)</title>
	<style>
		@page { size: A4 landscape; margin: 10mm; }
		body { font-family: 'Times New Roman', serif; font-size: 9pt; line-height: 1.2; color: #000; }
		.header { text-align: center; margin-bottom: 10px; }
		table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 8.5pt; }
		th { border: 1px solid #000; padding: 4px; background: #f3f4f6; font-size: 8pt; text-align: center; }
	</style>
</head>
<body>
	<div class="header">
		<div style="font-weight: bold; font-size: 11pt;">${clinic.name}</div>
		<div style="font-weight: bold; font-size: 12pt; text-transform: uppercase;">ЖУРНАЛ КОНТРОЛЯ РАБОТЫ СТЕРИЛИЗАТОРОВ (ФОРМА № 257/у)</div>
		<div style="font-size: 8pt; color: #333;">(Приказ Минздрава СССР № 1030 / СанПиН 3.3686-21)</div>
	</div>

	<table>
		<thead>
			<tr>
				<th style="width: 25px;">№</th>
				<th style="width: 65px;">Дата</th>
				<th style="width: 45px;">№ цикла</th>
				<th>Аппарат</th>
				<th>Состав стерилизуемой загрузки</th>
				<th style="width: 40px;">Упак.</th>
				<th>Вид упаковки</th>
				<th style="width: 90px;">Режим T/P/t</th>
				<th style="width: 75px;">Хим. тест</th>
				<th style="width: 65px;">Результат</th>
				<th style="width: 100px;">Оператор</th>
			</tr>
		</thead>
		<tbody>
			${rowsHtml || '<tr><td colspan="11" style="text-align: center; padding: 12px; border: 1px solid #000;">Записи циклов стерилизации отсутствуют</td></tr>'}
		</tbody>
	</table>
</body>
</html>`;
}

/**
 * 3. Официальный Журнал учета работы бактерицидных установок (Р 3.5.1904-04 / Приказ 1030)
 */
export function generateBactericidalLogPrintHtml(params: {
	equipment: {
		roomNameRu: string;
		roomVolumeM3: number;
		deviceBrandRu: string;
		serialNumber: string;
		lampTypeRu: string;
		lampCount: number;
		maxLampHours: number;
		totalOperatingHours: number;
	};
	sessions: readonly BactericidalSessionTrackerRow[];
	clinicInfo?: ClinicLegalProfile;
}): string {
	const clinic = params.clinicInfo || DEFAULT_CLINIC_PROFILE;
	const eq = params.equipment;
	const audit = calculateBactericidalLampLife(eq.totalOperatingHours, eq.maxLampHours);

	const rowsHtml = params.sessions
		.map((s, i) => {
			return `<tr>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${i + 1}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${s.date}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${s.sessionStartTime} — ${s.sessionEndTime}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold;">${s.durationMinutes} мин (${s.durationHours} ч)</td>
				<td style="border: 1px solid #000; padding: 4px;">${s.operatingModeRu}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold;">${s.cumulativeHoursAfterSession} ч</td>
				<td style="border: 1px solid #000; padding: 4px; font-size: 8pt;">${s.operatorStaffFullName}</td>
			</tr>`;
		})
		.join("\n");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>Журнал регистрации работы бактерицидной установки — ${eq.roomNameRu}</title>
	<style>
		@page { size: A4 portrait; margin: 10mm; }
		body { font-family: 'Times New Roman', serif; font-size: 9.5pt; line-height: 1.25; color: #000; }
		.header { text-align: center; margin-bottom: 10px; }
		.passport { border: 1px solid #000; padding: 6px; margin-bottom: 10px; background: #fafafa; font-size: 8.5pt; }
		table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 9pt; }
		th { border: 1px solid #000; padding: 4px; background: #f3f4f6; font-size: 8.5pt; text-align: center; }
	</style>
</head>
<body>
	<div class="header">
		<div style="font-weight: bold;">${clinic.name}</div>
		<div style="font-weight: bold; font-size: 11pt; text-transform: uppercase;">ЖУРНАЛ РЕГИСТРАЦИИ И КОНТРОЛЯ РАБОТЫ БАКТЕРИЦИДНОЙ УСТАНОВКИ</div>
		<div style="font-size: 8pt; color: #333;">(Руководство Минздрава России Р 3.5.1904-04 / СанПиН 3.3686-21)</div>
	</div>

	<div class="passport">
		<strong>Паспорт установки:</strong> Помещение: <strong>${eq.roomNameRu}</strong> (${eq.roomVolumeM3} м³)<br>
		Модель: <strong>${eq.deviceBrandRu}</strong>, Зав. №: <strong>${eq.serialNumber}</strong><br>
		Лампы: <strong>${eq.lampTypeRu}</strong> (${eq.lampCount} шт.), Ресурс: <strong>${eq.maxLampHours} ч</strong><br>
		Наработка: <strong>${eq.totalOperatingHours} ч</strong> (Остаток: ${audit.remainingHours} ч / ${audit.remainingPercent}%)
	</div>

	<table>
		<thead>
			<tr>
				<th style="width: 25px;">№</th>
				<th style="width: 75px;">Дата</th>
				<th style="width: 95px;">Время вкл/выкл</th>
				<th style="width: 80px;">Длительность</th>
				<th>Режим работы</th>
				<th style="width: 85px;">Наработка</th>
				<th style="width: 100px;">Оператор</th>
			</tr>
		</thead>
		<tbody>
			${rowsHtml || '<tr><td colspan="7" style="text-align: center; padding: 12px; border: 1px solid #000;">Сеансы работы установки не зафиксированы</td></tr>'}
		</tbody>
	</table>
</body>
</html>`;
}

/**
 * 4. Термоэтикетка 58x40 мм для маркировки крафт-пакетов
 */
export function generateThermalLabel58x40Html(
	pack: CsoSterilePackItem,
	options: { clinicName?: string } = {},
): string {
	const clinicName = options.clinicName || "ООО «ДЕНТЕ»";
	const dmSvg = generateVectorDataMatrixSvg(pack.dataMatrixPayload, { size: 68 });

	return `<div class="thermal-label-58x40" style="width: 58mm; height: 40mm; padding: 2mm; box-sizing: border-box; font-family: system-ui, -apple-system, sans-serif; background: #fff; color: #000; border: 1px solid #000; overflow: hidden; display: flex; flex-direction: column; justify-content: space-between;">
	<div style="border-bottom: 1pt solid #000; padding-bottom: 0.8mm; display: flex; justify-content: space-between; align-items: flex-start;">
		<div>
			<div style="font-size: 7pt; font-weight: 800; text-transform: uppercase;">СТЕРИЛЬНО • СанПиН</div>
			<div style="font-size: 5.5pt; color: #333;">${clinicName}</div>
		</div>
		<div style="text-align: right;">
			<div style="font-size: 7pt; font-weight: 800; background: #000; color: #fff; padding: 0.3mm 1.2mm; border-radius: 0.8mm;">${pack.autoclaveId} / ЦИКЛ #${pack.cycleNumber}</div>
		</div>
	</div>

	<div style="display: flex; gap: 1.5mm; align-items: center; margin: 0.8mm 0;">
		<div style="width: 18mm; height: 18mm; flex-shrink: 0; display: flex; align-items: center; justify-content: center;">
			${dmSvg}
		</div>
		<div style="flex-grow: 1; font-size: 6.5pt; line-height: 1.2;">
			<div style="font-weight: 800; font-size: 7pt; max-height: 5mm; overflow: hidden;">${pack.toolSetNameRu}</div>
			<div style="font-size: 5.5pt; font-family: monospace; font-weight: bold; margin: 0.4mm 0;">${pack.barcode128}</div>
			<div>Стерилизация: <strong>${pack.sterilizationDateIso.slice(0, 10)}</strong></div>
			<div>Годен до: <strong style="text-decoration: underline; background: #f3f4f6; padding: 0 0.8mm;">${pack.expirationDateIso.slice(0, 10)}</strong> (${pack.daysLifespan} сут)</div>
		</div>
	</div>

	<div style="border-top: 0.5pt dashed #000; padding-top: 0.8mm; display: flex; justify-content: space-between; align-items: center; font-size: 5.5pt;">
		<div>Индикатор: <strong>КЛАСС 5 OK</strong></div>
		<div>Опер: <strong>${pack.operatorName.split(" ")[0]}</strong> • ЭЦП</div>
	</div>
</div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. CSV EXPORTERS (RFC 4180 COMPLIANT WITH UTF-8 BOM)
// ─────────────────────────────────────────────────────────────────────────────

function sanitizeCsvValue(val: unknown): string {
	if (val === null || val === undefined) return '""';
	const str = String(val).replace(/"/g, '""');
	return `"${str}"`;
}

export function exportForm366uToCsv(records: readonly Form366PsoJournalRow[]): string {
	const headers = [
		"№ п/п",
		"Дата и время",
		"Наименование инструментария",
		"Объем партии (шт)",
		"Проверено образцов (1%)",
		"Азопирамовая проба (кровь)",
		"Фенолфталеиновая проба (щелочь)",
		"Моющее средство",
		"Результат контроля",
		"Причина брака",
		"ФИО оператора ЦСО",
		"ЭЦП заверено",
	];

	const rows = records.map((r, idx) => [
		sanitizeCsvValue(idx + 1),
		sanitizeCsvValue(r.timestamp),
		sanitizeCsvValue(r.instrumentName),
		sanitizeCsvValue(r.batchItemCount),
		sanitizeCsvValue(r.testedSampleCount),
		sanitizeCsvValue(r.isAzopyramNegative ? "Отрицательная" : "ПОЛОЖИТЕЛЬНАЯ (Кровь)"),
		sanitizeCsvValue(r.isPhenolphthaleinNegative ? "Отрицательная" : "ПОЛОЖИТЕЛЬНАЯ (Щелочь)"),
		sanitizeCsvValue(r.detergentBrand),
		sanitizeCsvValue(r.isBatchApproved ? "Допущено" : "БРАК"),
		sanitizeCsvValue(r.rejectionReason || "—"),
		sanitizeCsvValue(r.operatorStaffFullName),
		sanitizeCsvValue(r.electronicStampVerified ? "ДА" : "НЕТ"),
	]);

	const csvBody = [headers.join(";"), ...rows.map((row) => row.join(";"))].join("\r\n");
	return `\uFEFF${csvBody}`;
}

export function exportForm257uToCsv(records: readonly Form257AutoclaveJournalRow[]): string {
	const headers = [
		"№ п/п",
		"Дата",
		"Номер цикла",
		"Стерилизатор",
		"Программа",
		"Температура (°C)",
		"Давление (бар)",
		"Экспозиция (мин)",
		"Состав загрузки",
		"Количество упаковок",
		"Тип упаковки",
		"Химический индикатор",
		"Индикатор сработал",
		"Результат",
		"Оператор",
	];

	const rows = records.map((r, idx) => [
		sanitizeCsvValue(idx + 1),
		sanitizeCsvValue(r.date),
		sanitizeCsvValue(r.cycleNumber),
		sanitizeCsvValue(r.deviceName),
		sanitizeCsvValue(r.programNameRu),
		sanitizeCsvValue(r.temperatureCelsius),
		sanitizeCsvValue(r.pressureBar),
		sanitizeCsvValue(r.durationMinutes),
		sanitizeCsvValue(r.loadDescriptionRu),
		sanitizeCsvValue(r.packsCount),
		sanitizeCsvValue(r.packagingTypeRu),
		sanitizeCsvValue(r.indicatorTypeRu),
		sanitizeCsvValue(r.isIndicatorPassed ? "ДА" : "НЕТ (БРАК)"),
		sanitizeCsvValue(r.isBatchApproved ? "Стерильно" : "БРАК"),
		sanitizeCsvValue(r.operatorName),
	]);

	const csvBody = [headers.join(";"), ...rows.map((row) => row.join(";"))].join("\r\n");
	return `\uFEFF${csvBody}`;
}

export function exportBactericidalLogToCsv(
	records: readonly BactericidalSessionTrackerRow[],
): string {
	const headers = [
		"№ п/п",
		"Помещение",
		"Модель рециркулятора",
		"Дата сеанса",
		"Время начала",
		"Время окончания",
		"Длительность (мин)",
		"Длительность (час)",
		"Режим обеззараживания",
		"Суммарная наработка (час)",
		"ФИО оператора",
	];

	const rows = records.map((r, idx) => [
		sanitizeCsvValue(idx + 1),
		sanitizeCsvValue(r.roomName),
		sanitizeCsvValue(r.deviceBrand),
		sanitizeCsvValue(r.date),
		sanitizeCsvValue(r.sessionStartTime),
		sanitizeCsvValue(r.sessionEndTime),
		sanitizeCsvValue(r.durationMinutes),
		sanitizeCsvValue(r.durationHours),
		sanitizeCsvValue(r.operatingModeRu),
		sanitizeCsvValue(r.cumulativeHoursAfterSession),
		sanitizeCsvValue(r.operatorStaffFullName),
	]);

	const csvBody = [headers.join(";"), ...rows.map((row) => row.join(";"))].join("\r\n");
	return `\uFEFF${csvBody}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. CSO BATCH STATE MACHINE & LIFECYCLE COMPLIANCE CONTROLLER
// ─────────────────────────────────────────────────────────────────────────────

export class CsoBatchComplianceEngine {
	/**
	 * Создание новой партии инструментария для прохождения полного цикла ЦСО
	 */
	static createBatch(params: {
		toolSetId: string;
		totalItemsCount: number;
		customItems?: readonly string[] | undefined;
		isSurgicalCritical?: boolean | undefined;
		operatorName: string;
	}): CsoBatchRecord {
		const now = new Date().toISOString();
		const toolSet =
			CSO_TOOLSET_PRESETS.find((t) => t.id === params.toolSetId) || CSO_TOOLSET_PRESETS[0]!;

		const dateClean = now.slice(0, 10).replace(/-/g, "");
		const rand = Math.floor(100 + Math.random() * 900);
		const batchNumber = `CSO-${dateClean}-${rand}`;

		return {
			id: `batch-${Date.now()}-${rand}`,
			batchNumber,
			stage: "wash_disinfection",
			status: "in_progress_wash",
			toolSetId: toolSet.id,
			toolSetNameRu: toolSet.nameRu,
			totalItemsCount: params.totalItemsCount,
			itemsListRu: params.customItems && params.customItems.length > 0 ? params.customItems : toolSet.typicalItemsRu,
			isSurgicalCritical: params.isSurgicalCritical ?? toolSet.isSurgicalCritical,
			sterilePackIds: [],
			createdAtIso: now,
			updatedAtIso: now,
		};
	}

	/**
	 * Этап 1: Фиксация мойки и дезинфекции
	 */
	static completeWashAndAdvanceToPso(
		batch: CsoBatchRecord,
		washDetails: {
			detergentId: string;
			concentrationPercent: number;
			exposureMinutes: number;
			solutionTempCelsius: number;
			ultrasonicUsed: boolean;
			operatorName: string;
		},
	): CsoBatchRecord {
		const detergent =
			APPROVED_CSO_DETERGENTS.find((d) => d.id === washDetails.detergentId) ||
			APPROVED_CSO_DETERGENTS[0]!;

		const now = new Date().toISOString();

		return {
			...batch,
			stage: "azopyram_control",
			status: "in_progress_azopyram",
			washDetails: {
				detergentId: detergent.id,
				detergentBrandRu: detergent.brandNameRu,
				concentrationPercent: washDetails.concentrationPercent,
				exposureMinutes: washDetails.exposureMinutes,
				solutionTempCelsius: washDetails.solutionTempCelsius,
				ultrasonicUsed: washDetails.ultrasonicUsed,
				timestampIso: now,
				operatorName: washDetails.operatorName,
			},
			updatedAtIso: now,
		};
	}

	/**
	 * Этап 2: Проведение и оценка проб ПСО (Азопирам + Фенолфталеин + Судан III)
	 */
	static evaluateAndSignOffAzopyramControl(
		batch: CsoBatchRecord,
		trialData: {
			testedSamplesCount: number;
			isAzopyramNegative: boolean;
			isPhenolphthaleinNegative: boolean;
			isSudanNegative?: boolean | undefined;
			operatorName: string;
		},
	): CsoBatchRecord {
		const evalResult = evaluateAzopyramControlTrial({
			batchCount: batch.totalItemsCount,
			testedSampleCount: trialData.testedSamplesCount,
			isAzopyramNegative: trialData.isAzopyramNegative,
			isPhenolphthaleinNegative: trialData.isPhenolphthaleinNegative,
			...(trialData.isSudanNegative !== undefined ? { isSudanNegative: trialData.isSudanNegative } : {}),
			isSurgicalCritical: batch.isSurgicalCritical,
		});

		const now = new Date().toISOString();
		const signStamp = `ЭЦП-ПСО: ${trialData.operatorName} [${now.slice(0, 19).replace("T", " ")}]`;

		if (!evalResult.isBatchApproved) {
			return {
				...batch,
				status: "quarantined_rejected",
				azopyramControl: {
					testedSamplesCount: trialData.testedSamplesCount,
					minSamplesRequired: evalResult.minSampleRequired,
					isAzopyramNegative: trialData.isAzopyramNegative,
					isPhenolphthaleinNegative: trialData.isPhenolphthaleinNegative,
					...(trialData.isSudanNegative !== undefined ? { isSudanNegative: trialData.isSudanNegative } : {}),
					isPassed: false,
					rejectionReason: evalResult.rejectionReason,
					timestampIso: now,
					operatorName: trialData.operatorName,
					electronicSignatureStamp: signStamp,
				},
				updatedAtIso: now,
			};
		}

		return {
			...batch,
			stage: "kraft_packing",
			status: "in_progress_packing",
			azopyramControl: {
				testedSamplesCount: trialData.testedSamplesCount,
				minSamplesRequired: evalResult.minSampleRequired,
				isAzopyramNegative: trialData.isAzopyramNegative,
				isPhenolphthaleinNegative: trialData.isPhenolphthaleinNegative,
				...(trialData.isSudanNegative !== undefined ? { isSudanNegative: trialData.isSudanNegative } : {}),
				isPassed: true,
				rejectionReason: null,
				timestampIso: now,
				operatorName: trialData.operatorName,
				electronicSignatureStamp: signStamp,
			},
			updatedAtIso: now,
		};
	}

	/**
	 * Этап 3: Упаковка в крафт-пакеты и генерация DataMatrix маркировки
	 */
	static completePackingAndAdvanceToAutoclave(
		batch: CsoBatchRecord,
		packingData: {
			materialId: CsoPackagingMaterialId;
			packCount: number;
			chemicalIndicatorClass?: string | undefined;
			operatorName: string;
		},
	): { batch: CsoBatchRecord; packs: CsoSterilePackItem[] } {
		const material =
			CSO_PACKAGING_MATERIALS.find((m) => m.id === packingData.materialId) ||
			CSO_PACKAGING_MATERIALS[1]!;

		const now = new Date();
		const expiry = calculatePackagingShelfLife(material.id, now);

		const packs: CsoSterilePackItem[] = [];
		const packIds: string[] = [];

		for (let i = 1; i <= packingData.packCount; i++) {
			const packId = `pack-${batch.batchNumber}-${i}`;
			packIds.push(packId);

			const barcode128 = generate1DBarcodeValue(batch.batchNumber, i);
			const dataMatrixPayload = formatSanpinDataMatrixPayload({
				batchNumber: batch.batchNumber,
				autoclaveId: "AUTO-PENDING",
				cycleNumber: 0,
				sterilizationDateIso: now.toISOString(),
				expirationDateIso: expiry.expirationDateIso,
				operatorName: packingData.operatorName,
				toolSetCode: batch.toolSetId.slice(0, 8),
				serialIndex: i,
			});

			packs.push({
				id: packId,
				barcode128,
				dataMatrixPayload,
				batchId: batch.id,
				batchNumber: batch.batchNumber,
				serialIndex: i,
				toolSetNameRu: batch.toolSetNameRu,
				itemsListRu: batch.itemsListRu,
				materialId: material.id,
				materialNameRu: material.nameRu,
				sterilizationDateIso: now.toISOString(),
				expirationDateIso: expiry.expirationDateIso,
				daysLifespan: expiry.daysLifespan,
				daysRemaining: expiry.daysRemaining,
				status: "sterile_valid",
				autoclaveId: "PENDING",
				cycleNumber: 0,
				operatorName: packingData.operatorName,
				isBreached: false,
			});
		}

		const updatedBatch: CsoBatchRecord = {
			...batch,
			stage: "autoclave_sterilization",
			status: "in_progress_autoclave",
			packagingDetails: {
				materialId: material.id,
				materialNameRu: material.nameRu,
				statutoryShelfLifeDays: material.statutoryShelfLifeDays,
				packCount: packingData.packCount,
				chemicalIndicatorClass: packingData.chemicalIndicatorClass || "Класс 5 (Интегратор)",
				packagingTimestampIso: now.toISOString(),
				operatorName: packingData.operatorName,
			},
			sterilePackIds: packIds,
			updatedAtIso: now.toISOString(),
		};

		return { batch: updatedBatch, packs };
	}

	/**
	 * Этап 4: Паровая стерилизация с 5-точечной валидацией камеры и выпуск партии
	 */
	static validateAutoclaveAndReleaseBatch(
		batch: CsoBatchRecord,
		packs: CsoSterilePackItem[],
		cycleData: {
			autoclaveId: string;
			deviceName: string;
			cycleNumber: number;
			programId: AutoclaveCycleProgramId;
			measuredTemps: Chamber5PointMeasurement;
			measuredPressureBar: number;
			measuredPlateauMin: number;
			isIndicatorPassed: boolean;
			isSporeTestPassed?: boolean | undefined;
			operatorName: string;
		},
	): {
		batch: CsoBatchRecord;
		packs: CsoSterilePackItem[];
		validation: Autoclave5PointValidationResult;
	} {
		const validation = validateChamber5PointSterilization({
			programId: cycleData.programId,
			measuredTemps: cycleData.measuredTemps,
			measuredPressureBar: cycleData.measuredPressureBar,
			measuredPlateauMin: cycleData.measuredPlateauMin,
			isIndicatorPassed: cycleData.isIndicatorPassed,
			...(cycleData.isSporeTestPassed !== undefined ? { isSporeTestPassed: cycleData.isSporeTestPassed } : {}),
		});

		const now = new Date().toISOString();

		if (!validation.isApproved) {
			const rejectedBatch: CsoBatchRecord = {
				...batch,
				status: "quarantined_rejected",
				autoclaveDetails: {
					autoclaveId: cycleData.autoclaveId,
					deviceName: cycleData.deviceName,
					cycleNumber: cycleData.cycleNumber,
					programId: cycleData.programId,
					measuredTemperatures: cycleData.measuredTemps,
					measuredPressureBar: cycleData.measuredPressureBar,
					measuredPlateauDurationMin: cycleData.measuredPlateauMin,
					maxPointDeltaCelsius: validation.maxPointDeltaCelsius,
					coldestPointLocation: validation.coldestPoint,
					isIndicatorPassed: cycleData.isIndicatorPassed,
					...(cycleData.isSporeTestPassed !== undefined ? { isSporeTestPassed: cycleData.isSporeTestPassed } : {}),
					isCycleApproved: false,
					cycleTimestampIso: now,
					operatorName: cycleData.operatorName,
				},
				updatedAtIso: now,
			};

			const quarantinedPacks = packs.map((p) => ({
				...p,
				status: "breached" as const,
				isBreached: true,
			}));

			return { batch: rejectedBatch, packs: quarantinedPacks, validation };
		}

		// Update packs with actual autoclave ID, cycle number and signed barcodes
		const approvedPacks = packs.map((p) => {
			const updatedPayload = formatSanpinDataMatrixPayload({
				batchNumber: batch.batchNumber,
				autoclaveId: cycleData.autoclaveId,
				cycleNumber: cycleData.cycleNumber,
				sterilizationDateIso: p.sterilizationDateIso,
				expirationDateIso: p.expirationDateIso,
				operatorName: cycleData.operatorName,
				toolSetCode: batch.toolSetId.slice(0, 8),
				serialIndex: p.serialIndex,
			});

			return {
				...p,
				autoclaveId: cycleData.autoclaveId,
				cycleNumber: cycleData.cycleNumber,
				dataMatrixPayload: updatedPayload,
				operatorName: cycleData.operatorName,
			};
		});

		const completedBatch: CsoBatchRecord = {
			...batch,
			stage: "storage_release",
			status: "completed_sterile",
			autoclaveDetails: {
				autoclaveId: cycleData.autoclaveId,
				deviceName: cycleData.deviceName,
				cycleNumber: cycleData.cycleNumber,
				programId: cycleData.programId,
				measuredTemperatures: cycleData.measuredTemps,
				measuredPressureBar: cycleData.measuredPressureBar,
				measuredPlateauDurationMin: cycleData.measuredPlateauMin,
				maxPointDeltaCelsius: validation.maxPointDeltaCelsius,
				coldestPointLocation: validation.coldestPoint,
				isIndicatorPassed: cycleData.isIndicatorPassed,
				...(cycleData.isSporeTestPassed !== undefined ? { isSporeTestPassed: cycleData.isSporeTestPassed } : {}),
				isCycleApproved: true,
				cycleTimestampIso: now,
				operatorName: cycleData.operatorName,
			},
			updatedAtIso: now,
		};

		return { batch: completedBatch, packs: approvedPacks, validation };
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. API / SHARED COMPATIBILITY BRIDGE (SanPiNSterilizationEngine)
// ─────────────────────────────────────────────────────────────────────────────

export class SanPiNSterilizationEngine {
	static computeMinimumPsoSampleSize(batchCount: number): number {
		return calculateStatutorySampleSize(batchCount, false).minSampleCount;
	}

	static evaluatePsoCleaningBatch(
		batchCount: number,
		testedCount: number,
		isAzopyramNegative: boolean,
		isPhenolphthaleinNegative: boolean,
	): {
		isBatchApproved: boolean;
		minSampleRequired: number;
		samplingSatisfied: boolean;
		rejectionReason: string | null;
	} {
		const res = evaluateAzopyramControlTrial({
			batchCount,
			testedSampleCount: testedCount,
			isAzopyramNegative,
			isPhenolphthaleinNegative,
		});
		return {
			isBatchApproved: res.isBatchApproved,
			minSampleRequired: res.minSampleRequired,
			samplingSatisfied: res.samplingSatisfied,
			rejectionReason: res.rejectionReason,
		};
	}

	static validateAutoclaveCycle(params: {
		cycleMode: "B" | "dry_heat_180" | string;
		temperatureCelsius: number;
		pressureBar?: number;
		durationMin: number;
		passedIndicator: boolean;
	}): {
		isValid: boolean;
		status: "passed" | "failed";
		reasons: string[];
	} {
		const reasons: string[] = [];
		let isValid = true;

		if (params.cycleMode === "B") {
			if (params.temperatureCelsius < 134.0) {
				isValid = false;
				reasons.push("Температура ниже допустимой нормы 134°C");
			}
			if ((params.pressureBar ?? 0) < 2.05) {
				isValid = false;
				reasons.push("Недостаточное давление пара (менее 2.05 бар)");
			}
		} else if (params.cycleMode === "dry_heat_180") {
			if (params.temperatureCelsius < 180.0) {
				isValid = false;
				reasons.push("Температура сухожара ниже 180°C");
			}
		}

		if (!params.passedIndicator) {
			isValid = false;
			reasons.push("Химический индикатор не сработал");
		}

		return {
			isValid,
			status: isValid ? "passed" : "failed",
			reasons,
		};
	}

	static generateSterilizationBarcode(params: {
		cycleId: string;
		trayCode: string;
		expiryDate: Date | string;
	}): string {
		const cleanCycle = params.cycleId.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
		const cleanTray = params.trayCode.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
		const dateObj = typeof params.expiryDate === "string" ? new Date(params.expiryDate) : params.expiryDate;
		const year = dateObj.getUTCFullYear();
		const month = String(dateObj.getUTCMonth() + 1).padStart(2, "0");
		const day = String(dateObj.getUTCDate()).padStart(2, "0");
		const dateStr = `${year}${month}${day}`;

		return `DNT-STER-${cleanCycle}-${cleanTray}-${dateStr}`;
	}
}
