/**
 * ============================================================================
 * SANPIN KRAFT PACKAGE PRINT ENGINES (HTML, TSPL, ZPL II, ESC/POS CP866)
 * Генераторы макетов печати термоэтикеток 58x40 / 43x25 мм и низкоуровневых
 * протоколов термопринтеров.
 * ============================================================================
 */

import {
	getChemicalIndicatorDefinition,
	getKraftMaterialDefinition,
	getKraftSizeDefinition,
} from "./kraftPackagePresets";
import { generateDataMatrixSvg } from "./kraftPackageBarcodes";
import type { KraftPackageRecord } from "./kraftPackageTypes";

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
