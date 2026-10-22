import type { KraftPackageRecord } from "./kraftPackageTypes.js";

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
