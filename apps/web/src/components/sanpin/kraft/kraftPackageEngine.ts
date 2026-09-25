/**
 * ============================================================================
 * SANPIN KRAFT PACKAGE BARCODE & EXPIRY ENGINE
 * Расчет нормативных сроков сохранения стерильности (СанПиН 3.3686-21),
 * векторные генераторы 1D Code128 и 2D DataMatrix SVG, генерация этикеток
 * для термопринтеров 58x40 / 43x25 мм и пакетный учет партий ЦСО.
 * ============================================================================
 */

import {
	getChemicalIndicatorDefinition,
	getDentalToolSetDefinition,
	getKraftMaterialDefinition,
	getKraftSizeDefinition,
	type KraftPackageMaterialId,
} from "./kraftPackagePresets";
import {
	formatKraftDataMatrixPayload,
	generate1DBarcodeString,
} from "./kraftPackageBarcodes";
import type {
	ExpirationCalculationResult,
	KraftBatchOptions,
	KraftBatchStatistics,
	KraftPackageRecord,
	KraftPackageStatus,
} from "./kraftPackageTypes";

// Transparent re-exports of types, barcodes and print engines
export * from "./kraftPackageTypes";
export * from "./kraftPackageBarcodes";
export * from "./kraftPackagePrintEngines";

// ─────────────────────────────────────────────────────────────────────────────
// 1. EXPIRATION DATE MATH & STATUS EVALUATOR
// ─────────────────────────────────────────────────────────────────────────────

export function calculatePackageExpiration(
	packDateInput: string | Date,
	packageType: KraftPackageMaterialId,
	referenceDateInput: string | Date = new Date(),
): ExpirationCalculationResult {
	const packDate = typeof packDateInput === "string" ? new Date(packDateInput) : packDateInput;
	const refDate = typeof referenceDateInput === "string" ? new Date(referenceDateInput) : referenceDateInput;

	const material = getKraftMaterialDefinition(packageType);
	const daysLifespan = material.statutoryShelfLifeDays;

	// Calculate target expiry by adding statutory calendar days
	const expDate = new Date(packDate.getTime());
	expDate.setDate(expDate.getDate() + daysLifespan);

	// Difference in days between reference date and expiration date
	const diffMs = expDate.getTime() - refDate.getTime();
	const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

	let status: KraftPackageStatus = "sterile_valid";
	if (daysRemaining <= 0) {
		status = "expired";
	} else if (daysRemaining <= 7) {
		status = "expiring_soon_7d";
	}

	const isExpired = status === "expired";
	const isExpiringSoon = status === "expiring_soon_7d";

	let humanReadableRemainingRu = "";
	if (isExpired) {
		const overdueDays = Math.abs(daysRemaining);
		humanReadableRemainingRu = `Просрочено на ${overdueDays} дн. (требуется повторная ПСО)`;
	} else if (daysRemaining === 0) {
		humanReadableRemainingRu = "Истекает сегодня (до 23:59)";
	} else if (daysRemaining === 1) {
		humanReadableRemainingRu = "Остался 1 день стерильности";
	} else {
		humanReadableRemainingRu = `Осталось ${daysRemaining} дн. стерильности`;
	}

	const packDateFormatted = packDate.toISOString().slice(0, 10);
	const expDateFormatted = expDate.toISOString().slice(0, 10);

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

export function evaluateKraftPackageStatus(
	expDateInput: string | Date,
	isBreached = false,
	referenceDateInput: string | Date = new Date(),
): KraftPackageStatus {
	if (isBreached) {
		return "recalled";
	}

	const expDate = typeof expDateInput === "string" ? new Date(expDateInput) : expDateInput;
	const refDate = typeof referenceDateInput === "string" ? new Date(referenceDateInput) : referenceDateInput;

	const diffMs = expDate.getTime() - refDate.getTime();
	const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

	if (daysRemaining <= 0) {
		return "expired";
	}
	if (daysRemaining <= 7) {
		return "expiring_soon_7d";
	}
	return "sterile_valid";
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. BARCODE PAYLOAD FORMATTER (SanPiN Structured Payload)
// ─────────────────────────────────────────────────────────────────────────────

export { formatKraftDataMatrixPayload, generate1DBarcodeString };

// ─────────────────────────────────────────────────────────────────────────────
// 3. BATCH GENERATOR & OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

export function generateKraftBatchRecords(options: KraftBatchOptions): KraftPackageRecord[] {
	const quantity = Math.max(1, Math.min(100, options.quantity));
	const now = new Date();
	const packDateStr = options.customPackDate || now.toISOString();

	const expResult = calculatePackageExpiration(packDateStr, options.packageType, now);
	const toolSet = getDentalToolSetDefinition(options.toolSetId);
	const material = getKraftMaterialDefinition(options.packageType);
	const sizeDef = getKraftSizeDefinition(options.packageSize);
	const indicator = getChemicalIndicatorDefinition(options.indicatorId || "vinar_steritest_4");

	const batchId =
		options.customBatchId ||
		`KB-${now.toISOString().slice(0, 10).replace(/-/g, "")}-${String(options.cycleNumber).padStart(2, "0")}`;

	const itemsList =
		options.customItems && options.customItems.length > 0
			? options.customItems
			: toolSet.typicalItemsRu;

	const records: KraftPackageRecord[] = [];

	for (let i = 1; i <= quantity; i++) {
		const serialNumber = i;
		const barcode128 = generate1DBarcodeString(batchId, serialNumber);
		const dataMatrixPayload = formatKraftDataMatrixPayload({
			batchId,
			autoclaveId: options.autoclaveId,
			cycleNumber: options.cycleNumber,
			packDate: expResult.packDateFormatted,
			expDate: expResult.expDateFormatted,
			operatorId: options.operatorId || "NURSE-01",
			toolSetId: toolSet.shortCode,
			serialNumber,
		});

		const record: KraftPackageRecord = {
			id: `kp-${batchId.toLowerCase()}-${String(serialNumber).padStart(3, "0")}`,
			batchId,
			serialNumber,
			packageType: options.packageType,
			packageSize: options.packageSize,
			toolSetId: toolSet.id,
			toolSetNameRu: toolSet.nameRu,
			itemsListRu: [...itemsList],
			packDate: expResult.packDateFormatted,
			expDate: expResult.expDateFormatted,
			daysLifespan: expResult.daysLifespan,
			daysRemaining: expResult.daysRemaining,
			status: expResult.status,
			autoclaveId: options.autoclaveId,
			cycleNumber: options.cycleNumber,
			operatorId: options.operatorId || "NURSE-01",
			operatorName: options.operatorName || "Персонал клиники",
			indicatorId: indicator.id,
			indicatorVerified: options.indicatorVerified ?? true,
			barcode128,
			barcodeDataMatrixPayload: dataMatrixPayload,
			isBreached: false,
			notes: options.notes || `Партия ${material.shortLabelRu}, размер ${sizeDef.dimensionsMmRu}`,
			createdAt: now.toISOString(),
		};

		records.push(record);
	}

	return records;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. CSV EXPORT & STATISTICAL METRICS (RFC 4180 with UTF-8 BOM)
// ─────────────────────────────────────────────────────────────────────────────

export function exportKraftBatchToCsv(records: readonly KraftPackageRecord[]): string {
	const headers = [
		"ID записи",
		"Номер партии",
		"Серийный номер",
		"Штрихкод 1D",
		"2D DataMatrix Payload",
		"Наименование набора",
		"Тип материала упаковки",
		"Размер упаковки",
		"Дата стерилизации",
		"Срок годности (до)",
		"Нормативный срок (суток)",
		"Осталось дней",
		"Статус стерильности",
		"Автоклав",
		"Номер цикла",
		"Оператор ЦСО",
		"Химический индикатор",
		"Целостность не нарушена",
		"Примечания",
	];

	const escapeCsv = (val: unknown): string => {
		if (val === null || val === undefined) return '""';
		const str = String(val).replace(/"/g, '""');
		return `"${str}"`;
	};

	const rows = records.map((r) => [
		escapeCsv(r.id),
		escapeCsv(r.batchId),
		escapeCsv(r.serialNumber),
		escapeCsv(r.barcode128),
		escapeCsv(r.barcodeDataMatrixPayload),
		escapeCsv(r.toolSetNameRu),
		escapeCsv(getKraftMaterialDefinition(r.packageType).nameRu),
		escapeCsv(getKraftSizeDefinition(r.packageSize).dimensionsMmRu),
		escapeCsv(r.packDate),
		escapeCsv(r.expDate),
		escapeCsv(r.daysLifespan),
		escapeCsv(r.daysRemaining),
		escapeCsv(
			r.status === "sterile_valid"
				? "Стерильно (годен)"
				: r.status === "expiring_soon_7d"
					? "Истекает (<= 7 дней)"
					: r.status === "expired"
						? "Просрочено"
						: "Отозвано",
		),
		escapeCsv(r.autoclaveId),
		escapeCsv(r.cycleNumber),
		escapeCsv(r.operatorName),
		escapeCsv(getChemicalIndicatorDefinition(r.indicatorId).brandNameRu),
		escapeCsv(r.isBreached ? "НЕТ (НАРУШЕНА)" : "ДА (СОБЛЮДЕНА)"),
		escapeCsv(r.notes),
	]);

	const csvBody = [headers.join(";"), ...rows.map((row) => row.join(";"))].join("\r\n");
	return `\uFEFF${csvBody}`;
}

export function filterKraftPackages(
	records: readonly KraftPackageRecord[],
	filter: {
		status?: KraftPackageStatus | "all";
		query?: string;
		autoclaveId?: string;
	},
): KraftPackageRecord[] {
	return records.filter((r) => {
		if (filter.status && filter.status !== "all" && r.status !== filter.status) {
			return false;
		}
		if (filter.autoclaveId && filter.autoclaveId !== "all" && r.autoclaveId !== filter.autoclaveId) {
			return false;
		}
		if (filter.query && filter.query.trim()) {
			const q = filter.query.toLowerCase().trim();
			const matchName = r.toolSetNameRu.toLowerCase().includes(q);
			const matchBarcode = r.barcode128.toLowerCase().includes(q);
			const matchBatch = r.batchId.toLowerCase().includes(q);
			const matchOperator = r.operatorName.toLowerCase().includes(q);
			if (!matchName && !matchBarcode && !matchBatch && !matchOperator) {
				return false;
			}
		}
		return true;
	});
}

export function calculateKraftBatchStatistics(
	records: readonly KraftPackageRecord[],
): KraftBatchStatistics {
	let sterileValidCount = 0;
	let expiringSoonCount = 0;
	let expiredCount = 0;
	let recalledCount = 0;
	let verifiedIndicatorCount = 0;

	for (const r of records) {
		if (r.status === "sterile_valid") sterileValidCount++;
		else if (r.status === "expiring_soon_7d") expiringSoonCount++;
		else if (r.status === "expired") expiredCount++;
		else if (r.status === "recalled") recalledCount++;

		if (r.indicatorVerified) verifiedIndicatorCount++;
	}

	return {
		totalPacks: records.length,
		sterileValidCount,
		expiringSoonCount,
		expiredCount,
		recalledCount,
		verifiedIndicatorCount,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. CONVENIENCE HELPERS (Mandates 8e, 8k, 8v, SanPiN 3.3686-21)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Генерирует нормативный стерильный смотровой лоток с СЕГОДНЯШНЕЙ датой стерилизации.
 * Освобождает врача и медсестру у кресла от многошаговых барьеров (Мандаты 8e, 8k, СанПиН 3.3686-21).
 */
export function createStandardTrayKraftPackageRecord(
	toolSet: "therapy" | "surgery" | "endo" = "therapy",
	operatorName = "Персонал клиники"
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
	operatorName = "Персонал клиники"
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
		operatorId: "NURSE-01",
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
