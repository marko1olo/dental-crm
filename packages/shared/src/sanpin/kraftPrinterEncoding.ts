/**
 * packages/shared/src/sanpin/kraftPrinterEncoding.ts
 * Генераторы команд термопечати этикеток стерилизации (TSPL, ZPL, ESC-POS).
 * Мандат 8b: строго <= 120 строк.
 */

import type { KraftPackageRecord, ThermalLabelSize } from "./kraftPackageTypes.js";
import { sanitizeForThermalPrinter } from "./thermalLabelEngine.js";

export function encodeStringToCp866(text: string): Uint8Array {
	const bytes = new Uint8Array(text.length);
	for (let i = 0; i < text.length; i++) {
		const code = text.charCodeAt(i);
		if (code <= 0x7f) bytes[i] = code;
		else if (code >= 0x0410 && code <= 0x043f) bytes[i] = code - 0x0410 + 0x80;
		else if (code >= 0x0440 && code <= 0x044f) bytes[i] = code - 0x0440 + 0xe0;
		else if (code === 0x0401) bytes[i] = 0xf0;
		else if (code === 0x0451) bytes[i] = 0xf1;
		else if (code === 0x2116) bytes[i] = 0xfc;
		else bytes[i] = 0x3f;
	}
	return bytes;
}

export function generateTsplLabelCode(
	record: KraftPackageRecord,
	options: { size?: ThermalLabelSize | undefined; clinicName?: string | undefined; copies?: number | undefined } = {},
): string {
	const size = options.size || "58x40";
	const clinicName = options.clinicName || "DENTE CLINIC";
	const copies = Math.max(1, options.copies || 1);
	const cleanName = sanitizeForThermalPrinter(record.toolSetNameRu).slice(0, 22);

	if (size === "43x25") {
		return [
			"SIZE 43 mm, 25 mm\r\nGAP 2 mm, 0 mm\r\nDIRECTION 1\r\nCLS",
			'TEXT 15,10,"2",0,1,1,"STERILE SANPIN"',
			`TEXT 220,10,"2",0,1,1,"${record.autoclaveId}/#${record.cycleNumber}"`,
			`DMATRIX 15,35,90,90,"${record.barcodeDataMatrixPayload}"`,
			`TEXT 120,40,"2",0,1,1,"${cleanName.slice(0, 15)}"`,
			`TEXT 120,65,"1",0,1,1,"SN: ${record.barcode128}"`,
			`TEXT 120,85,"2",0,1,1,"PACK:${record.packDate}"`,
			`TEXT 120,110,"2",0,1,1,"EXP: ${record.expDate}"`,
			`PRINT 1,${copies}\r\n`,
		].join("\r\n");
	}

	return [
		"SIZE 58 mm, 40 mm\r\nGAP 3 mm, 0 mm\r\nDIRECTION 1\r\nCLS",
		'TEXT 20,15,"3",0,1,1,"STERILE - SANPIN 3.3686-21"',
		`TEXT 20,40,"2",0,1,1,"${clinicName.slice(0, 28)}"`,
		`TEXT 340,15,"2",0,1,1,"${record.autoclaveId}/#${record.cycleNumber}"`,
		"BAR 20,62,420,2",
		`DMATRIX 20,75,130,130,"${record.barcodeDataMatrixPayload}"`,
		`TEXT 165,75,"3",0,1,1,"${cleanName}"`,
		`TEXT 165,105,"2",0,1,1,"SN: ${record.barcode128}"`,
		`TEXT 165,130,"2",0,1,1,"PACK: ${record.packDate}"`,
		`TEXT 165,155,"3",0,1,1,"EXP:  ${record.expDate}"`,
		"BAR 20,225,420,2",
		`TEXT 20,235,"2",0,1,1,"OPERATOR: ${record.operatorName.split(" ")[0]}  [ECD SIGN OK]"`,
		`PRINT 1,${copies}\r\n`,
	].join("\r\n");
}

export function generateZplLabelCode(
	record: KraftPackageRecord,
	options: { size?: ThermalLabelSize | undefined; clinicName?: string | undefined; copies?: number | undefined } = {},
): string {
	const size = options.size || "58x40";
	const clinicName = options.clinicName || "DENTE CLINIC";
	const copies = Math.max(1, options.copies || 1);
	const cleanName = sanitizeForThermalPrinter(record.toolSetNameRu).replace(/[\^~]/g, "").slice(0, 22);

	if (size === "43x25") {
		return [
			"^XA\n^PW344\n^LL200\n^FO15,10^A0N,20,20^FDSTERILE SANPIN^FS",
			`^FO220,10^A0N,18,18^FD${record.autoclaveId}/#${record.cycleNumber}^FS`,
			`^FO15,35^BXN,5,200^FD${record.barcodeDataMatrixPayload}^FS`,
			`^FO115,40^A0N,20,20^FD${cleanName.slice(0, 15)}^FS`,
			`^FO115,65^A0N,16,16^FDSN: ${record.barcode128}^FS`,
			`^FO115,85^A0N,18,18^FDPACK: ${record.packDate}^FS`,
			`^FO115,110^A0N,20,20^FDEXP:  ${record.expDate}^FS`,
			`^PQ${copies},0,1,Y\n^XZ`,
		].join("\n");
	}

	return [
		"^XA\n^PW464\n^LL320\n^FO20,15^A0N,22,22^FDSTERILE - SANPIN 3.3686-21^FS",
		`^FO20,40^A0N,18,18^FD${clinicName.slice(0, 28)}^FS`,
		`^FO320,15^A0N,20,20^FD${record.autoclaveId}/#${record.cycleNumber}^FS`,
		"^FO20,62^GB424,2,2^FS",
		`^FO20,75^BXN,7,200^FD${record.barcodeDataMatrixPayload}^FS`,
		`^FO160,75^A0N,24,24^FD${cleanName}^FS`,
		`^FO160,105^A0N,18,18^FDSN: ${record.barcode128}^FS`,
		`^FO160,130^A0N,20,20^FDPACK: ${record.packDate}^FS`,
		`^FO160,160^A0N,24,24^FDEXP:  ${record.expDate}^FS`,
		"^FO20,230^GB424,2,2^FS",
		`^FO20,240^A0N,18,18^FDOPERATOR: ${record.operatorName.split(" ")[0]}  [ECD SIGN OK]^FS`,
		`^PQ${copies},0,1,Y\n^XZ`,
	].join("\n");
}

export function generateEscPosSanpinLabelBinary(
	record: KraftPackageRecord,
	options: { clinicName?: string | undefined; cutPaper?: boolean | undefined } = {},
): Uint8Array {
	const clinicName = options.clinicName || "СТОМАТОЛОГИЯ DENTE";
	const cutPaper = options.cutPaper !== false;
	const text = `${clinicName}\nСТЕРИЛИЗАЦИЯ: САНПИН 3.3686-21\n--------------------------------\nНАБОР: ${record.toolSetNameRu}\nШТРИХКОД: ${record.barcode128}\nАВТОКЛАВ: ${record.autoclaveId} (ЦИКЛ #${record.cycleNumber})\nДАТА СТЕРИЛ.: ${record.packDate}\nГОДЕН ДО:     ${record.expDate} (${record.daysLifespan} сут.)\nОПЕРАТОР:     ${record.operatorName}\n--------------------------------\nЭЦП ПОДТВЕРЖДЕНА\n\n\n`;
	const textBytes = encodeStringToCp866(text);
	const initHeader = new Uint8Array([0x1b, 0x40, 0x1b, 0x74, 0x11]);
	const cutFooter = cutPaper ? new Uint8Array([0x1d, 0x56, 0x42, 0x00]) : new Uint8Array([0x0a, 0x0a]);
	const out = new Uint8Array(initHeader.length + textBytes.length + cutFooter.length);
	out.set(initHeader, 0);
	out.set(textBytes, initHeader.length);
	out.set(cutFooter, initHeader.length + textBytes.length);
	return out;
}
