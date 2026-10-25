/**
 * apps/web/src/components/sanpin/kraft/kraftPackageEngine.ts
 * Пакетная стерилизация смены, нормативный расчет сроков годности.
 * Мандат 8b: строго <= 120 строк.
 */

export * from "./kraftPackageTypes.js";

export {
	calculateKraftBatchStatistics,
	calculatePackageExpiration,
	encodeStringToCp866,
	evaluateKraftPackageStatus,
	exportKraftBatchToCsv,
	filterKraftPackages,
	formatKraftDataMatrixPayload,
	generate1DBarcodeString,
	generateA4BatchSheetHtml,
	generateEscPosSanpinLabelBinary,
	generateKraftBatchRecords,
	generateSanpinCode128Svg as generateCode128Svg,
	generateSanpinDataMatrixSvg as generateDataMatrixSvg,
	generateThermalStickerHtml,
	generateTsplLabelCode,
	generateZplLabelCode,
} from "@dental/shared";

import type { KraftPackageRecord } from "./kraftPackageTypes.js";
import { STANDARD_TRAY_CONFIGS } from "./kraftTrayConfigs.js";

export function createStandardTrayKraftPackageRecord(
	toolSet: "therapy" | "surgery" | "endo" = "therapy",
	operatorName = "Персонал клиники",
): KraftPackageRecord {
	const now = new Date();
	const packDate = now.toISOString().slice(0, 10);
	const expDate = new Date(now.getTime() + 50 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
	const dateDigits = packDate.replace(/-/g, "");
	const batchId = `KB-${dateDigits}-01`;
	const cfg = STANDARD_TRAY_CONFIGS[toolSet] || STANDARD_TRAY_CONFIGS.therapy;
	const barcode128 = `KB${dateDigits.slice(2)}0001`;

	return {
		id: `snk-${cfg.code.toLowerCase()}-${Date.now()}`,
		batchId,
		serialNumber: 1,
		packageType: "paper_self_seal_single",
		packageSize: "size_100x200",
		toolSetId: cfg.id,
		toolSetNameRu: cfg.nameRu,
		itemsListRu: cfg.items,
		packDate,
		expDate,
		daysLifespan: 50,
		daysRemaining: 50,
		status: "sterile_valid",
		autoclaveId: "АК-01 (Melag 23B+)",
		cycleNumber: 1,
		operatorId: "STAFF-01",
		operatorName,
		indicatorId: "vinar_steritest_4",
		indicatorVerified: true,
		barcode128,
		barcodeDataMatrixPayload: `${batchId}#1|АК-01|CYC1|${packDate}|${expDate}|STAFF-01|${cfg.code}`,
		isBreached: false,
		notes: "Стандартный смотровой лоток автоклавирования",
		createdAt: now.toISOString(),
	};
}

export function createDynamicKraftPackage(
	rawInput: string,
	operatorName = "Персонал клиники",
): KraftPackageRecord {
	const now = new Date();
	const packDate = now.toISOString().slice(0, 10);
	const expDate = new Date(now.getTime() + 50 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
	const dateDigits = packDate.replace(/-/g, "");
	const clean = rawInput.trim().toUpperCase();
	const serialNum = Number(clean.replace(/[^0-9]/g, "")) || 1;
	const batchId = `KB-${dateDigits}-01`;

	return {
		id: `snk-dyn-${clean}-${Date.now()}`,
		batchId,
		serialNumber: serialNum,
		packageType: "paper_self_seal_single",
		packageSize: "size_100x200",
		toolSetId: "set_therapeutic_tray",
		toolSetNameRu: `Смотровой лоток №${clean} (Зеркало, зонд, пинцет, гладилка)`,
		itemsListRu: ["Зеркало стоматологическое", "Зонд угловой", "Пинцет", "Штопфер-гладилка", "Экскаватор"],
		packDate,
		expDate,
		daysLifespan: 50,
		daysRemaining: 50,
		status: "sterile_valid",
		autoclaveId: "АК-01 (Melag)",
		cycleNumber: 1,
		operatorId: "STAFF-01",
		operatorName,
		indicatorId: "vinar_steritest_4",
		indicatorVerified: true,
		barcode128: clean.startsWith("KB") ? clean : `KB${clean}`,
		barcodeDataMatrixPayload: `${batchId}#${serialNum}|АК-01|CYC1|${packDate}|${expDate}|NURSE-01|THER`,
		isBreached: false,
		notes: "Крафт-пакет идентифицирован по номеру",
		createdAt: now.toISOString(),
	};
}
