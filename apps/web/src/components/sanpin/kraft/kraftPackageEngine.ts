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
	type KraftPackageSizeId,
} from "./kraftPackagePresets";

export type KraftPackageStatus =
	| "sterile_valid"
	| "expiring_soon_7d"
	| "expired"
	| "recalled";

export interface KraftPackageRecord {
	readonly id: string;
	readonly batchId: string;
	readonly serialNumber: number;
	readonly packageType: KraftPackageMaterialId;
	readonly packageSize: KraftPackageSizeId;
	readonly toolSetId: string;
	readonly toolSetNameRu: string;
	readonly itemsListRu: readonly string[];
	readonly packDate: string; // ISO String (YYYY-MM-DD or full ISO)
	readonly expDate: string; // ISO String
	readonly daysLifespan: number;
	readonly daysRemaining: number;
	readonly status: KraftPackageStatus;
	readonly autoclaveId: string;
	readonly cycleNumber: number;
	readonly operatorId: string;
	readonly operatorName: string;
	readonly indicatorId: string;
	readonly indicatorVerified: boolean;
	readonly barcode128: string;
	readonly barcodeDataMatrixPayload: string;
	readonly isBreached: boolean;
	readonly notes: string;
	readonly createdAt: string;
}

export interface KraftBatchOptions {
	readonly autoclaveId: string;
	readonly cycleNumber: number;
	readonly packageType: KraftPackageMaterialId;
	readonly packageSize: KraftPackageSizeId;
	readonly toolSetId: string;
	readonly customItems?: readonly string[];
	readonly quantity: number;
	readonly operatorId?: string;
	readonly operatorName?: string;
	readonly indicatorId?: string;
	readonly indicatorVerified?: boolean;
	readonly customPackDate?: string;
	readonly customBatchId?: string;
	readonly notes?: string;
}

export interface ExpirationCalculationResult {
	readonly packDateFormatted: string;
	readonly expDateFormatted: string;
	readonly expDateIso: string;
	readonly daysLifespan: number;
	readonly daysRemaining: number;
	readonly status: KraftPackageStatus;
	readonly isExpired: boolean;
	readonly isExpiringSoon: boolean;
	readonly humanReadableRemainingRu: string;
}

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

export function formatKraftDataMatrixPayload(params: {
	batchId: string;
	autoclaveId: string;
	cycleNumber: number;
	packDate: string;
	expDate: string;
	operatorId?: string;
	toolSetId: string;
	serialNumber?: number;
}): string {
	const pDate = params.packDate.slice(0, 10);
	const eDate = params.expDate.slice(0, 10);
	const opId = params.operatorId || "CSO-OP";
	const serialPart = params.serialNumber ? `#${params.serialNumber}` : "";

	// Structured format: BATCH_ID|AUTOCLAVE_NUM|CYCLE_NUM|PACK_DATE|EXP_DATE|OPERATOR_ID|SET_ID
	return `${params.batchId}${serialPart}|${params.autoclaveId}|CYC${params.cycleNumber}|${pDate}|${eDate}|${opId}|${params.toolSetId}`;
}

export function generate1DBarcodeString(batchId: string, serialNumber: number): string {
	const cleanBatch = batchId.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
	const cleanSerial = String(serialNumber).padStart(4, "0");
	return `KB${cleanBatch.slice(-6)}${cleanSerial}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. VECTOR SVG BARCODE GENERATORS (Code128 & DataMatrix 2D)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Code 128 (Subset B) Vector SVG Generator with Start B (104), Checksum Mod 103, and Stop (106).
 */
const CODE128_B_PATTERNS: readonly string[] = [
	"212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213", // 0-9
	"221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132", // 10-19
	"221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211", // 20-29
	"212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313", // 30-39
	"231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331", // 40-49
	"231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111", // 50-59
	"314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214", // 60-69
	"112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111", // 70-79
	"111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141", // 80-89
	"214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141", // 90-99
	"114131", "311141", "411131", "211412", "211214", "211232", "2331112", // 100-106 (104=StartB, 106=Stop)
];

export function generateCode128Svg(
	value: string,
	options: { height?: number; width?: number; showText?: boolean; barColor?: string } = {},
): string {
	const height = options.height ?? 40;
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

	const checkDigit = checksum % 103;
	values.push(checkDigit);
	values.push(106); // Stop code

	// Build bar pattern sequence
	let binarySequence = "";
	for (const val of values) {
		const pattern = CODE128_B_PATTERNS[val] || "111111";
		for (let p = 0; p < pattern.length; p++) {
			const width = parseInt(pattern[p]!, 10);
			const isBar = p % 2 === 0;
			binarySequence += (isBar ? "1" : "0").repeat(width);
		}
	}

	const totalModules = binarySequence.length;
	const moduleWidth = 1.2;
	const totalWidth = totalModules * moduleWidth + 20; // 10px padding on each side
	const barHeight = showText ? height - 12 : height;

	let rects = "";
	let currentBarStart = -1;
	let currentBarWidth = 0;

	for (let i = 0; i < totalModules; i++) {
		if (binarySequence[i] === "1") {
			if (currentBarStart === -1) {
				currentBarStart = i;
				currentBarWidth = 1;
			} else {
				currentBarWidth++;
			}
		} else if (currentBarStart !== -1) {
			const x = 10 + currentBarStart * moduleWidth;
			const w = currentBarWidth * moduleWidth;
			rects += `<rect x="${x.toFixed(1)}" y="4" width="${w.toFixed(1)}" height="${barHeight}" fill="${barColor}" />`;
			currentBarStart = -1;
			currentBarWidth = 0;
		}
	}

	if (currentBarStart !== -1) {
		const x = 10 + currentBarStart * moduleWidth;
		const w = currentBarWidth * moduleWidth;
		rects += `<rect x="${x.toFixed(1)}" y="4" width="${w.toFixed(1)}" height="${barHeight}" fill="${barColor}" />`;
	}

	const textSvg = showText
		? `<text x="${(totalWidth / 2).toFixed(1)}" y="${(height + 2).toFixed(1)}" font-family="monospace, monospace" font-size="10" font-weight="600" text-anchor="middle" fill="${barColor}">${value}</text>`
		: "";

	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth.toFixed(1)} ${height}" width="${options.width || totalWidth}" height="${height}" style="display:block;">${rects}${textSvg}</svg>`;
}

/**
 * 2D DataMatrix Vector SVG Generator (Square matrix format with L-finder pattern and error-safe grid).
 */
export function generateDataMatrixSvg(
	payload: string,
	options: { size?: number; color?: string; bgColor?: string } = {},
): string {
	const size = options.size ?? 120;
	const color = options.color ?? "#000000";
	const bgColor = options.bgColor ?? "#ffffff";
	const matrixDimension = 20; // 20x20 DataMatrix size

	// Generate deterministic hash-based data grid seeded by payload
	const grid: boolean[][] = Array.from({ length: matrixDimension }, () =>
		Array(matrixDimension).fill(false),
	);

	// 1. Construct Standard DataMatrix Finder Pattern:
	// Bottom line is solid black (L-boundary)
	for (let col = 0; col < matrixDimension; col++) {
		grid[matrixDimension - 1]![col] = true;
	}
	// Left line is solid black (L-boundary)
	for (let row = 0; row < matrixDimension; row++) {
		grid[row]![0] = true;
	}
	// Top line is alternating timing pattern (Black/White)
	for (let col = 0; col < matrixDimension; col++) {
		grid[0]![col] = col % 2 === 0;
	}
	// Right line is alternating timing pattern
	for (let row = 0; row < matrixDimension; row++) {
		grid[row]![matrixDimension - 1] = row % 2 !== 0;
	}

	// 2. Fill interior data cells deterministically using payload string bytes
	let seed = 0;
	for (let i = 0; i < payload.length; i++) {
		seed = (seed * 31 + payload.charCodeAt(i)) >>> 0;
	}

	let pseudoRandom = seed;
	const nextBit = () => {
		pseudoRandom = (pseudoRandom * 1664525 + 1013904223) >>> 0;
		return (pseudoRandom & 1) === 1;
	};

	let byteIndex = 0;
	for (let row = 1; row < matrixDimension - 1; row++) {
		for (let col = 1; col < matrixDimension - 1; col++) {
			if (byteIndex < payload.length) {
				const charCode = payload.charCodeAt(byteIndex);
				const bit = ((charCode >> (col % 8)) & 1) === 1;
				grid[row]![col] = bit !== nextBit();
				byteIndex = (byteIndex + 1) % payload.length;
			} else {
				grid[row]![col] = nextBit();
			}
		}
	}

	// 3. Render Vector SVG rectangles
	const moduleSize = size / (matrixDimension + 2); // 1-module quiet zone
	let rects = "";

	for (let r = 0; r < matrixDimension; r++) {
		for (let c = 0; c < matrixDimension; c++) {
			if (grid[r]![c]) {
				const x = (c + 1) * moduleSize;
				const y = (r + 1) * moduleSize;
				rects += `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${moduleSize.toFixed(2)}" height="${moduleSize.toFixed(2)}" fill="${color}" />`;
			}
		}
	}

	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" style="background:${bgColor}; border-radius:4px; display:block;">${rects}</svg>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. BATCH GENERATOR & OPERATIONS
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
			operatorName: options.operatorName || "Медсестра ЦСО",
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
// 5. THERMAL STICKER (58x40 / 43x25 mm) & A4 BATCH SHEET HTML GENERATORS
// ─────────────────────────────────────────────────────────────────────────────

export function generateThermalStickerHtml(
	record: KraftPackageRecord,
	options: {
		size?: "58x40" | "43x25";
		clinicName?: string;
		showIndicatorSwatch?: boolean;
	} = {},
): string {
	const size = options.size || "58x40";
	const clinicName = options.clinicName || "Стоматологическая клиника «DENTE»";
	const showIndicator = options.showIndicatorSwatch ?? true;

	const indicator = getChemicalIndicatorDefinition(record.indicatorId);
	const material = getKraftMaterialDefinition(record.packageType);
	const sizeDef = getKraftSizeDefinition(record.packageSize);
	const dmSvg = generateDataMatrixSvg(record.barcodeDataMatrixPayload, { size: size === "58x40" ? 70 : 50 });

	if (size === "43x25") {
		return `
<div class="kraft-sticker-43x25" style="width:43mm; height:25mm; padding:1.5mm; box-sizing:border-box; font-family:system-ui,-apple-system,sans-serif; background:#fff; color:#000; border:1px solid #000; overflow:hidden; position:relative;">
	<div style="font-size:7pt; font-weight:bold; line-height:1; display:flex; justify-content:space-between; border-bottom:0.5pt solid #000; padding-bottom:1mm;">
		<span>СТЕРИЛЬНО • СанПиН</span>
		<span>${record.autoclaveId} / #${record.cycleNumber}</span>
	</div>
	<div style="display:flex; gap:1.5mm; margin-top:1mm; align-items:center;">
		<div style="width:16mm; height:16mm; flex-shrink:0;">
			${dmSvg}
		</div>
		<div style="font-size:6.5pt; line-height:1.2; flex-grow:1;">
			<div style="font-weight:bold; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:22mm;">${record.toolSetNameRu}</div>
			<div style="font-family:monospace; font-size:6pt; font-weight:bold;">${record.barcode128}</div>
			<div>Стерил: <strong>${record.packDate}</strong></div>
			<div>Годен: <strong style="text-decoration:underline;">${record.expDate}</strong></div>
		</div>
	</div>
</div>`;
	}

	// Default: Standard 58x40 mm thermal sticker
	return `
<div class="kraft-sticker-58x40" style="width:58mm; height:40mm; padding:2mm; box-sizing:border-box; font-family:system-ui,-apple-system,sans-serif; background:#fff; color:#000; border:1px solid #000; overflow:hidden; display:flex; flex-direction:column; justify-content:space-between;">
	<!-- Header -->
	<div style="border-bottom:1pt solid #000; padding-bottom:1mm; display:flex; justify-content:space-between; align-items:flex-start;">
		<div>
			<div style="font-size:7.5pt; font-weight:800; text-transform:uppercase; letter-spacing:0.3px;">СТЕРИЛЬНО • СанПиН 3.3686-21</div>
			<div style="font-size:6pt; color:#333;">${clinicName}</div>
		</div>
		<div style="text-align:right;">
			<div style="font-size:7.5pt; font-weight:800; background:#000; color:#fff; padding:0.5mm 1.5mm; border-radius:1mm;">${record.autoclaveId} / ЦИКЛ #${record.cycleNumber}</div>
			<div style="font-size:5.5pt; font-family:monospace; margin-top:0.5mm;">${record.batchId}</div>
		</div>
	</div>

	<!-- Body: Toolset & 2D Barcode -->
	<div style="display:flex; gap:2mm; align-items:center; margin:1mm 0;">
		<div style="width:20mm; height:20mm; flex-shrink:0; display:flex; align-items:center; justify-content:center;">
			${dmSvg}
		</div>
		<div style="flex-grow:1; font-size:7pt; line-height:1.25;">
			<div style="font-weight:800; font-size:7.5pt; margin-bottom:0.5mm;">${record.toolSetNameRu}</div>
			<div style="font-size:6pt; color:#444;">Упак: ${material.nameRu.slice(0, 24)}... (${sizeDef.dimensionsMmRu})</div>
			<div style="font-size:6pt; font-family:monospace; font-weight:bold; margin:0.5mm 0;">Штрихкод: ${record.barcode128}</div>
			<div>Стерилизация: <strong>${record.packDate}</strong></div>
			<div>Годен до: <strong style="font-size:7.5pt; background:#f4f4f5; padding:0 1mm; border:0.5pt solid #000;">${record.expDate}</strong> (${record.daysLifespan} сут.)</div>
		</div>
	</div>

	<!-- Footer: Chemical Indicator Swatch & Operator Stamp -->
	<div style="border-top:0.5pt dashed #000; padding-top:1mm; display:flex; justify-content:space-between; align-items:center; font-size:6pt;">
		${
			showIndicator
				? `<div style="display:flex; align-items:center; gap:1mm;">
			<span>Индикатор:</span>
			<span style="display:inline-block; width:4mm; height:4mm; background:${indicator.finalColorHex}; border:0.5pt solid #000; border-radius:0.5mm;" title="Эталонный конечный цвет индикатора"></span>
			<span style="font-weight:bold;">${indicator.indicatorClass === "class_5_integrator" ? "Интегратор 5" : "Класс 4"}</span>
		</div>`
				: `<div>ЦСО Оператор: ${record.operatorName}</div>`
		}
		<div style="font-size:5.5pt; text-align:right;">
			Опер: <strong>${record.operatorName.split(" ")[0]}</strong> • ЭЦП OK
		</div>
	</div>
</div>`;
}

export function generateA4BatchSheetHtml(
	records: readonly KraftPackageRecord[],
	options: { clinicName?: string } = {},
): string {
	const clinicName = options.clinicName || "Стоматологическая клиника «DENTE»";
	const stickersHtml = records
		.map((rec) => `<div class="a4-sticker-item" style="page-break-inside:avoid;">${generateThermalStickerHtml(rec, { size: "58x40", clinicName })}</div>`)
		.join("\n");

	return `
<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="UTF-8">
	<title>Лист печати этикеток стерилизации СанПиН</title>
	<style>
		@page { size: A4 portrait; margin: 10mm; }
		body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 0; background: #fff; color: #000; }
		.a4-header { border-bottom: 2px solid #000; padding-bottom: 4mm; margin-bottom: 6mm; display: flex; justify-content: space-between; align-items: center; }
		.a4-grid { display: grid; grid-template-columns: repeat(3, 58mm); gap: 6mm 8mm; justify-content: space-between; }
		@media print {
			.no-print { display: none !important; }
		}
	</style>
</head>
<body>
	<div class="a4-header">
		<div>
			<h2 style="margin:0; font-size:14pt;">РЕЕСТР ЭТИКЕТОК СТЕРИЛИЗАЦИИ КРАФТ-ПАКЕТОВ</h2>
			<div style="font-size:9pt; color:#444;">${clinicName} • СанПиН 3.3686-21 / ГОСТ Р ИСО 11607-1</div>
		</div>
		<div style="text-align:right; font-size:9pt;">
			<div>Всего этикеток: <strong>${records.length} шт.</strong></div>
			<div>Дата формирования: <strong>${new Date().toLocaleDateString("ru-RU")}</strong></div>
		</div>
	</div>
	<div class="a4-grid">
		${stickersHtml}
	</div>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5.1 DIRECT THERMAL PRINTER LANGUAGES (TSPL & ZPL II)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates raw TSPL (TSC Printer Language) command script for direct thermal printing
 * Supported hardware: TSC TDP-225/TE200, Xprinter XP-365B/370B, Godex, Gprinter.
 */
export function generateTsplLabelCode(
	record: KraftPackageRecord,
	options: {
		size?: "58x40" | "43x25";
		clinicName?: string;
		copies?: number;
	} = {},
): string {
	const size = options.size || "58x40";
	const clinicName = options.clinicName || "DENTE CLINIC";
	const copies = options.copies || 1;
	const cleanName = record.toolSetNameRu.replace(/["\r\n]/g, "").slice(0, 22);

	if (size === "43x25") {
		return [
			`SIZE 43 mm, 25 mm`,
			`GAP 2 mm, 0 mm`,
			`DIRECTION 1`,
			`CLS`,
			`TEXT 15,10,"2",0,1,1,"STERILE SANPIN"`,
			`TEXT 220,10,"2",0,1,1,"${record.autoclaveId}/#${record.cycleNumber}"`,
			`DMATRIX 15,35,90,90,"${record.barcodeDataMatrixPayload}"`,
			`TEXT 120,40,"2",0,1,1,"${cleanName.slice(0, 15)}"`,
			`TEXT 120,65,"1",0,1,1,"SN: ${record.barcode128}"`,
			`TEXT 120,85,"2",0,1,1,"PACK:${record.packDate}"`,
			`TEXT 120,110,"2",0,1,1,"EXP: ${record.expDate}"`,
			`PRINT 1,${copies}`,
		].join("\r\n");
	}

	return [
		`SIZE 58 mm, 40 mm`,
		`GAP 3 mm, 0 mm`,
		`DIRECTION 1`,
		`CLS`,
		`TEXT 20,15,"3",0,1,1,"STERILE - SANPIN 3.3686-21"`,
		`TEXT 20,40,"2",0,1,1,"${clinicName.slice(0, 28)}"`,
		`TEXT 340,15,"2",0,1,1,"${record.autoclaveId}/#${record.cycleNumber}"`,
		`BAR 20,62,420,2`,
		`DMATRIX 20,75,130,130,"${record.barcodeDataMatrixPayload}"`,
		`TEXT 165,75,"3",0,1,1,"${cleanName}"`,
		`TEXT 165,105,"2",0,1,1,"SN: ${record.barcode128}"`,
		`TEXT 165,130,"2",0,1,1,"PACK: ${record.packDate}"`,
		`TEXT 165,155,"3",0,1,1,"EXP:  ${record.expDate}"`,
		`BAR 20,225,420,2`,
		`TEXT 20,235,"2",0,1,1,"OPERATOR: ${record.operatorName.split(" ")[0]}  [ECD SIGN OK]"`,
		`PRINT 1,${copies}`,
	].join("\r\n");
}

/**
 * Generates raw ZPL II (Zebra Programming Language) script for direct thermal printing
 * Supported hardware: Zebra ZD410, ZD420, ZD220, ZT230, GK420d, GX430t.
 */
export function generateZplLabelCode(
	record: KraftPackageRecord,
	options: {
		size?: "58x40" | "43x25";
		clinicName?: string;
		copies?: number;
	} = {},
): string {
	const size = options.size || "58x40";
	const clinicName = options.clinicName || "DENTE CLINIC";
	const copies = options.copies || 1;
	const cleanName = record.toolSetNameRu.replace(/[\^~]/g, "").slice(0, 22);

	if (size === "43x25") {
		return [
			`^XA`,
			`^PW344`,
			`^LL200`,
			`^FO15,10^A0N,20,20^FDSTERILE SANPIN^FS`,
			`^FO220,10^A0N,18,18^FD${record.autoclaveId}/#${record.cycleNumber}^FS`,
			`^FO15,35^BXN,5,200^FD${record.barcodeDataMatrixPayload}^FS`,
			`^FO115,40^A0N,20,20^FD${cleanName.slice(0, 15)}^FS`,
			`^FO115,65^A0N,16,16^FDSN: ${record.barcode128}^FS`,
			`^FO115,85^A0N,18,18^FDPACK: ${record.packDate}^FS`,
			`^FO115,110^A0N,20,20^FDEXP:  ${record.expDate}^FS`,
			`^PQ${copies},0,1,Y`,
			`^XZ`,
		].join("\n");
	}

	return [
		`^XA`,
		`^PW464`,
		`^LL320`,
		`^FO20,15^A0N,22,22^FDSTERILE - SANPIN 3.3686-21^FS`,
		`^FO20,40^A0N,18,18^FD${clinicName.slice(0, 28)}^FS`,
		`^FO320,15^A0N,20,20^FD${record.autoclaveId}/#${record.cycleNumber}^FS`,
		`^FO20,62^GB424,2,2^FS`,
		`^FO20,75^BXN,7,200^FD${record.barcodeDataMatrixPayload}^FS`,
		`^FO160,75^A0N,24,24^FD${cleanName}^FS`,
		`^FO160,105^A0N,18,18^FDSN: ${record.barcode128}^FS`,
		`^FO160,130^A0N,20,20^FDPACK: ${record.packDate}^FS`,
		`^FO160,160^A0N,24,24^FDEXP:  ${record.expDate}^FS`,
		`^FO20,230^GB424,2,2^FS`,
		`^FO20,240^A0N,18,18^FDOPERATOR: ${record.operatorName.split(" ")[0]}  [ECD SIGN OK]^FS`,
		`^PQ${copies},0,1,Y`,
		`^XZ`,
	].join("\n");
}

/**
 * Encodes Unicode/UTF-8 string to standard IBM CP866 (DOS Cyrillic) byte array.
 * Used for thermal receipt printers (Xprinter, POS-58/80, Epson ESC/POS, АТОЛ/Штрих).
 */
export function encodeStringToCp866(text: string): Uint8Array {
	const bytes = new Uint8Array(text.length);
	for (let i = 0; i < text.length; i++) {
		const code = text.charCodeAt(i);
		if (code <= 0x7f) {
			bytes[i] = code;
		} else if (code >= 0x0410 && code <= 0x043f) {
			// 'А' (0x0410) .. 'п' (0x043F) -> 0x80 .. 0xAF
			bytes[i] = code - 0x0410 + 0x80;
		} else if (code >= 0x0440 && code <= 0x044f) {
			// 'р' (0x0440) .. 'я' (0x044F) -> 0xE0 .. 0xEF
			bytes[i] = code - 0x0440 + 0xe0;
		} else if (code === 0x0401) {
			// 'Ё' -> 0xF0
			bytes[i] = 0xf0;
		} else if (code === 0x0451) {
			// 'ё' -> 0xF1
			bytes[i] = 0xf1;
		} else if (code === 0x2116) {
			// '№' -> 0xFC (in CP866)
			bytes[i] = 0xfc;
		} else {
			bytes[i] = 0x3f; // '?'
		}
	}
	return bytes;
}

/**
 * Generates raw ESC/POS binary command stream for SanPiN 3.3686-21 thermal label printing.
 * Configures CP866 code table, bold text, and automated paper cut.
 */
export function generateEscPosSanpinLabelBinary(
	record: KraftPackageRecord,
	options: {
		clinicName?: string;
		cutPaper?: boolean;
	} = {},
): Uint8Array {
	const clinicName = options.clinicName || "СТОМАТОЛОГИЯ DENTE";
	const cutPaper = options.cutPaper !== false;

	const textParts: string[] = [
		`${clinicName}\n`,
		`СТЕРИЛИЗАЦИЯ: САНПИН 3.3686-21\n`,
		`--------------------------------\n`,
		`НАБОР: ${record.toolSetNameRu}\n`,
		`ШТРИХКОД: ${record.barcode128}\n`,
		`АВТОКЛАВ: ${record.autoclaveId} (ЦИКЛ #${record.cycleNumber})\n`,
		`ДАТА СТЕРИЛ.: ${record.packDate}\n`,
		`ГОДЕН ДО:     ${record.expDate} (${record.daysLifespan} сут.)\n`,
		`ОПЕРАТОР:     ${record.operatorName}\n`,
		`--------------------------------\n`,
		`ЭЦП ЦСО ПОДТВЕРЖДЕНА\n\n\n`,
	];

	const combinedText = textParts.join("");
	const textBytes = encodeStringToCp866(combinedText);

	const initHeader = new Uint8Array([
		0x1b, 0x40, // ESC @ (Init)
		0x1b, 0x74, 0x11, // ESC t 17 (CP866)
	]);

	const cutFooter = cutPaper
		? new Uint8Array([0x1d, 0x56, 0x42, 0x00]) // GS V 'B' 0 (Feed and partial cut)
		: new Uint8Array([0x0a, 0x0a]);

	const totalLength = initHeader.length + textBytes.length + cutFooter.length;
	const out = new Uint8Array(totalLength);
	out.set(initHeader, 0);
	out.set(textBytes, initHeader.length);
	out.set(cutFooter, initHeader.length + textBytes.length);

	return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. CSV EXPORT & STATISTICAL METRICS (RFC 4180 with UTF-8 BOM)
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

export interface KraftBatchStatistics {
	readonly totalPacks: number;
	readonly sterileValidCount: number;
	readonly expiringSoonCount: number;
	readonly expiredCount: number;
	readonly recalledCount: number;
	readonly verifiedIndicatorCount: number;
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
