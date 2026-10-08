/**
 * ============================================================================
 * SANPIN 3.3686-21 STERILIZATION & PSO: CORE CALCULATIONS & VALIDATORS
 * (Layer 1: Pure Regulatory Math, Validation Logic & Deterministic Hashes)
 * ============================================================================
 */

import {
	DEFAULT_CHAMBER_POINTS_TEMPLATE,
	STATUTORY_PACKAGING_TYPES,
	STATUTORY_REGIMES,
	type ChamberControlPoint,
	type KraftPackagingType,
	type SterilityCalculation,
	type SterilityStatus,
	type SterilizationRegimeCode,
} from "./types.js";

// ─────────────────────────────────────────────────────────────────────────────
// 4. CORE CALCULATION & VALIDATION LOGIC
// ─────────────────────────────────────────────────────────────────────────────

export function calculatePsoSampleRequirements(
	batchCount: number,
	isSurgicalOrCritical = false,
	itemTypesCount = 1,
): {
	readonly minSampleCount: number;
	readonly statutoryPercent: number;
	readonly formulaExplanationRu: string;
} {
	const count = Math.max(1, Math.floor(Number(batchCount) || 1));
	const typesCount = Math.max(1, Math.floor(Number(itemTypesCount) || 1));
	const statutoryPercent = 1;
	const computedOnePercent = Math.ceil((count * statutoryPercent) / 100);
	const baselineFloor = isSurgicalOrCritical ? 5 : 3;
	// Согласно СанПиН 3.3686-21 и МУ 287-113: не менее 1% партии и не менее 3-5 шт. каждого наименования
	const minSampleCount = Math.max(baselineFloor * typesCount, computedOnePercent);

	const formulaExplanationRu =
		typesCount > 1
			? `Минимальный порог СанПиН: ${baselineFloor} шт. × ${typesCount} наим. = ${minSampleCount} шт. (не менее 1% от ${count} шт.)`
			: count <= (isSurgicalOrCritical ? 500 : 300)
				? `Минимальный порог СанПиН: ${baselineFloor} шт. (для партии из ${count} шт.)`
				: `1% от партии: ${computedOnePercent} шт. (округление вверх)`;

	return {
		minSampleCount,
		statutoryPercent,
		formulaExplanationRu,
	};
}

export function evaluatePsoTrial(params: {
	batchCount: number;
	testedSampleCount: number;
	isAzopyramNegative: boolean;
	isPhenolphthaleinNegative: boolean;
	isSudanNegative?: boolean;
	isSurgicalOrCritical?: boolean;
	itemTypesCount?: number;
}): {
	readonly isBatchApproved: boolean;
	readonly isBatchBlocked: boolean;
	readonly minSampleRequired: number;
	readonly isSamplingSufficient: boolean;
	readonly rejectionReason: string | null;
	readonly clinicalAdviceRu: string;
} {
	const { batchCount, testedSampleCount, isAzopyramNegative, isPhenolphthaleinNegative } = params;
	const isSudanNegative = params.isSudanNegative ?? true;
	const { minSampleCount } = calculatePsoSampleRequirements(batchCount, params.isSurgicalOrCritical, params.itemTypesCount);
	const isSamplingSufficient = testedSampleCount >= minSampleCount;

	if (!isSamplingSufficient) {
		return {
			isBatchApproved: false,
			isBatchBlocked: true,
			minSampleRequired: minSampleCount,
			isSamplingSufficient: false,
			rejectionReason: `Недостаточный объем выборки ПСО: проверено ${testedSampleCount} шт. из необходимых ${minSampleCount} шт. (СанПиН 3.3686-21: не менее 1% партии, мин. ${minSampleCount} шт.).`,
			clinicalAdviceRu: `Необходимо отобрать еще минимум ${minSampleCount - testedSampleCount} шт. инструментов и повторить контрольные пробы.`,
		};
	}

	if (!isAzopyramNegative) {
		return {
			isBatchApproved: false,
			isBatchBlocked: true,
			minSampleRequired: minSampleCount,
			isSamplingSufficient: true,
			rejectionReason:
				"Положительная азопирамовая проба (обнаружен гемоглобин / скрытая кровь — фиолетово-синее окрашивание). Немедленная блокировка партии на повторную промывку и нейтрализацию.",
			clinicalAdviceRu:
				"Немедленная блокировка партии! Вся партия инструментов подлежит повторной дезинфекции, предстерилизационной очистке и контролю качества.",
		};
	}

	if (!isPhenolphthaleinNegative) {
		return {
			isBatchApproved: false,
			isBatchBlocked: true,
			minSampleRequired: minSampleCount,
			isSamplingSufficient: true,
			rejectionReason:
				"Положительная фенолфталеиновая проба (обнаружены остатки щелочных компонентов моющих средств — розово-малиновое окрашивание). Немедленная блокировка партии на повторную промывку и нейтрализацию.",
			clinicalAdviceRu:
				"Немедленная блокировка партии! Вся партия инструментов подлежит повторному тщательному ополаскиванию проточной и дистиллированной водой до нейтральной реакции.",
		};
	}

	if (!isSudanNegative) {
		return {
			isBatchApproved: false,
			isBatchBlocked: true,
			minSampleRequired: minSampleCount,
			isSamplingSufficient: true,
			rejectionReason:
				"Положительная проба с суданом III (обнаружены остатки масляных и жировых загрязнений наконечников). Немедленная блокировка партии на повторную промывку и нейтрализацию.",
			clinicalAdviceRu:
				"Немедленная блокировка партии! Наконечники подлежат обезжириванию в ультразвуковой ванне с детергентом и повторному контролю.",
		};
	}

	return {
		isBatchApproved: true,
		isBatchBlocked: false,
		minSampleRequired: minSampleCount,
		isSamplingSufficient: true,
		rejectionReason: null,
		clinicalAdviceRu:
			"Партия успешно прошла контроль предстерилизационной очистки и допущена к упаковке и стерилизации.",
	};
}

export function validateSterilizationCycle(params: {
	regimeId: SterilizationRegimeCode;
	actualTemperatureCelsius: number;
	actualPressureBar: number;
	actualExposureMinutes: number;
	chamberPoints?: readonly ChamberControlPoint[];
	passedIndicatorOverall?: boolean;
}): {
	readonly isValid: boolean;
	readonly isTempCompliant: boolean;
	readonly isPressureCompliant: boolean;
	readonly isTimeCompliant: boolean;
	readonly areIndicatorsCompliant: boolean;
	readonly failureReasons: readonly string[];
} {
	const regime = STATUTORY_REGIMES.find((r) => r.id === params.regimeId) ?? STATUTORY_REGIMES[0]!;
	const failureReasons: string[] = [];

	// Проверка на физически невозможные значения
	if (params.actualExposureMinutes <= 0) {
		failureReasons.push(
			`Физически невозможное время экспозиции: ${params.actualExposureMinutes} мин (выдержка должна быть больше 0 мин)`,
		);
	}
	if (params.actualTemperatureCelsius <= 0) {
		failureReasons.push(
			`Физически невозможная температура: ${params.actualTemperatureCelsius}°C (температура должна быть больше 0°C)`,
		);
	}
	if (params.actualPressureBar < 0) {
		failureReasons.push(
			`Физически невозможное отрицательное давление: ${params.actualPressureBar} бар`,
		);
	}

	// Термодинамические проверки насыщенного пара и сухожара
	if (regime.methodType === "steam") {
		if (params.actualTemperatureCelsius >= 120 && params.actualPressureBar <= 0.1) {
			failureReasons.push(
				`Физически невозможные параметры насыщенного пара: температура ${params.actualTemperatureCelsius}°C при давлении 0 бар (насыщенный водяной пар в автоклаве требует избыточного давления)`,
			);
		}
		if (params.actualTemperatureCelsius <= 105 && params.actualPressureBar >= 1.5) {
			failureReasons.push(
				`Физически невозможные термодинамические параметры: температура ${params.actualTemperatureCelsius}°C при давлении ${params.actualPressureBar} бар (насыщенный пар не может иметь такое соотношение)`,
			);
		}
	} else if (regime.methodType === "dry_heat") {
		if (params.actualPressureBar > 0.1) {
			failureReasons.push(
				`Физически несовместимый параметр: в сухожаровом шкафу (воздушный метод) давление не создается (зафиксировано избыточное давление ${params.actualPressureBar} бар)`,
			);
		}
		if (params.actualTemperatureCelsius <= 105 && params.actualPressureBar >= 1.0) {
			failureReasons.push(
				`Физически невозможные параметры: сухожар не работает под избыточным давлением ${params.actualPressureBar} бар при температуре ${params.actualTemperatureCelsius}°C`,
			);
		}
	}

	const isTempCompliant =
		params.actualTemperatureCelsius >= regime.minTemperatureCelsius &&
		params.actualTemperatureCelsius <= regime.maxTemperatureCelsius;

	if (!isTempCompliant) {
		if (params.actualTemperatureCelsius < regime.minTemperatureCelsius) {
			failureReasons.push(
				`Температура ${params.actualTemperatureCelsius}°C ниже нормы (мин. ${regime.minTemperatureCelsius}°C)`,
			);
		} else {
			failureReasons.push(
				`Температура ${params.actualTemperatureCelsius}°C превысила допустимый предел (макс. ${regime.maxTemperatureCelsius}°C)`,
			);
		}
	}

	let isPressureCompliant = true;
	if (regime.methodType === "steam") {
		isPressureCompliant =
			params.actualPressureBar >= regime.minPressureBar &&
			params.actualPressureBar <= regime.maxPressureBar;
		if (!isPressureCompliant) {
			failureReasons.push(
				`Давление пара ${params.actualPressureBar} бар вне диапазона [${regime.minPressureBar}..${regime.maxPressureBar} бар]`,
			);
		}
	}

	const isTimeCompliant = params.actualExposureMinutes >= regime.minExposureMinutes;
	if (!isTimeCompliant) {
		failureReasons.push(
			`Недостаточная экспозиция: ${params.actualExposureMinutes} мин (требуется не менее ${regime.minExposureMinutes} мин)`,
		);
	}

	let areIndicatorsCompliant = true;
	if (params.chamberPoints && params.chamberPoints.length > 0) {
		const failedPoints = params.chamberPoints.filter((p) => !p.indicatorPassed);
		if (failedPoints.length > 0) {
			areIndicatorsCompliant = false;
			const failedNames = failedPoints.map((p) => `${p.code} (${p.labelRu})`).join(", ");
			failureReasons.push(`Химические индикаторы не сработали в контрольных точках: ${failedNames}`);
		}
	} else if (params.passedIndicatorOverall === false) {
		areIndicatorsCompliant = false;
		failureReasons.push("Химический индикатор стерилизации не достиг цвета эталона");
	}

	const isValid = isTempCompliant && isPressureCompliant && isTimeCompliant && areIndicatorsCompliant && failureReasons.length === 0;

	return {
		isValid,
		isTempCompliant,
		isPressureCompliant,
		isTimeCompliant,
		areIndicatorsCompliant,
		failureReasons,
	};
}

export function calculateKraftSterilityExpiration(
	packDateInput: string | Date,
	packagingType: KraftPackagingType,
	referenceDateInput: string | Date = new Date(),
): SterilityCalculation {
	const packDate = typeof packDateInput === "string" ? new Date(packDateInput) : new Date(packDateInput.getTime());
	const refDate =
		typeof referenceDateInput === "string" ? new Date(referenceDateInput) : new Date(referenceDateInput.getTime());

	const meta = STATUTORY_PACKAGING_TYPES[packagingType] ?? STATUTORY_PACKAGING_TYPES.kraft_heat_sealed;
	const daysLifespan = meta.statutoryShelfLifeDays;

	const expDate = new Date(packDate.getTime());
	expDate.setDate(expDate.getDate() + daysLifespan);

	const diffMs = expDate.getTime() - refDate.getTime();
	const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

	let status: SterilityStatus = "sterile_valid";
	if (daysLifespan === 0) {
		status = "sterile_valid";
	} else if (daysRemaining < 0) {
		status = "expired";
	} else if (daysRemaining <= 7) {
		status = "expiring_soon_7d";
	}

	const isExpired = status === "expired";
	const isExpiringSoon = status === "expiring_soon_7d";

	let humanReadableRemainingRu = "";
	if (daysLifespan === 0) {
		humanReadableRemainingRu = "Без упаковки (использовать в течение смены)";
	} else if (isExpired) {
		humanReadableRemainingRu = `Срок истек ${Math.abs(daysRemaining)} дн. назад (требуется повторная ПСО)`;
	} else if (daysRemaining === 0) {
		humanReadableRemainingRu = "Истекает сегодня (до 23:59)";
	} else if (daysRemaining === 1) {
		humanReadableRemainingRu = "Остался 1 день стерильности";
	} else {
		humanReadableRemainingRu = `Осталось ${daysRemaining} дн. стерильности`;
	}

	const pad2 = (n: number) => String(n).padStart(2, "0");
	const packDateFormatted = `${packDate.getFullYear()}-${pad2(packDate.getMonth() + 1)}-${pad2(packDate.getDate())}`;
	const expDateFormatted = `${expDate.getFullYear()}-${pad2(expDate.getMonth() + 1)}-${pad2(expDate.getDate())}`;

	return {
		packDateFormatted,
		expDateFormatted,
		expDateIso: expDate.toISOString(),
		daysLifespan,
		daysRemaining,
		status,
		isExpired,
		isExpiringSoon,
		humanReadableRemainingRu,
	};
}

function sanitizeCode(code?: string): string {
	if (!code) return "AK01";
	const cyrillicMap = {
		А: "A", Б: "B", В: "V", Г: "G", Д: "D", Е: "E", Ж: "ZH", З: "Z", И: "I", К: "K",
		Л: "L", М: "M", Н: "N", О: "O", П: "P", Р: "R", С: "S", Т: "T", У: "U", Ф: "F",
		Х: "H", Ц: "TS", Ч: "CH", Ш: "SH", Щ: "SCH", Ы: "Y", Э: "E", Ю: "YU", Я: "YA",
	};
	const transliterated = code
		.toUpperCase()
		.split("")
		.map((ch) => cyrillicMap[ch as keyof typeof cyrillicMap] ?? ch)
		.join("");
	return transliterated.replace(/[^A-Za-z0-9]/g, "") || "AK01";
}

export function generateKraftBarcode(params: {
	batchNumber: string;
	serialNumber: number;
	expDateIsoOrFormatted: string;
	sterilizerCode?: string;
}): string {
	const cleanBatch = params.batchNumber.replace(/[^A-Za-z0-9]/g, "").toUpperCase() || "B01";
	const serialStr = String(params.serialNumber).padStart(3, "0");
	const datePart = params.expDateIsoOrFormatted.replace(/[^0-9]/g, "").slice(0, 8);
	const stCode = sanitizeCode(params.sterilizerCode);

	return `DNT-${stCode}-${cleanBatch}-S${serialStr}-${datePart}`;
}

export function parseKraftBarcode(barcode: string): {
	readonly isValid: boolean;
	readonly sterilizerCode: string | null;
	readonly batchNumber: string | null;
	readonly serialNumber: number | null;
	readonly expDateFormatted: string | null;
} {
	const clean = barcode.trim().toUpperCase();
	const match = clean.match(/^DNT-([A-Z0-9]+)-([A-Z0-9]+)-S(\d+)-(\d{4})(\d{2})(\d{2})$/);
	if (!match) {
		return {
			isValid: false,
			sterilizerCode: null,
			batchNumber: null,
			serialNumber: null,
			expDateFormatted: null,
		};
	}

	const sterilizerCode = match[1] ?? null;
	const batchNumber = match[2] ?? null;
	const serialStr = match[3] ?? "0";
	const y = match[4] ?? "";
	const m = match[5] ?? "";
	const d = match[6] ?? "";

	return {
		isValid: true,
		sterilizerCode,
		batchNumber,
		serialNumber: parseInt(serialStr, 10),
		expDateFormatted: y && m && d ? `${y}-${m}-${d}` : null,
	};
}

export function generateDigitalStampHash(params: {
	date: string;
	cycleNumber: number;
	operatorFullName: string;
	secretSalt?: string;
}): string {
	const str = `${params.date}_CYC${params.cycleNumber}_${params.operatorFullName}_${params.secretSalt ?? "SANPIN_CSO_SIG_2026"}`;
	let hash = 0x811c9dc5;
	for (let i = 0; i < str.length; i++) {
		hash ^= str.charCodeAt(i);
		hash = (hash * 0x01000193) >>> 0;
	}
	const hex = hash.toString(16).padStart(8, "0").toUpperCase();
	return `ЭЦП-ЦСО-${hex}-${params.date.replace(/-/g, "")}`;
}

export function createDefaultChamberPoints(
	indicatorTradeNameRu = "Интетест-В-134/5",
	allPassed = true,
): ChamberControlPoint[] {
	return DEFAULT_CHAMBER_POINTS_TEMPLATE.map((pt) => ({
		...pt,
		indicatorPassed: allPassed,
		indicatorColorObservedRu: allPassed ? "Темно-коричневый (соответствует эталону)" : "Бежевый (не изменился)",
	}));
}
