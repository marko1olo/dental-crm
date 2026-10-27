/**
 * packages/shared/src/sanpin/kraftBarcodeParser.ts
 * Промышленный парсинг и валидация штрихкодов стерилизации.
 * Мандат 8b: строго <= 120 строк.
 * Мандат 8e: ноль блокировок врача, штрихкод опционален.
 * Мандат 8x, 8ap: чистый русский язык без советского канцелярита и фейковых симуляций.
 */

import { getDentalToolSetDefinition } from "./kraftCatalogs.js";
import { getKraftMaterialDefinition } from "./kraftPackageTypes.js";
import { formatSterilizationDiaryRecord } from "./kraftDiaryLink.js";
import type { ParsedKraftBarcode, ParseKraftBarcodeOptions } from "./kraftBarcodeTypes.js";

export * from "./kraftBarcodeTypes.js";

function normalizeDate(d: string | Date | undefined, fallback: string): string {
	if (!d) return fallback;
	if (typeof d === "string") {
		const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d.trim());
		return m ? `${m[1]}-${m[2]}-${m[3]}` : d.slice(0, 10);
	}
	return d.toISOString().slice(0, 10);
}

function extractPackDate(code: string, fallback: string): string {
	const isoMatch = /\b(20\d{2})-(\d{2})-(\d{2})\b/.exec(code);
	if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
	const yymmddMatch = /(?:KB|BATCH-?)?(2[0-9])(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])/.exec(code);
	if (yymmddMatch) {
		return `20${yymmddMatch[1]}-${yymmddMatch[2]}-${yymmddMatch[3]}`;
	}
	return fallback;
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

export function parseAndValidateKraftBarcode(rawInput: string, options: ParseKraftBarcodeOptions = {}): ParsedKraftBarcode {
	const trimmed = (rawInput || "").trim();
	const refDate = normalizeDate(options.referenceDate, new Date().toISOString().slice(0, 10));
	const operatorName = options.defaultOperatorName || "Медсестра ЦСО";
	const autoclaveId = options.defaultAutoclaveId || "Автоклав №1";

	if (!trimmed) {
		return {
			rawInput: "", barcodeType: "code128_1d", isValid: false, isExpired: true, isExpiringSoon: false,
			daysRemaining: 0, daysLifespan: 50, batchId: "UNKNOWN", autoclaveId, cycleNumber: 1,
			packDateIso: refDate, expDateIso: refDate, operatorId: "NURSE-01", operatorName,
			toolSetId: "set_therapeutic_tray", toolSetNameRu: "Терапевтический лоток", packageMaterialId: "paper_self_seal_single",
			packageSizeId: "size_100x200", indicatorId: "chemical_indicator_class_5", indicatorClassRu: "Химический интегратор 5 класса",
			indicatorPassed: false, sanpinClauseRu: "Стандарт стерилизации инструментария",
			formattedSterilizationDiaryRecord: "", formattedProtocolRecord043: "",
			errorMessage: "Штрихкод упаковки стерилизации не указан.",
		};
	}

	if (trimmed.includes("|")) {
		const parts = trimmed.split("|").map((p) => p.trim());
		const [batchId, serialStr] = (parts[0] || "").split("#");
		const cycleNumber = parseInt((parts[2] || "CYC1").replace(/\D/g, ""), 10) || 1;
		const packDateIso = normalizeDate(parts[3], refDate);
		const expDateIso = normalizeDate(parts[4], addDaysToIso(packDateIso, 50));
		const toolSet = getDentalToolSetDefinition(parts[6] || "TER-TRAY");
		const daysRemaining = daysDiff(refDate, expDateIso);
		const isExpired = daysRemaining < 0;
		const errorMessage = isExpired ? `Срок годности стерильного пакета истёк ${Math.abs(daysRemaining)} дн. назад (годен до ${expDateIso}).` : undefined;
		const formatted = formatSterilizationDiaryRecord({ autoclaveId: parts[1] || autoclaveId, cycleNumber, packDateIso, expDateIso, barcode: trimmed, operatorName, toolSetNameRu: toolSet.nameRu, isExpired });
		return {
			rawInput: trimmed, barcodeType: "datamatrix_2d", isValid: !isExpired, isExpired, isExpiringSoon: daysRemaining >= 0 && daysRemaining <= 7,
			daysRemaining, daysLifespan: daysDiff(packDateIso, expDateIso) || 50, batchId: batchId || "KB-BATCH",
			serialNumber: serialStr ? parseInt(serialStr, 10) : undefined, autoclaveId: parts[1] || autoclaveId, cycleNumber,
			packDateIso, expDateIso, operatorId: parts[5] || "NURSE-01", operatorName, toolSetId: toolSet.id, toolSetNameRu: toolSet.nameRu,
			packageMaterialId: "paper_self_seal_single", packageSizeId: toolSet.defaultPackageSize || "size_100x200",
			indicatorId: "chemical_indicator_class_5", indicatorClassRu: "Химический интегратор 5 класса (пар 134°C, 5 мин)",
			indicatorPassed: !isExpired, sanpinClauseRu: getKraftMaterialDefinition("paper_self_seal_single").sanpinClauseRu,
			formattedSterilizationDiaryRecord: formatted, formattedProtocolRecord043: formatted, errorMessage,
		};
	}

	const clean = trimmed.toUpperCase();
	const packDateIso = extractPackDate(clean, refDate);
	const expDateIso = addDaysToIso(packDateIso, 50);
	const daysRemaining = daysDiff(refDate, expDateIso);
	const isExpired = daysRemaining < 0;

	const defaultToolSet = getDentalToolSetDefinition("set_therapeutic_tray");
	const toolSetNameRu = defaultToolSet.nameRu;
	const toolSetId = defaultToolSet.id;

	const formatted = formatSterilizationDiaryRecord({ autoclaveId, cycleNumber: 1, packDateIso, expDateIso, barcode: clean, operatorName, toolSetNameRu, isExpired });
	return {
		rawInput: trimmed, barcodeType: "code128_1d", isValid: !isExpired, isExpired, isExpiringSoon: daysRemaining >= 0 && daysRemaining <= 7,
		daysRemaining, daysLifespan: 50, batchId: clean,
		autoclaveId, cycleNumber: 1, packDateIso, expDateIso, operatorId: "NURSE-01", operatorName, toolSetId, toolSetNameRu,
		packageMaterialId: "paper_self_seal_single", packageSizeId: "size_100x200", indicatorId: "chemical_indicator_class_5",
		indicatorClassRu: "Химический интегратор 5 класса (пар 134°C, 5 мин)", indicatorPassed: !isExpired,
		sanpinClauseRu: "Стандарт стерилизации инструментария",
		formattedSterilizationDiaryRecord: formatted, formattedProtocolRecord043: formatted,
		errorMessage: isExpired ? `Срок годности стерильного пакета истёк ${Math.abs(daysRemaining)} дн. назад (годен до ${expDateIso}).` : undefined,
	};
}
