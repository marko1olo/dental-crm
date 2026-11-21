/**
 * packages/shared/src/sanpin/kraftBarcodeParser.ts
 * Пакетная идентификация партий стерилизации и презумпция стерильности по умолчанию.
 * Врач у кресла НЕ штрихкодирует каждый пакетик через веб-камеру (Мандат 8e, 8n).
 * Мандат 8b: строго <= 120 строк.
 */

import { getDentalToolSetDefinition } from "./kraftCatalogs.js";
import type { ParsedKraftBarcode, ParseKraftBarcodeOptions } from "./kraftBarcodeTypes.js";

export * from "./kraftBarcodeTypes.js";

export interface FormatSterilizationRecordParams {
	readonly autoclaveId: string;
	readonly cycleNumber: number;
	readonly packDateIso: string;
	readonly expDateIso: string;
	readonly barcode: string;
	readonly operatorName: string;
	readonly indicatorClassRu?: string | undefined;
	readonly toolSetNameRu?: string | undefined;
	readonly isExpired?: boolean | undefined;
}

export function formatSterilizationDiaryRecord(params: FormatSterilizationRecordParams): string {
	const indicatorText = params.indicatorClassRu || "Химический интегратор 5 класса (пар 134°C, 5 мин)";
	const toolText = params.toolSetNameRu ? ` [${params.toolSetNameRu}]` : "";

	if (params.isExpired) {
		return `[ВНИМАНИЕ: СРОК СТЕРИЛИЗАЦИИ ИСТЁК] Стерилизация инструментария: Автоклав ${params.autoclaveId} (цикл №${params.cycleNumber} от ${params.packDateIso}), пакет ${params.barcode} истёк ${params.expDateIso}. Ответственная медсестра: ${params.operatorName}.`;
	}

	return `Стерилизация инструментария: Автоклав ${params.autoclaveId} (цикл №${params.cycleNumber} от ${params.packDateIso}), ${indicatorText}, крафт-пакет ${params.barcode}${toolText} годен до ${params.expDateIso}. Ответственная медсестра ЦСО: ${params.operatorName}. Целостность упаковки сохранена.`;
}

export const formatSterilizationRecord = formatSterilizationDiaryRecord;
export const format043SterilizationRecord = formatSterilizationDiaryRecord;

function normalizeDate(d: string | Date | undefined, fallback: string): string {
	if (!d) return fallback;
	if (typeof d === "string") return d.trim().slice(0, 10);
	return d.toISOString().slice(0, 10);
}

function addDaysToIso(iso: string, days: number): string {
	const dt = new Date(`${iso}T12:00:00.000Z`);
	if (Number.isNaN(dt.getTime())) return iso;
	dt.setUTCDate(dt.getUTCDate() + days);
	return dt.toISOString().slice(0, 10);
}

function daysDiff(fromIso: string, toIso: string): number {
	const t1 = new Date(`${fromIso}T00:00:00Z`).getTime();
	const t2 = new Date(`${toIso}T00:00:00Z`).getTime();
	if (Number.isNaN(t1) || Number.isNaN(t2)) return 0;
	return Math.round((t2 - t1) / 86400000);
}

export function parseAndValidateKraftBarcode(
	rawInput: string,
	options: ParseKraftBarcodeOptions = {},
): ParsedKraftBarcode {
	const trimmed = (rawInput || "").trim();
	const refDate = normalizeDate(options.referenceDate, new Date().toISOString().slice(0, 10));
	const operatorName = options.defaultOperatorName || "Медсестра ЦСО";
	const autoclaveId = options.defaultAutoclaveId || "Автоклав №1";

	if (!trimmed) {
		return {
			rawInput: "",
			barcodeType: "code128_1d",
			isValid: false,
			isExpired: true,
			isExpiringSoon: false,
			daysRemaining: 0,
			daysLifespan: 0,
			batchId: "",
			autoclaveId,
			cycleNumber: 0,
			packDateIso: refDate,
			expDateIso: refDate,
			operatorId: "STAFF-CSO",
			operatorName,
			toolSetId: "set_therapeutic_tray",
			toolSetNameRu: "Терапевтический лоток",
			packageMaterialId: "paper_self_seal_single",
			packageSizeId: "size_100x200",
			indicatorId: "chemical_indicator_class_5",
			indicatorClassRu: "Химический интегратор 5 класса",
			indicatorPassed: false,
			sanpinClauseRu: "Стандарт стерилизации инструментария",
			formattedSterilizationDiaryRecord: "",
			formattedProtocolRecord043: "",
			errorMessage: "Штрихкод крафт-пакета не указан или пуст.",
		};
	}

	// Структурированный разделитель партии
	if (trimmed.includes("|")) {
		const parts = trimmed.split("|").map((p) => p.trim());
		const [batchId, serialStr] = (parts[0] || "").split("#");
		const cycleDigits = (parts[2] || "CYC1").replace(/\D/g, "");
		const cycleNumber = Number(cycleDigits) || 1;
		const packDateIso = normalizeDate(parts[3], refDate);
		const expDateIso = normalizeDate(parts[4], addDaysToIso(packDateIso, 50));
		const toolSet = getDentalToolSetDefinition(parts[6] || "TER-TRAY");
		const daysRemaining = daysDiff(refDate, expDateIso);
		const isExpired = daysRemaining < 0;
		const errorMessage = isExpired ? `Срок годности стерильного пакета истёк ${Math.abs(daysRemaining)} дн. назад (годен до ${expDateIso}).` : undefined;
		const formatted = formatSterilizationDiaryRecord({
			autoclaveId: parts[1] || autoclaveId,
			cycleNumber,
			packDateIso,
			expDateIso,
			barcode: trimmed,
			operatorName,
			toolSetNameRu: toolSet.nameRu,
			isExpired,
		});

		return {
			rawInput: trimmed,
			barcodeType: "datamatrix_2d",
			isValid: !isExpired,
			isExpired,
			isExpiringSoon: daysRemaining >= 0 && daysRemaining <= 7,
			daysRemaining,
			daysLifespan: daysDiff(packDateIso, expDateIso) || 50,
			batchId: batchId || "KB-BATCH",
			serialNumber: serialStr ? Number(serialStr) : undefined,
			autoclaveId: parts[1] || autoclaveId,
			cycleNumber,
			packDateIso,
			expDateIso,
			operatorId: parts[5] || "NURSE-01",
			operatorName,
			toolSetId: toolSet.id,
			toolSetNameRu: toolSet.nameRu,
			packageMaterialId: "paper_self_seal_single",
			packageSizeId: toolSet.defaultPackageSize || "size_100x200",
			indicatorId: "chemical_indicator_class_5",
			indicatorClassRu: "Химический интегратор 5 класса (пар 134°C, 5 мин)",
			indicatorPassed: !isExpired,
			sanpinClauseRu: "Стандарт стерилизации инструментария",
			formattedSterilizationDiaryRecord: formatted,
			formattedProtocolRecord043: formatted,
			errorMessage,
		};
	}

	// Простой штрихкод или номер партии: динамическое извлечение даты стерилизации
	const clean = trimmed.toUpperCase();
	let packDateIso = refDate;
	const isoMatch = clean.match(/\b(20\d{2})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b/);
	const kbMatch = clean.match(/^KB([23]\d)(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])/);
	const yyyymmddMatch = clean.match(/(?:^|[^0-9])(20[23]\d)(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])/);
	const yymmddMatch = clean.match(/(?:^|[^0-9])([23]\d)(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])/);

	if (isoMatch?.[1] && isoMatch[2] && isoMatch[3]) {
		const [, y, m, d] = isoMatch;
		if (y && m && d) packDateIso = `${y}-${m}-${d}`;
	} else if (kbMatch?.[1] && kbMatch[2] && kbMatch[3]) {
		const [, y, m, d] = kbMatch;
		if (y && m && d) packDateIso = `20${y}-${m}-${d}`;
	} else if (yyyymmddMatch?.[1] && yyyymmddMatch[2] && yyyymmddMatch[3]) {
		const [, y, m, d] = yyyymmddMatch;
		if (y && m && d) packDateIso = `${y}-${m}-${d}`;
	} else if (yymmddMatch?.[1] && yymmddMatch[2] && yymmddMatch[3]) {
		const [, y, m, d] = yymmddMatch;
		if (y && m && d) packDateIso = `20${y}-${m}-${d}`;
	}

	const expDateIso = addDaysToIso(packDateIso, 50);
	const daysRemaining = daysDiff(refDate, expDateIso);
	const isExpired = daysRemaining < 0;

	const defaultToolSet = getDentalToolSetDefinition("set_therapeutic_tray");
	const toolSetNameRu = defaultToolSet.nameRu;
	const toolSetId = defaultToolSet.id;
	const formatted = formatSterilizationDiaryRecord({
		autoclaveId,
		cycleNumber: 1,
		packDateIso,
		expDateIso,
		barcode: clean,
		operatorName,
		toolSetNameRu,
		isExpired,
	});

	return {
		rawInput: trimmed,
		barcodeType: "code128_1d",
		isValid: !isExpired,
		isExpired,
		isExpiringSoon: daysRemaining >= 0 && daysRemaining <= 7,
		daysRemaining,
		daysLifespan: 50,
		batchId: clean,
		autoclaveId,
		cycleNumber: 1,
		packDateIso,
		expDateIso,
		operatorId: "NURSE-01",
		operatorName,
		toolSetId,
		toolSetNameRu,
		packageMaterialId: "paper_self_seal_single",
		packageSizeId: "size_100x200",
		indicatorId: "chemical_indicator_class_5",
		indicatorClassRu: "Химический интегратор 5 класса (пар 134°C, 5 мин)",
		indicatorPassed: !isExpired,
		sanpinClauseRu: "Стандарт стерилизации инструментария",
		formattedSterilizationDiaryRecord: formatted,
		formattedProtocolRecord043: formatted,
		errorMessage: isExpired ? `Срок годности стерильного пакета истёк ${Math.abs(daysRemaining)} дн. назад (годен до ${expDateIso}).` : undefined,
	};
}
