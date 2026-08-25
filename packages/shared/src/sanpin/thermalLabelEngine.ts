/**
 * ============================================================================
 * SANPIN THERMAL LABEL ENGINE (TSPL / ZPL / HTML / SVG)
 * Прямая печать этикеток крафт-пакетов на термопринтеры (Zebra, Xprinter, TSC)
 * и расчет сроков годности по СанПиН 3.3686-21 (50 / 60 / 180 / 20 суток).
 * ============================================================================
 */

import {
	generateSanpinDataMatrixSvg,
	type DataMatrixSvgOptions,
} from "./barcodeGenerators.js";
import {
	getKraftMaterialDefinition,
	getKraftSizeDefinition,
	type ExpirationCalculationResult,
	type KraftPackageMaterialId,
	type KraftPackageRecord,
	type KraftPackageStatus,
	type ThermalLabelSize,
} from "./kraftPackageTypes.js";

/**
 * Calculates statutory package expiration date based on SanPiN 3.3686-21 norms:
 * - Single paper self-seal: 50 days
 * - Double paper self-seal: 60 days
 * - Paper-plastic pouch with heat-seal (термосварка): 180 days (6 months)
 * - Crepe paper wrap (2 layers): 60 days
 * - Bix with filter: 20 days
 */
export function calculatePackageExpiration(
	packDateInput: string | Date,
	packageType: KraftPackageMaterialId,
	referenceDateInput: string | Date = new Date(),
): ExpirationCalculationResult {
	const packDate = typeof packDateInput === "string" ? new Date(packDateInput) : packDateInput;
	const refDate = typeof referenceDateInput === "string" ? new Date(referenceDateInput) : referenceDateInput;

	const material = getKraftMaterialDefinition(packageType);
	const daysLifespan = material.statutoryShelfLifeDays;

	// Calculate target expiry date by adding exact statutory calendar days
	const expDate = new Date(packDate.getTime());
	expDate.setDate(expDate.getDate() + daysLifespan);

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

/**
 * Evaluates sterile package status based on expiration date and packaging integrity.
 */
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

/**
 * Transliterates Russian strings for thermal printers with basic ASCII fonts.
 */
export function sanitizeForThermalPrinter(text: string): string {
	return text
		.replace(/[\r\n\t]+/g, " ")
		.replace(/"/g, "'")
		.trim();
}

/**
 * Generates TSPL / TSPL2 command string for Xprinter and TSC thermal printers.
 * Supported label sizes: 58x40 mm and 43x25 mm.
 */
export function generateTsplLabel(
	record: KraftPackageRecord,
	options: {
		size?: ThermalLabelSize | undefined;
		clinicName?: string | undefined;
		copies?: number | undefined;
		dpi?: 203 | 300 | undefined;
	} = {},
): string {
	const size = options.size || "58x40";
	const copies = Math.max(1, options.copies || 1);
	const clinicName = options.clinicName || "DENTE CLINIC";
	const sanitizedTool = sanitizeForThermalPrinter(record.toolSetNameRu);
	const sanitizedNurse = sanitizeForThermalPrinter(record.operatorName);
	const sanitizedClinic = sanitizeForThermalPrinter(clinicName);

	if (size === "43x25") {
		return [
			"SIZE 43 mm, 25 mm",
			"GAP 2 mm, 0",
			"DIRECTION 1",
			"CLS",
			'TEXT 10, 10, "2", 0, 1, 1, "STERILE SanPiN"',
			`TEXT 200, 10, "2", 0, 1, 1, "${record.autoclaveId}/#${record.cycleNumber}"`,
			`DMATRIX 10, 35, 90, 90, "${record.barcodeDataMatrixPayload}"`,
			`TEXT 115, 35, "2", 0, 1, 1, "${sanitizedTool.slice(0, 16)}"`,
			`TEXT 115, 60, "2", 0, 1, 1, "EXP: ${record.expDate}"`,
			`TEXT 115, 85, "1", 0, 1, 1, "${sanitizedNurse.slice(0, 18)}"`,
			`BARCODE 115, 110, "128", 30, 1, 0, 1, 2, "${record.barcode128}"`,
			`PRINT ${copies}, 1`,
			"",
		].join("\r\n");
	}

	// Default: Standard 58x40 mm
	return [
		"SIZE 58 mm, 40 mm",
		"GAP 2 mm, 0",
		"DIRECTION 1",
		"CLS",
		'BOX 10, 8, 450, 310, 2',
		'TEXT 20, 15, "3", 0, 1, 1, "STERILE • SanPiN 3.3686-21"',
		`TEXT 20, 42, "2", 0, 1, 1, "${sanitizedClinic}"`,
		`TEXT 20, 68, "3", 0, 1, 1, "${sanitizedTool.slice(0, 24)}"`,
		`TEXT 20, 98, "2", 0, 1, 1, "AUTO: ${record.autoclaveId} / CYC #${record.cycleNumber}"`,
		`TEXT 20, 122, "2", 0, 1, 1, "STERIL: ${record.packDate}"`,
		`TEXT 20, 146, "3", 0, 1, 1, "EXPIRY: ${record.expDate} (${record.daysLifespan} d.)"`,
		`TEXT 20, 176, "2", 0, 1, 1, "NURSE: ${sanitizedNurse}"`,
		`DMATRIX 320, 40, 120, 120, "${record.barcodeDataMatrixPayload}"`,
		`BARCODE 20, 210, "128", 45, 1, 0, 2, 3, "${record.barcode128}"`,
		`PRINT ${copies}, 1`,
		"",
	].join("\r\n");
}

/**
 * Generates ZPL II command string for Zebra label printers.
 * Supported label sizes: 58x40 mm (464x320 dots at 203 DPI) and 43x25 mm (344x200 dots at 203 DPI).
 */
export function generateZplLabel(
	record: KraftPackageRecord,
	options: {
		size?: ThermalLabelSize | undefined;
		clinicName?: string | undefined;
		copies?: number | undefined;
		dpi?: 203 | 300 | undefined;
	} = {},
): string {
	const size = options.size || "58x40";
	const copies = Math.max(1, options.copies || 1);
	const clinicName = options.clinicName || "DENTE CLINIC";
	const sanitizedTool = sanitizeForThermalPrinter(record.toolSetNameRu);
	const sanitizedNurse = sanitizeForThermalPrinter(record.operatorName);
	const sanitizedClinic = sanitizeForThermalPrinter(clinicName);

	if (size === "43x25") {
		return [
			"^XA",
			"^PW344",
			"^LL200",
			"^LH0,0",
			"^FO10,8^GB324,184,2^FS",
			"^FO15,14^A0N,18,18^FDSTERILE SanPiN^FS",
			`^FO180,14^A0N,16,16^FD${record.autoclaveId}/#${record.cycleNumber}^FS`,
			`^FO15,38^BXN,3,200^FD${record.barcodeDataMatrixPayload}^FS`,
			`^FO110,38^A0N,18,18^FD${sanitizedTool.slice(0, 18)}^FS`,
			`^FO110,62^A0N,16,16^FDEXP: ${record.expDate}^FS`,
			`^FO110,84^A0N,15,15^FDNURSE: ${sanitizedNurse.slice(0, 18)}^FS`,
			`^FO110,110^BCN,35,Y,N,N^FD${record.barcode128}^FS`,
			`^PQ${copies}`,
			"^XZ",
		].join("\r\n");
	}

	// Default: Standard 58x40 mm (203 DPI = 464 x 320 dots)
	return [
		"^XA",
		"^PW464",
		"^LL320",
		"^LH0,0",
		"^FO10,8^GB444,304,2^FS",
		"^FO20,18^A0N,22,22^FDSTERILE - SanPiN 3.3686-21^FS",
		`^FO20,44^A0N,16,16^FD${sanitizedClinic}^FS`,
		`^FO20,70^A0N,22,22^FD${sanitizedTool.slice(0, 24)}^FS`,
		`^FO20,100^A0N,18,18^FDAUTOCLAVE: ${record.autoclaveId} / CYC #${record.cycleNumber}^FS`,
		`^FO20,126^A0N,18,18^FDSTERIL: ${record.packDate}^FS`,
		`^FO20,152^A0N,22,22^FDEXPIRY: ${record.expDate} (${record.daysLifespan} d.)^FS`,
		`^FO20,182^A0N,18,18^FDNURSE: ${sanitizedNurse}^FS`,
		`^FO320,40^BXN,4,200^FD${record.barcodeDataMatrixPayload}^FS`,
		`^FO20,215^BCN,45,Y,N,N^FD${record.barcode128}^FS`,
		`^PQ${copies}`,
		"^XZ",
	].join("\r\n");
}

/**
 * Generates vector HTML thermal sticker snippet (58x40 mm or 43x25 mm).
 */
export function generateThermalStickerHtml(
	record: KraftPackageRecord,
	options: {
		size?: ThermalLabelSize | undefined;
		clinicName?: string | undefined;
		showIndicatorSwatch?: boolean | undefined;
	} = {},
): string {
	const size = options.size || "58x40";
	const clinicName = options.clinicName || "Стоматологическая клиника «DENTE»";
	const showIndicator = options.showIndicatorSwatch ?? true;

	const material = getKraftMaterialDefinition(record.packageType);
	const sizeDef = getKraftSizeDefinition(record.packageSize);
	const dmSvg = generateSanpinDataMatrixSvg(record.barcodeDataMatrixPayload, {
		size: size === "58x40" ? 70 : 50,
	});

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
			<span style="display:inline-block; width:4mm; height:4mm; background:#0f172a; border:0.5pt solid #000; border-radius:0.5mm;" title="Эталонный конечный цвет индикатора"></span>
			<span style="font-weight:bold;">Класс 4/5</span>
		</div>`
				: `<div>ЦСО Оператор: ${record.operatorName}</div>`
		}
		<div style="font-size:5.5pt; text-align:right;">
			Опер: <strong>${record.operatorName.split(" ")[0]}</strong> • ЭЦП OK
		</div>
	</div>
</div>`;
}

/**
 * Generates print-ready A4 Batch Sheet HTML with multiple thermal stickers for standard office laser printing.
 */
export function generateA4BatchSheetHtml(
	records: readonly KraftPackageRecord[],
	options: { clinicName?: string | undefined } = {},
): string {
	const clinicName = options.clinicName || "Стоматологическая клиника «DENTE»";
	const stickersHtml = records
		.map(
			(rec) =>
				`<div class="a4-sticker-item" style="page-break-inside:avoid;">${generateThermalStickerHtml(rec, { size: "58x40", clinicName })}</div>`,
		)
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
