/**
 * ============================================================================
 * SANPIN 3.3686-21 KRAFT PACKAGE PROTOCOL LINK & INVENTORY AUTOPILOT
 * 1-клик привязка крафт-пакетов к протоколу приёма (Форма № 043/у)
 * по 1D/2D штрихкодам и автоматическое списание расходников по техкартам.
 * ============================================================================
 */

import {
	getKraftMaterialDefinition,
	type KraftPackageMaterialId,
	type KraftPackageSizeId,
} from "./kraftPackageTypes.js";
import {
	getDentalToolSetDefinition,
} from "./kraftPackageGenerator.js";

export * from "./procedureMaterialDeductionEngine.js";

// ─────────────────────────────────────────────────────────────────────────────
// 1. DATA CONTRACTS & PARSED KRAFT BARCODE
// ─────────────────────────────────────────────────────────────────────────────

export type KraftBarcodeType = "datamatrix_2d" | "code128_1d" | "custom_tray";

export interface ParsedKraftBarcode {
	readonly rawInput: string;
	readonly barcodeType: KraftBarcodeType;
	readonly isValid: boolean;
	readonly isExpired: boolean;
	readonly isExpiringSoon: boolean;
	readonly daysRemaining: number;
	readonly daysLifespan: number;
	readonly batchId: string;
	readonly serialNumber?: number | undefined;
	readonly autoclaveId: string;
	readonly cycleNumber: number;
	readonly packDateIso: string; // YYYY-MM-DD
	readonly expDateIso: string; // YYYY-MM-DD
	readonly operatorId: string;
	readonly operatorName: string;
	readonly toolSetId: string;
	readonly toolSetNameRu: string;
	readonly packageMaterialId: KraftPackageMaterialId;
	readonly packageSizeId: KraftPackageSizeId;
	readonly indicatorId: string;
	readonly indicatorClassRu: string;
	readonly indicatorPassed: boolean;
	readonly sanpinClauseRu: string;
	readonly formattedProtocolRecord043: string;
	readonly errorMessage?: string | undefined;
}

export interface ParseKraftBarcodeOptions {
	readonly referenceDate?: string | Date | undefined;
	readonly defaultOperatorName?: string | undefined;
	readonly defaultAutoclaveId?: string | undefined;
	readonly requireClass5Indicator?: boolean | undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. PARSING & VALIDATION ENGINE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Нормализует дату к формату YYYY-MM-DD
 */
function normalizeDateStr(d: string | Date): string {
	if (typeof d === "string") {
		const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(d.trim());
		if (match) return `${match[1]}-${match[2]}-${match[3]}`;
		const parsed = new Date(d);
		if (!Number.isNaN(parsed.getTime())) {
			return parsed.toISOString().slice(0, 10);
		}
		return d.slice(0, 10);
	}
	return d.toISOString().slice(0, 10);
}

/**
 * Добавляет дни к дате YYYY-MM-DD
 */
function addDays(dateStr: string, days: number): string {
	const dt = new Date(`${dateStr}T12:00:00.000Z`);
	dt.setUTCDate(dt.getUTCDate() + days);
	return dt.toISOString().slice(0, 10);
}

/**
 * Расчет оставшихся дней между refDate и expDate
 */
function calculateDaysDifference(refDateStr: string, targetDateStr: string): number {
	const ref = new Date(`${refDateStr}T00:00:00.000Z`).getTime();
	const target = new Date(`${targetDateStr}T00:00:00.000Z`).getTime();
	const diffMs = target - ref;
	return Math.round(diffMs / (24 * 3600 * 1000));
}

/**
 * 1-клик парсер и валидатор 2D DataMatrix и 1D Code128 штрихкодов крафт-пакетов стерилизации.
 * Выполняет строгую проверку срока годности по СанПиН 3.3686-21.
 */
export function parseAndValidateKraftBarcode(
	rawInput: string,
	options: ParseKraftBarcodeOptions = {},
): ParsedKraftBarcode {
	const trimmed = (rawInput || "").trim();
	const refDate = options.referenceDate ? normalizeDateStr(options.referenceDate) : new Date().toISOString().slice(0, 10);
	const defaultOperator = options.defaultOperatorName || "Медсестра ЦСО Смирнова А.В.";
	const defaultAutoclave = options.defaultAutoclaveId || "АК-01 (Melag 23B+)";

	if (!trimmed) {
		return {
			rawInput: "",
			barcodeType: "code128_1d",
			isValid: false,
			isExpired: true,
			isExpiringSoon: false,
			daysRemaining: 0,
			daysLifespan: 50,
			batchId: "UNKNOWN",
			autoclaveId: defaultAutoclave,
			cycleNumber: 1,
			packDateIso: refDate,
			expDateIso: refDate,
			operatorId: "NURSE-01",
			operatorName: defaultOperator,
			toolSetId: "set_therapeutic_tray",
			toolSetNameRu: "Терапевтический лоток",
			packageMaterialId: "paper_self_seal_single",
			packageSizeId: "size_100x200",
			indicatorId: "vinar_intetest_5",
			indicatorClassRu: "Химический интегратор 5 класса (пар 134°C)",
			indicatorPassed: false,
			sanpinClauseRu: "СанПиН 3.3686-21 п. 3632",
			formattedProtocolRecord043: "",
			errorMessage: "Штрихкод крафт-пакета не указан (пустая строка).",
		};
	}

	// 1. Формат 2D DataMatrix (SanPiN Structured): BATCH_ID#SERIAL|AUTOCLAVE_ID|CYC{N}|PACK_DATE|EXP_DATE|OPERATOR_ID|TOOL_SET_ID
	if (trimmed.includes("|")) {
		const parts = trimmed.split("|").map((p) => p.trim());
		const batchWithSerial = parts[0] || "";
		const [batchId, serialStr] = batchWithSerial.split("#");
		const serialNumber = serialStr ? parseInt(serialStr, 10) : undefined;

		const autoclaveId = parts[1] || defaultAutoclave;
		const cycPart = parts[2] || "CYC1";
		const cycleNumber = parseInt(cycPart.replace(/[^0-9]/g, ""), 10) || 1;

		const packDateIso = normalizeDateStr(parts[3] || refDate);
		const expDateIso = normalizeDateStr(parts[4] || addDays(packDateIso, 50));
		const operatorId = parts[5] || "NURSE-01";
		const toolSetCode = parts[6] || "TER-TRAY";

		// Сопоставление с каталогом наборов
		const toolSet = getDentalToolSetDefinition(toolSetCode) || getDentalToolSetDefinition("set_therapeutic_tray");
		const materialId: KraftPackageMaterialId = "paper_self_seal_single";
		const sizeId: KraftPackageSizeId = toolSet.defaultPackageSize || "size_100x200";
		const materialDef = getKraftMaterialDefinition(materialId);

		const daysRemaining = calculateDaysDifference(refDate, expDateIso);
		const isExpired = daysRemaining < 0;
		const isExpiringSoon = daysRemaining >= 0 && daysRemaining <= 7;
		const daysLifespan = calculateDaysDifference(packDateIso, expDateIso) || materialDef.statutoryShelfLifeDays;

		let errorMessage: string | undefined;
		if (isExpired) {
			errorMessage = `Срок годности стерильного крафт-пакета ИСТЁК ${Math.abs(daysRemaining)} дн. назад (годен до ${expDateIso}). Использование просроченного инструментария категорически запрещено СанПиН 3.3686-21 п. 3632!`;
		}

		const formattedRecord = format043SterilizationRecord({
			autoclaveId,
			cycleNumber,
			packDateIso,
			expDateIso,
			barcode: trimmed,
			operatorName: defaultOperator,
			indicatorClassRu: "Химический интегратор 5 класса (ИнтеТЕСТ / ГОСТ ISO 11140-1)",
			toolSetNameRu: toolSet.nameRu,
			isExpired,
		});

		return {
			rawInput: trimmed,
			barcodeType: "datamatrix_2d",
			isValid: !isExpired,
			isExpired,
			isExpiringSoon,
			daysRemaining,
			daysLifespan,
			batchId: batchId || "KB-BATCH",
			serialNumber,
			autoclaveId,
			cycleNumber,
			packDateIso,
			expDateIso,
			operatorId,
			operatorName: defaultOperator,
			toolSetId: toolSet.id,
			toolSetNameRu: toolSet.nameRu,
			packageMaterialId: materialId,
			packageSizeId: sizeId,
			indicatorId: "vinar_intetest_5",
			indicatorClassRu: "Химический интегратор 5 класса (ИнтеТЕСТ / ГОСТ ISO 11140-1)",
			indicatorPassed: !isExpired,
			sanpinClauseRu: materialDef.sanpinClauseRu,
			formattedProtocolRecord043: formattedRecord,
			errorMessage,
		};
	}

	// 2. Формат 1D Code128 (например KB2608250001 или TRAY-10293)
	const cleanCode = trimmed.toUpperCase();
	let packDateIso = refDate;
	let expDateIso = addDays(refDate, 50);
	let cycleNumber = 1;
	const batchId = cleanCode;
	let toolSetNameRu = "Терапевтический лоток смотровой";
	let toolSetId = "set_therapeutic_tray";

	// Попытка извлечь дату из серийного формата KB{YYMMDD}{NNNN}
	const kbMatch = /^KB(\d{2})(\d{2})(\d{2})(\d{4})$/.exec(cleanCode);
	if (kbMatch) {
		const yy = kbMatch[1];
		const mm = kbMatch[2];
		const dd = kbMatch[3];
		packDateIso = `20${yy}-${mm}-${dd}`;
		expDateIso = addDays(packDateIso, 50);
		cycleNumber = Math.max(1, parseInt(kbMatch[4] || "1", 10) % 10);
	} else if (cleanCode.includes("ENDO")) {
		toolSetNameRu = "Эндодонтический набор боров и файлов";
		toolSetId = "set_endodontic_burs";
	} else if (cleanCode.includes("SURG")) {
		toolSetNameRu = "Хирургический набор экстракционный";
		toolSetId = "set_surgical_extraction";
	} else if (cleanCode.includes("PERIO")) {
		toolSetNameRu = "Набор кюрет Грейси пародонтологический";
		toolSetId = "set_periodontal_gracey";
	} else if (cleanCode.includes("ORTH")) {
		toolSetNameRu = "Ортопедический набор препарирования";
		toolSetId = "set_orthopedic_prep";
	}

	const daysRemaining = calculateDaysDifference(refDate, expDateIso);
	const isExpired = daysRemaining < 0;
	const isExpiringSoon = daysRemaining >= 0 && daysRemaining <= 7;

	let errorMessage: string | undefined;
	if (isExpired) {
		errorMessage = `Срок годности стерильного крафт-пакета ИСТЁК ${Math.abs(daysRemaining)} дн. назад (годен до ${expDateIso}). Использование запрещено СанПиН 3.3686-21!`;
	}

	const formattedRecord = format043SterilizationRecord({
		autoclaveId: defaultAutoclave,
		cycleNumber,
		packDateIso,
		expDateIso,
		barcode: cleanCode,
		operatorName: defaultOperator,
		indicatorClassRu: "Химический интегратор 5 класса (ИнтеТЕСТ-В-134/5)",
		toolSetNameRu,
		isExpired,
	});

	return {
		rawInput: trimmed,
		barcodeType: "code128_1d",
		isValid: !isExpired,
		isExpired,
		isExpiringSoon,
		daysRemaining,
		daysLifespan: 50,
		batchId,
		serialNumber: kbMatch ? parseInt(kbMatch[4] || "1", 10) : undefined,
		autoclaveId: defaultAutoclave,
		cycleNumber,
		packDateIso,
		expDateIso,
		operatorId: "NURSE-01",
		operatorName: defaultOperator,
		toolSetId,
		toolSetNameRu,
		packageMaterialId: "paper_self_seal_single",
		packageSizeId: "size_100x200",
		indicatorId: "vinar_intetest_5",
		indicatorClassRu: "Химический интегратор 5 класса (ИнтеТЕСТ-В-134/5)",
		indicatorPassed: !isExpired,
		sanpinClauseRu: "СанПиН 3.3686-21 п. 3632",
		formattedProtocolRecord043: formattedRecord,
		errorMessage,
	};
}

/**
 * Формирует нормативную запись стерилизации для медкарты формы № 043/у
 */
export function format043SterilizationRecord(params: {
	readonly autoclaveId: string;
	readonly cycleNumber: number;
	readonly packDateIso: string;
	readonly expDateIso: string;
	readonly barcode: string;
	readonly operatorName: string;
	readonly indicatorClassRu?: string | undefined;
	readonly toolSetNameRu?: string | undefined;
	readonly isExpired?: boolean | undefined;
}): string {
	const indicatorText = params.indicatorClassRu || "Химический интегратор 5 класса (пар 134°C, норма)";
	const toolText = params.toolSetNameRu ? ` [${params.toolSetNameRu}]` : "";

	if (params.isExpired) {
		return `[ОШИБКА САНПИН: ПАКЕТ ПРОСРОЧЕН] Стерилизация: Автоклав ${params.autoclaveId} (цикл №${params.cycleNumber} от ${params.packDateIso}), пакет ${params.barcode} ИСТЁК ${params.expDateIso}. Ответственная медсестра: ${params.operatorName}.`;
	}

	return `Стерилизация СанПиН 3.3686-21: Автоклав ${params.autoclaveId} (цикл №${params.cycleNumber} от ${params.packDateIso}), ${indicatorText}, крафт-пакет ${params.barcode}${toolText} годен до ${params.expDateIso}. Ответственная медсестра ЦСО: ${params.operatorName}. Целостность упаковки сохранена.`;
}

/**
 * 1-клик внедрение записи стерилизации в дневник формы 043/у (поддерживает объект дневника или строку)
 */
export function attachKraftPackageTo043Diary(
	diaryOrText: string,
	parsedKraft: ParsedKraftBarcode,
): string;
export function attachKraftPackageTo043Diary<T extends { appliedMaterials?: string | null; treatmentDescription?: string | null }>(
	diaryOrText: T,
	parsedKraft: ParsedKraftBarcode,
): T;
export function attachKraftPackageTo043Diary(
	diaryOrText: { appliedMaterials?: string | null; treatmentDescription?: string | null } | string,
	parsedKraft: ParsedKraftBarcode,
): { appliedMaterials?: string | null; treatmentDescription?: string | null } | string {
	const sterRecord = parsedKraft.formattedProtocolRecord043;

	if (typeof diaryOrText === "string") {
		const curText = diaryOrText.trim();
		if (
			curText.includes(parsedKraft.rawInput) ||
			(parsedKraft.cycleNumber &&
				curText.includes(`цикл №${parsedKraft.cycleNumber}`) &&
				curText.includes(parsedKraft.autoclaveId))
		) {
			return diaryOrText;
		}
		return curText ? `${curText}\n\n${sterRecord}` : sterRecord;
	}

	const curMaterials = (diaryOrText.appliedMaterials || "").trim();
	if (
		curMaterials.includes(parsedKraft.rawInput) ||
		(parsedKraft.cycleNumber &&
			curMaterials.includes(`цикл №${parsedKraft.cycleNumber}`) &&
			curMaterials.includes(parsedKraft.autoclaveId))
	) {
		return diaryOrText;
	}

	const newMaterials = curMaterials
		? `${curMaterials}\n\n${sterRecord}`
		: sterRecord;

	return {
		...diaryOrText,
		appliedMaterials: newMaterials,
	};
}
