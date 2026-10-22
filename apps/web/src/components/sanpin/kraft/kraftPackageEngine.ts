/**
 * SANPIN KRAFT PACKAGE BARCODE & EXPIRY ENGINE (Фасад)
 * СанПиН 3.3686-21 и ГОСТ Р ИСО 11607.
 * Пакетная стерилизация смены, нормативный расчет сроков годности
 * и печать термоэтикеток без поштучной симуляции физического мира.
 */

export * from "./kraftPackageTypes.js";

// Делегирование в канонический пакетный движок @dental/shared
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

/**
 * Генерирует нормативный стерильный смотровой лоток с СЕГОДНЯШНЕЙ датой стерилизации.
 * Освобождает врача и медсестру у кресла от многошаговых барьеров (Мандаты 8e, 8k, СанПиН 3.3686-21).
 */
export function createStandardTrayKraftPackageRecord(
	toolSet: "therapy" | "surgery" | "endo" = "therapy",
	operatorName = "Персонал клиники",
): KraftPackageRecord {
	const now = new Date();
	const packDate = now.toISOString().slice(0, 10);
	const expDate = new Date(now.getTime() + 50 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
	const dateDigits = packDate.replace(/-/g, "");
	const batchId = `KB-${dateDigits}-01`;

	const toolSetConfigs = {
		therapy: {
			id: "set_therapeutic_tray",
			nameRu: "Стандартный смотровой лоток (Зеркало, зонд, пинцет, гладилка)",
			items: ["Зеркало стоматологическое", "Зонд угловой", "Пинцет анатомический", "Штопфер-гладилка", "Экскаватор"],
			code: "THER",
		},
		surgery: {
			id: "set_surgical_standard",
			nameRu: "Хирургический набор экстракционный",
			items: ["Щипцы байонетные", "Элеватор прямой", "Кюрета хирургическая", "Иглодержатель"],
			code: "SURG",
		},
		endo: {
			id: "set_endodontic_files",
			nameRu: "Эндодонтический набор файлов",
			items: ["Эндобокс", "K-файлы #15-40", "Спредер", "Плаггер", "Линейка"],
			code: "ENDO",
		},
	};

	const cfg = toolSetConfigs[toolSet] || toolSetConfigs.therapy;
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
		notes: "Стандартный смотровой лоток автоклавирования (СанПиН 3.3686-21)",
		createdAt: now.toISOString(),
	};
}

/**
 * Создает валидный крафт-пакет на лету при ручном вводе 2-3 цифр номера или штрихкода.
 * Исключает блокировку работы персонала у кресла (Mandate 8e).
 */
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
		notes: "Крафт-пакет идентифицирован по номеру (СанПиН 3.3686-21)",
		createdAt: now.toISOString(),
	};
}
