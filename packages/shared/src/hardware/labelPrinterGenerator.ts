/**
 * @dental/shared/hardware — Thermal Label Printer Command Generators (TSPL & ZPL II)
 *
 * Implements standard label generation for dental sterilization pouches, cassettes, and bixes
 * in accordance with SanPiN 3.3686-21 and GOST ISO 11140-1.
 *
 * Supported Protocols:
 * 1. TSPL / TSPL2 (TSC, Xprinter XP-365B/XP-370B, Godex, Rongta, Gprinter, HPRT).
 * 2. ZPL II (Zebra ZD220, ZD420, GK420d, GX430t, Honeywell, Citizen ZPL emulation).
 *
 * Capabilities:
 * - Direct 2D DataMatrix barcode generation for fast chairside verification.
 * - Russian text encoding (CP1251 / UTF-8).
 * - Exact physical millimeter sizing (50x30mm, 58x40mm, 43x25mm).
 * - Auto-rotation, speed, density, and gap configuration.
 */

import type { AutoclavePouchLabelPayload, LabelPrinterEmulation } from "./hardwareTypes.js";

// ============================================================================
// 1. RUSSIAN WINDOWS-1251 (CP1251) ENCODER
// ============================================================================

/**
 * Encodes a Unicode string into Windows-1251 (CP1251) byte array for TSPL printers.
 */
export function encodeCp1251(text: string): Uint8Array {
	if (!text || typeof text !== "string") {
		return new Uint8Array(0);
	}

	const bytes: number[] = [];
	for (let i = 0; i < text.length; i++) {
		const code = text.charCodeAt(i);

		if (code <= 0x7f) {
			bytes.push(code);
		} else if (code >= 0x0410 && code <= 0x044f) {
			// 'А'..'я' -> 0xC0..0xFF
			bytes.push(code - 0x0410 + 0xc0);
		} else if (code === 0x0401) {
			// 'Ё'
			bytes.push(0xa8);
		} else if (code === 0x0451) {
			// 'ё'
			bytes.push(0xb8);
		} else if (code === 0x2116) {
			// '№'
			bytes.push(0xb9);
		} else if (code === 0x20bd) {
			// '₽' -> fallback to 'р' (0xF0) or 0x88
			bytes.push(0xf0);
		} else if (code === 0x00b0) {
			// '°'
			bytes.push(0xb0);
		} else if (code === 0x2014 || code === 0x2013 || code === 0x2212) {
			bytes.push(0x2d); // '-'
		} else if (code === 0x00ab || code === 0x00bb || code === 0x201c || code === 0x201d) {
			bytes.push(0x22); // '"'
		} else {
			bytes.push(0x3f); // '?'
		}
	}

	return new Uint8Array(bytes);
}

// ============================================================================
// 2. TSPL / TSPL2 LABEL GENERATOR
// ============================================================================

export interface TsplGenerationOptions {
	/** Encoding mode: 'cp1251' (standard on Xprinter/TSC) or 'utf8' */
	readonly encoding?: "cp1251" | "utf8" | undefined;
	/** Number of copies to print (default: 1) */
	readonly copies?: number | undefined;
}

/**
 * Builds TSPL command stream for SanPiN 3.3686-21 dental autoclave pouch label.
 */
export function buildTsplAutoclavePouchLabel(
	payload: AutoclavePouchLabelPayload,
	options: TsplGenerationOptions = {},
): Uint8Array {
	const widthMm = payload.labelWidthMm ?? 50;
	const heightMm = payload.labelHeightMm ?? 30;
	const gapMm = payload.gapMm ?? 2;
	const speed = payload.speed ?? 3;
	const density = payload.density ?? 8;
	const copies = options.copies ?? 1;
	const encoding = options.encoding ?? "cp1251";

	const lines: string[] = [];

	// 1. Setup label geometry
	lines.push(`SIZE ${widthMm} mm, ${heightMm} mm`);
	lines.push(`GAP ${gapMm} mm, 0 mm`);
	lines.push(`SPEED ${speed}`);
	lines.push(`DENSITY ${density}`);
	lines.push("DIRECTION 1");
	lines.push("REFERENCE 0,0");
	lines.push("CLS");

	if (encoding === "cp1251") {
		lines.push("CODEPAGE 1251");
	} else {
		lines.push("CODEPAGE UTF-8");
	}

	// 2. Header: Clinic / SanPiN Title
	lines.push('TEXT 15,12,"2",0,1,1,"DENTE СТЕРИЛИЗАЦИЯ (СанПиН)"');

	// 3. Sterilization Batch & Cycle
	const batchLine = `Партия: ${payload.batchNumber}  Ц:${payload.cycleNumber}`;
	lines.push(`TEXT 15,38,"2",0,1,1,"${escapeTsplString(batchLine)}"`);

	// 4. Dates
	lines.push(`TEXT 15,62,"1",0,1,1,"Стерил: ${escapeTsplString(payload.sterilizationDate)}"`);
	lines.push(`TEXT 15,84,"1",0,1,1,"Годен до: ${escapeTsplString(payload.expiryDate)}"`);

	// 5. Autoclave and Indicator Info
	const autoclave = payload.autoclaveModel || "Автоклав B-класс";
	const program = payload.program || "134°C / 2.1 bar";
	lines.push(`TEXT 15,106,"1",0,1,1,"${escapeTsplString(`${autoclave} (${program})`)}"`);

	const indClass = payload.indicatorClass ? `Класс ${payload.indicatorClass}` : "Класс 5";
	lines.push(`TEXT 15,128,"1",0,1,1,"Индикатор: ${indClass} [СТЕРИЛЬНО]"`);

	// 6. Operator
	lines.push(`TEXT 15,150,"1",0,1,1,"Оператор: ${escapeTsplString(payload.operatorName)}"`);

	// 7. Optional contents description
	if (payload.contentsDescription) {
		lines.push(`TEXT 15,172,"1",0,1,1,"Влож: ${escapeTsplString(payload.contentsDescription)}"`);
	}

	// 8. 2D DataMatrix Barcode (Right side of label)
	// DMATRIX x, y, width, height, [c, a, x], "content"
	// Sized for 203 DPI print head (8 dots/mm): 50mm = 400 dots.
	// Placement at x=270, y=36, size 110x110
	lines.push(`DMATRIX 270,36,110,110,"${escapeTsplString(payload.dataMatrixCode)}"`);

	// 9. Print command
	lines.push(`PRINT ${copies},1`);
	lines.push("");

	const tsplScript = lines.join("\r\n");

	if (encoding === "cp1251") {
		return encodeCp1251(tsplScript);
	}
	return new TextEncoder().encode(tsplScript);
}

// ============================================================================
// 3. ZPL II LABEL GENERATOR
// ============================================================================

export interface ZplGenerationOptions {
	/** Dots per mm: 8 for 203 DPI (default), 12 for 300 DPI */
	readonly dotsPerMm?: number | undefined;
	/** Number of copies to print (default: 1) */
	readonly copies?: number | undefined;
}

/**
 * Builds ZPL II command string for SanPiN 3.3686-21 dental autoclave pouch label.
 */
export function buildZplAutoclavePouchLabelString(
	payload: AutoclavePouchLabelPayload,
	options: ZplGenerationOptions = {},
): string {
	const dpmm = options.dotsPerMm ?? 8; // 203 DPI default
	const widthMm = payload.labelWidthMm ?? 50;
	const heightMm = payload.labelHeightMm ?? 30;
	const printWidthDots = Math.round(widthMm * dpmm);
	const labelLengthDots = Math.round(heightMm * dpmm);
	const copies = options.copies ?? 1;

	const indClass = payload.indicatorClass ? `Класс ${payload.indicatorClass}` : "Класс 5";
	const autoclave = payload.autoclaveModel || "Автоклав B-класс";
	const program = payload.program || "134°C / 2.1 bar";

	const zpl = [
		"^XA",
		`^PW${printWidthDots}`,
		`^LL${labelLengthDots}`,
		"^PON",
		"^LH0,0",
		// Enable UTF-8 encoding in ZPL II
		"^CI28",
		// 1. Header
		"^FO15,12^A0N,22,22^FD DENTE СТЕРИЛИЗАЦИЯ (СанПиН)^FS",
		// 2. Batch & Cycle
		`^FO15,40^A0N,18,18^FD Партия: ${payload.batchNumber}  Ц:${payload.cycleNumber}^FS`,
		// 3. Sterilization & Expiry
		`^FO15,64^A0N,16,16^FD Стерил: ${payload.sterilizationDate}^FS`,
		`^FO15,86^A0N,16,16^FD Годен до: ${payload.expiryDate}^FS`,
		// 4. Autoclave & Indicator
		`^FO15,108^A0N,15,15^FD ${autoclave} (${program})^FS`,
		`^FO15,128^A0N,15,15^FD Индикатор: ${indClass} [СТЕРИЛЬНО]^FS`,
		// 5. Operator
		`^FO15,148^A0N,15,15^FD Оператор: ${payload.operatorName}^FS`,
		// 6. Contents if provided
		payload.contentsDescription
			? `^FO15,168^A0N,14,14^FD Влож: ${payload.contentsDescription}^FS`
			: "",
		// 7. 2D DataMatrix barcode (^BXN, height, quality, columns, rows, format)
		`^FO275,38^BXN,5,200^FD${payload.dataMatrixCode}^FS`,
		// 8. Quantity
		`^PQ${copies},0,1,Y`,
		"^XZ",
	]
		.filter((line) => line.length > 0)
		.join("\r\n");

	return zpl;
}

/**
 * Builds ZPL II byte array encoded in UTF-8.
 */
export function buildZplAutoclavePouchLabelBuffer(
	payload: AutoclavePouchLabelPayload,
	options: ZplGenerationOptions = {},
): Uint8Array {
	const zpl = buildZplAutoclavePouchLabelString(payload, options);
	return new TextEncoder().encode(zpl);
}

// ============================================================================
// 4. UNIFIED LABEL GENERATOR BY EMULATION
// ============================================================================

/**
 * Generates label printer buffer based on requested emulation ('tspl' or 'zpl').
 */
export function generateAutoclavePouchLabelBuffer(
	payload: AutoclavePouchLabelPayload,
	emulation: LabelPrinterEmulation = "tspl",
): Uint8Array {
	if (emulation === "zpl") {
		return buildZplAutoclavePouchLabelBuffer(payload);
	}
	return buildTsplAutoclavePouchLabel(payload);
}

// ============================================================================
// 5. HARDWARE TEST LABELS
// ============================================================================

/**
 * Builds a sample autoclave pouch label payload for test printing.
 */
export function createSampleAutoclavePouchLabelPayload(
	overrides: Partial<AutoclavePouchLabelPayload> = {},
): AutoclavePouchLabelPayload {
	const today = new Date();
	const expDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

	const formatDate = (d: Date) =>
		`${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;

	return {
		batchNumber: "B2026-09-28-01",
		cycleNumber: 1,
		sterilizationDate: `${formatDate(today)} 14:00`,
		expiryDate: `${formatDate(expDate)} (30 сут)`,
		operatorName: "Смирнова Е.А.",
		autoclaveModel: "Melag Vacuklav 23B+",
		program: "134°C / 2.1 bar / 5 мин",
		indicatorClass: 5,
		contentsDescription: "Базовый набор стоматолога (зонд, пинцет, зеркало)",
		dataMatrixCode: "DENTE:SANPIN:B=B2026-09-28-01;C=1;OP=Smirnova;IND=5;PASS=1",
		labelWidthMm: 50,
		labelHeightMm: 30,
		...overrides,
	};
}

function escapeTsplString(str: string): string {
	return str.replace(/"/g, '\\"');
}
