/**
 * SANPIN KRAFT PACKAGE VECTOR BARCODES (Code128 & DataMatrix 2D)
 */

export { CODE128_B_PATTERNS, generateCode128Svg } from "./kraftCode128Svg.js";
export { generateDataMatrixSvg } from "./kraftDataMatrixSvg.js";

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

	return `${params.batchId}${serialPart}|${params.autoclaveId}|CYC${params.cycleNumber}|${pDate}|${eDate}|${opId}|${params.toolSetId}`;
}

export function generate1DBarcodeString(batchId: string, serialNumber: number): string {
	const cleanBatch = batchId.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
	const cleanSerial = String(serialNumber).padStart(4, "0");
	return `KB${cleanBatch.slice(-6)}${cleanSerial}`;
}
