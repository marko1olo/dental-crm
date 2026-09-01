/**
 * @dental/shared/hardware — ESC/POS Binary Buffer Generator & Russian CP866 Engine
 *
 * Implements standard ESC/POS command sequences and Russian Code Page 866 (CP866)
 * binary encoding for thermal receipt/ticket printers (АТОЛ, Штрих-М, Xprinter, Rongta,
 * POS-58, POS-80, Epson, Citizen, Star) over Bluetooth LE, SPP, USB, and LAN TCP.
 *
 * Capabilities:
 * 1. Russian CP866 Cyrillic character table encoding (А-я, Ё, ё, №, ₽, formatting symbols).
 * 2. ESC/POS Command sequences: Align, Bold, Underline, Invert, Double Height/Width, Feed, Cut, Buzzer, Drawer Pulse.
 * 3. 2D QR Code Generation (Model 2, Error Correction L/M/Q/H, sizes 1..16) for 54-FZ FNS validation & patient check-in.
 * 4. 1D Barcode Generation: Code 128, EAN-13, EAN-8.
 * 5. Pre-built templates for 54-FZ Fiscal Receipts and Doctor Appointment / Queue Tickets.
 */

// ============================================================================
// 1. ESC/POS COMMAND CONSTANTS
// ============================================================================

export const ESC_POS_COMMANDS = {
	/** Initialize printer (ESC @) */
	INIT: new Uint8Array([0x1b, 0x40]),
	/** Select Code Page CP866 (ESC t 17) */
	SELECT_CODEPAGE_CP866: new Uint8Array([0x1b, 0x74, 0x11]),
	/** Select Code Page WPC1251 (ESC t 73) */
	SELECT_CODEPAGE_CP1251: new Uint8Array([0x1b, 0x74, 0x49]),
	/** Text Alignment (ESC a n: 0=Left, 1=Center, 2=Right) */
	ALIGN_LEFT: new Uint8Array([0x1b, 0x61, 0x00]),
	ALIGN_CENTER: new Uint8Array([0x1b, 0x61, 0x01]),
	ALIGN_RIGHT: new Uint8Array([0x1b, 0x61, 0x02]),
	/** Bold / Emphasized (ESC E n: 1=ON, 0=OFF) */
	BOLD_ON: new Uint8Array([0x1b, 0x45, 0x01]),
	BOLD_OFF: new Uint8Array([0x1b, 0x45, 0x00]),
	/** Double Strike (ESC G n: 1=ON, 0=OFF) */
	DOUBLE_STRIKE_ON: new Uint8Array([0x1b, 0x47, 0x01]),
	DOUBLE_STRIKE_OFF: new Uint8Array([0x1b, 0x47, 0x00]),
	/** Underline (ESC - n: 0=OFF, 1=1-dot, 2=2-dot) */
	UNDERLINE_OFF: new Uint8Array([0x1b, 0x2d, 0x00]),
	UNDERLINE_1DOT: new Uint8Array([0x1b, 0x2d, 0x01]),
	UNDERLINE_2DOT: new Uint8Array([0x1b, 0x2d, 0x02]),
	/** Inverted White-on-Black (GS B n: 1=ON, 0=OFF) */
	INVERT_ON: new Uint8Array([0x1d, 0x42, 0x01]),
	INVERT_OFF: new Uint8Array([0x1d, 0x42, 0x00]),
	/** Character Size / Scale (GS ! n: high nibble=width, low nibble=height) */
	SIZE_NORMAL: new Uint8Array([0x1d, 0x21, 0x00]),
	SIZE_DOUBLE_HEIGHT: new Uint8Array([0x1d, 0x21, 0x01]),
	SIZE_DOUBLE_WIDTH: new Uint8Array([0x1d, 0x21, 0x10]),
	SIZE_DOUBLE_BOTH: new Uint8Array([0x1d, 0x21, 0x11]),
	SIZE_TRIPLE_BOTH: new Uint8Array([0x1d, 0x21, 0x22]),
	SIZE_QUAD_BOTH: new Uint8Array([0x1d, 0x21, 0x33]),
	/** Line Spacing */
	LINE_SPACING_DEFAULT: new Uint8Array([0x1b, 0x32]),
	/** Paper Cut (GS V m: 0=Full cut, 1=Partial cut, 66 n=Feed n and cut) */
	CUT_FULL: new Uint8Array([0x1d, 0x56, 0x00]),
	CUT_PARTIAL: new Uint8Array([0x1d, 0x56, 0x01]),
	/** Cash Drawer Pulse (ESC p m t1 t2: m=pin0/pin1, t1=on*2ms, t2=off*2ms) */
	DRAWER_PULSE_PIN2: new Uint8Array([0x1b, 0x70, 0x00, 0x32, 0x32]),
	DRAWER_PULSE_PIN5: new Uint8Array([0x1b, 0x70, 0x01, 0x32, 0x32]),
	/** Printer Beep / Buzzer (ESC B n t: n=beeps, t=time*50ms) */
	BUZZER_SHORT: new Uint8Array([0x1b, 0x42, 0x02, 0x02]),
	BUZZER_WARNING: new Uint8Array([0x1b, 0x42, 0x04, 0x03]),
} as const;

// ============================================================================
// 2. RUSSIAN CODE PAGE 866 (CP866) ENCODER
// ============================================================================

/**
 * Encodes a Unicode string into Russian DOS Code Page 866 (CP866) byte array.
 * Standard character mapping:
 * - ASCII: 0x00..0x7F -> same byte
 * - Cyrillic 'А'..'п' (U+0410..U+043F): 0x80..0xAF (64 chars)
 * - Cyrillic 'р'..'я' (U+0440..U+044F): 0xE0..0xEF (16 chars)
 * - Cyrillic 'Ё' (U+0401): 0xF0
 * - Cyrillic 'ё' (U+0451): 0xF1
 * - Number sign '№' (U+2116): 0xFC
 * - Ruble currency sign '₽' (U+20BD): 0xEC (or fallback to 'р')
 * - Dashes (U+2013, U+2014): 0x2D ('-')
 * - Quotes (U+00AB, U+00BB, U+201C, U+201D, U+201E): 0x22 ('"')
 * - Degree '°' (U+00B0): 0xF8
 * - Multiplication '×' (U+00D7): 0x78 ('x')
 */
export function encodeCp866(text: string): Uint8Array {
	if (!text || typeof text !== "string") {
		return new Uint8Array(0);
	}

	const bytes: number[] = [];
	for (let i = 0; i < text.length; i++) {
		const code = text.charCodeAt(i);

		if (code <= 0x7f) {
			// Standard ASCII (0x00..0x7F)
			bytes.push(code);
		} else if (code >= 0x0410 && code <= 0x043f) {
			// Russian capital 'А'..'Я' and small 'а'..'п' -> CP866 0x80..0xAF
			bytes.push(code - 0x0410 + 0x80);
		} else if (code >= 0x0440 && code <= 0x044f) {
			// Russian small 'р'..'я' -> CP866 0xE0..0xEF
			bytes.push(code - 0x0440 + 0xe0);
		} else if (code === 0x0401) {
			// 'Ё' -> CP866 0xF0
			bytes.push(0xf0);
		} else if (code === 0x0451) {
			// 'ё' -> CP866 0xF1
			bytes.push(0xf1);
		} else if (code === 0x2116) {
			// '№' -> CP866 0xFC
			bytes.push(0xfc);
		} else if (code === 0x00b0) {
			// '°' (Degree sign) -> CP866 0xF8
			bytes.push(0xf8);
		} else if (code === 0x20bd) {
			// Ruble currency sign '₽' (U+20BD) -> Russian small 'р' (0xE0 in CP866)
			bytes.push(0xe0);
		} else if (code === 0x2014 || code === 0x2013 || code === 0x2212) {
			// Em-dash / En-dash / Minus -> '-' (0x2D)
			bytes.push(0x2d);
		} else if (
			code === 0x00ab ||
			code === 0x00bb ||
			code === 0x201c ||
			code === 0x201d ||
			code === 0x201e
		) {
			// Quotes « » “ ” „ -> '"' (0x22)
			bytes.push(0x22);
		} else if (code === 0x00d7) {
			// Multiplication '×' -> 'x' (0x78)
			bytes.push(0x78);
		} else if (code === 0x2026) {
			// Ellipsis '…' -> '...'
			bytes.push(0x2e, 0x2e, 0x2e);
		} else {
			// Unknown character -> '?' (0x3F)
			bytes.push(0x3f);
		}
	}

	return new Uint8Array(bytes);
}

/**
 * Decodes a Russian CP866 byte array back to Unicode string.
 */
export function decodeCp866(bytes: Uint8Array | number[]): string {
	let result = "";
	for (let i = 0; i < bytes.length; i++) {
		const byte = bytes[i]!;
		if (byte <= 0x7f) {
			result += String.fromCharCode(byte);
		} else if (byte >= 0x80 && byte <= 0xaf) {
			result += String.fromCharCode(byte - 0x80 + 0x0410);
		} else if (byte >= 0xe0 && byte <= 0xef) {
			result += String.fromCharCode(byte - 0xe0 + 0x0440);
		} else if (byte === 0xf0) {
			result += "Ё";
		} else if (byte === 0xf1) {
			result += "ё";
		} else if (byte === 0xfc) {
			result += "№";
		} else if (byte === 0xf8) {
			result += "°";
		} else {
			result += "?";
		}
	}
	return result;
}

// ============================================================================
// 3. ESC/POS 2D QR-CODE & 1D BARCODE GENERATORS
// ============================================================================

export type EscPosQrErrorCorrection = "L" | "M" | "Q" | "H";

export interface EscPosQrOptions {
	/** Module size (dot size) 1..16 (default: 4 for 58mm, 5 for 80mm) */
	readonly moduleSize?: number | undefined;
	/** Error correction level L (7%), M (15%), Q (25%), H (30%) (default: 'M') */
	readonly errorCorrection?: EscPosQrErrorCorrection | undefined;
	/** Center align before printing QR */
	readonly centerAlign?: boolean | undefined;
}

/**
 * Generates ESC/POS standard Model 2 QR-code command stream (GS ( k).
 */
export function buildEscPosQrCodeBuffer(
	payload: string,
	options: EscPosQrOptions = {},
): Uint8Array {
	const moduleSize = Math.max(1, Math.min(16, options.moduleSize ?? 4));
	const ecLevel = options.errorCorrection ?? "M";
	const ecByte =
		ecLevel === "L" ? 0x30 : ecLevel === "M" ? 0x31 : ecLevel === "Q" ? 0x32 : 0x33;

	const qrData = new TextEncoder().encode(payload);
	const dataLen = qrData.length + 3;
	const pL = dataLen & 0xff;
	const pH = (dataLen >> 8) & 0xff;

	const bytes: number[] = [];

	if (options.centerAlign) {
		bytes.push(0x1b, 0x61, 0x01); // Center align
	}

	// 1. Function 165: Select QR Model 2 (GS ( k 0x04 0x00 0x31 0x41 0x32 0x00)
	bytes.push(0x1d, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00);

	// 2. Function 167: Set QR Module Size (GS ( k 0x03 0x00 0x31 0x43 n)
	bytes.push(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, moduleSize);

	// 3. Function 169: Set Error Correction Level (GS ( k 0x03 0x00 0x31 0x45 n)
	bytes.push(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, ecByte);

	// 4. Function 180: Store QR Data in Symbol Storage Area (GS ( k pL pH 0x31 0x50 0x30 d1..dk)
	bytes.push(0x1d, 0x28, 0x6b, pL, pH, 0x31, 0x50, 0x30);
	for (let i = 0; i < qrData.length; i++) {
		bytes.push(qrData[i]!);
	}

	// 5. Function 181: Print the QR Symbol (GS ( k 0x03 0x00 0x31 0x51 0x30)
	bytes.push(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30);

	return new Uint8Array(bytes);
}

export interface EscPosBarcode128Options {
	/** Barcode height in dots 1..255 (default: 64) */
	readonly heightDots?: number | undefined;
	/** Module width 2..6 (default: 2) */
	readonly moduleWidth?: number | undefined;
	/** HRI Human Readable text position: 0=none, 1=above, 2=below, 3=both (default: 2) */
	readonly hriPosition?: 0 | 1 | 2 | 3 | undefined;
	/** Center align before printing barcode */
	readonly centerAlign?: boolean | undefined;
}

/**
 * Generates ESC/POS Code 128 barcode command stream (GS k 73).
 */
export function buildEscPosBarcode128Buffer(
	code: string,
	options: EscPosBarcode128Options = {},
): Uint8Array {
	const height = Math.max(1, Math.min(255, options.heightDots ?? 64));
	const width = Math.max(2, Math.min(6, options.moduleWidth ?? 2));
	const hri = options.hriPosition ?? 2;

	const bytes: number[] = [];

	if (options.centerAlign) {
		bytes.push(0x1b, 0x61, 0x01);
	}

	// Set barcode height (GS h n)
	bytes.push(0x1d, 0x68, height);
	// Set barcode module width (GS w n)
	bytes.push(0x1d, 0x77, width);
	// Set HRI text position (GS H n)
	bytes.push(0x1d, 0x48, hri);

	// Code 128 command (GS k 73 len bytes)
	// Prefix with Code Set B: {B (0x7B, 0x42)
	const codeSetB = "{B";
	const fullPayload = `${codeSetB}${code}`;
	const rawPayload = new TextEncoder().encode(fullPayload);

	bytes.push(0x1d, 0x6b, 0x49, rawPayload.length);
	for (let i = 0; i < rawPayload.length; i++) {
		bytes.push(rawPayload[i]!);
	}

	return new Uint8Array(bytes);
}

// ============================================================================
// 4. FLUENT ESC/POS BUFFER BUILDER
// ============================================================================

export interface EscPosTableColumn {
	readonly text: string;
	readonly width: number;
	readonly align?: "left" | "center" | "right" | undefined;
}

export class EscPosBufferBuilder {
	private readonly buffer: number[] = [];
	private paperWidthChars: number;

	constructor(paperWidthMm: 58 | 80 = 58) {
		this.paperWidthChars = paperWidthMm === 80 ? 48 : 32;
	}

	/** Appends raw byte array */
	public appendBytes(bytes: Uint8Array | number[]): this {
		for (let i = 0; i < bytes.length; i++) {
			this.buffer.push(bytes[i]!);
		}
		return this;
	}

	/** Initializes printer and sets CP866 code page */
	public init(): this {
		this.appendBytes(ESC_POS_COMMANDS.INIT);
		this.appendBytes(ESC_POS_COMMANDS.SELECT_CODEPAGE_CP866);
		return this;
	}

	/** Sets text alignment (left, center, right) */
	public align(mode: "left" | "center" | "right"): this {
		if (mode === "center") {
			this.appendBytes(ESC_POS_COMMANDS.ALIGN_CENTER);
		} else if (mode === "right") {
			this.appendBytes(ESC_POS_COMMANDS.ALIGN_RIGHT);
		} else {
			this.appendBytes(ESC_POS_COMMANDS.ALIGN_LEFT);
		}
		return this;
	}

	/** Sets bold/emphasized mode */
	public bold(enable = true): this {
		this.appendBytes(enable ? ESC_POS_COMMANDS.BOLD_ON : ESC_POS_COMMANDS.BOLD_OFF);
		return this;
	}

	/** Sets double height mode */
	public doubleHeight(enable = true): this {
		this.appendBytes(enable ? ESC_POS_COMMANDS.SIZE_DOUBLE_HEIGHT : ESC_POS_COMMANDS.SIZE_NORMAL);
		return this;
	}

	/** Sets double width mode */
	public doubleWidth(enable = true): this {
		this.appendBytes(enable ? ESC_POS_COMMANDS.SIZE_DOUBLE_WIDTH : ESC_POS_COMMANDS.SIZE_NORMAL);
		return this;
	}

	/** Sets double height and width (title header) */
	public doubleBoth(enable = true): this {
		this.appendBytes(enable ? ESC_POS_COMMANDS.SIZE_DOUBLE_BOTH : ESC_POS_COMMANDS.SIZE_NORMAL);
		return this;
	}

	/** Sets underline mode */
	public underline(mode: 0 | 1 | 2 = 1): this {
		if (mode === 2) {
			this.appendBytes(ESC_POS_COMMANDS.UNDERLINE_2DOT);
		} else if (mode === 1) {
			this.appendBytes(ESC_POS_COMMANDS.UNDERLINE_1DOT);
		} else {
			this.appendBytes(ESC_POS_COMMANDS.UNDERLINE_OFF);
		}
		return this;
	}

	/** Sets white-on-black inverted print mode */
	public invert(enable = true): this {
		this.appendBytes(enable ? ESC_POS_COMMANDS.INVERT_ON : ESC_POS_COMMANDS.INVERT_OFF);
		return this;
	}

	/** Appends CP866 encoded text without newline */
	public text(content: string): this {
		this.appendBytes(encodeCp866(content));
		return this;
	}

	/** Appends CP866 encoded text with newline (LF 0x0A) */
	public line(content = ""): this {
		this.text(`${content}\n`);
		return this;
	}

	/** Appends dashed or solid separator line across full width */
	public separator(char = "-"): this {
		const lineStr = char.repeat(this.paperWidthChars);
		return this.line(lineStr);
	}

	/** Appends double column formatted line (e.g. Left title ........... Right price) */
	public twoColumns(leftText: string, rightText: string, padChar = " "): this {
		const totalWidth = this.paperWidthChars;
		const leftLen = leftText.length;
		const rightLen = rightText.length;

		if (leftLen + rightLen >= totalWidth) {
			// Truncate or wrap left side
			const availableLeft = Math.max(8, totalWidth - rightLen - 1);
			const truncatedLeft = leftText.slice(0, availableLeft);
			const padding = " ".repeat(Math.max(1, totalWidth - truncatedLeft.length - rightLen));
			return this.line(`${truncatedLeft}${padding}${rightText}`);
		}

		const padCount = Math.max(1, totalWidth - leftLen - rightLen);
		const padStr = padChar.repeat(padCount);
		return this.line(`${leftText}${padStr}${rightText}`);
	}

	/** Appends multi-column formatted table row */
	public tableRow(columns: EscPosTableColumn[]): this {
		let rowStr = "";
		for (const col of columns) {
			const text = col.text;
			const width = col.width;
			const align = col.align ?? "left";

			let formattedCol = "";
			if (text.length > width) {
				formattedCol = text.slice(0, width);
			} else {
				const diff = width - text.length;
				if (align === "right") {
					formattedCol = " ".repeat(diff) + text;
				} else if (align === "center") {
					const leftPad = Math.floor(diff / 2);
					const rightPad = diff - leftPad;
					formattedCol = " ".repeat(leftPad) + text + " ".repeat(rightPad);
				} else {
					formattedCol = text + " ".repeat(diff);
				}
			}
			rowStr += formattedCol;
		}
		return this.line(rowStr);
	}

	/** Appends 2D QR Code */
	public qrCode(payload: string, options: EscPosQrOptions = {}): this {
		this.appendBytes(buildEscPosQrCodeBuffer(payload, options));
		return this;
	}

	/** Appends 1D Barcode 128 */
	public barcode128(code: string, options: EscPosBarcode128Options = {}): this {
		this.appendBytes(buildEscPosBarcode128Buffer(code, options));
		return this;
	}

	/** Feeds N lines (ESC d n) */
	public feed(lines = 3): this {
		const count = Math.max(1, Math.min(255, lines));
		this.appendBytes([0x1b, 0x64, count]);
		return this;
	}

	/** Cuts paper (partial or full) */
	public cut(partial = true): this {
		this.appendBytes(partial ? ESC_POS_COMMANDS.CUT_PARTIAL : ESC_POS_COMMANDS.CUT_FULL);
		return this;
	}

	/** Kicks cash drawer */
	public pulseDrawer(): this {
		this.appendBytes(ESC_POS_COMMANDS.DRAWER_PULSE_PIN2);
		return this;
	}

	/** Sounds printer buzzer */
	public buzzer(warning = false): this {
		this.appendBytes(warning ? ESC_POS_COMMANDS.BUZZER_WARNING : ESC_POS_COMMANDS.BUZZER_SHORT);
		return this;
	}

	/** Returns final binary byte array */
	public build(): Uint8Array {
		return new Uint8Array(this.buffer);
	}
}

// ============================================================================
// 5. STANDARD CLINICAL & FISCAL RECEIPT TEMPLATES
// ============================================================================

export interface EscPosFiscalReceiptItem {
	readonly name: string;
	readonly priceRub: number;
	readonly quantity: number;
	readonly amountRub: number;
	readonly medicalServiceCode804n?: string | undefined;
	readonly markingCode?: string | undefined;
}

export interface EscPosFiscalReceiptPayload {
	readonly clinicName?: string | undefined;
	readonly clinicAddress?: string | undefined;
	readonly inn?: string | undefined;
	readonly kpp?: string | undefined;
	readonly licenseNumber?: string | undefined;
	readonly cashierFullName: string;
	readonly cashierInn?: string | undefined;
	readonly customerContact?: string | undefined;
	readonly operationType?: "income" | "income_return" | undefined;
	readonly items: readonly EscPosFiscalReceiptItem[];
	readonly totalRub: number;
	readonly cashRub?: number | undefined;
	readonly electronicRub?: number | undefined;
	readonly sbpRub?: number | undefined;
	readonly prepaidRub?: number | undefined;
	readonly fnSerial?: string | undefined;
	readonly fiscalDocNum?: string | undefined;
	readonly fiscalSign?: string | undefined;
	readonly fnsQrString?: string | undefined;
	readonly paperWidthMm?: 58 | 80 | undefined;
	readonly autoCut?: boolean | undefined;
	readonly timestamp?: Date | string | undefined;
}

/**
 * Builds standard 54-FZ compliant thermal receipt binary buffer with CP866 encoding.
 */
export function buildEscPosFiscalReceiptBuffer(
	payload: EscPosFiscalReceiptPayload,
): Uint8Array {
	const paperWidth = payload.paperWidthMm ?? 58;
	const builder = new EscPosBufferBuilder(paperWidth);

	builder.init();

	// 1. Clinic Header
	builder.align("center");
	builder.doubleBoth(true);
	builder.line(payload.clinicName || "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»");
	builder.doubleBoth(false);

	builder.line(payload.clinicAddress || "г. Москва, Ломоносовский пр-т, 24");
	builder.line(`ИНН: ${payload.inn || "7701234567"} КПП: ${payload.kpp || "770101001"}`);
	builder.line(`Лицензия: № ${payload.licenseNumber || "ЛО41-01137-77/00368421"}`);
	builder.separator("-");

	// 2. Receipt Operation Title
	builder.bold(true);
	if (payload.operationType === "income_return") {
		builder.line("КАССОВЫЙ ЧЕК / ВОЗВРАТ ПРИХОДА");
	} else {
		builder.line("КАССОВЫЙ ЧЕК / ПРИХОД (54-ФЗ)");
	}
	builder.bold(false);

	const dateObj =
		payload.timestamp instanceof Date
			? payload.timestamp
			: typeof payload.timestamp === "string"
				? new Date(payload.timestamp)
				: new Date();
	const dateFormatted = `${dateObj.toLocaleDateString("ru-RU")} ${dateObj.toLocaleTimeString("ru-RU")}`;

	builder.align("left");
	builder.line(`Дата: ${dateFormatted}`);
	builder.line(`Кассир: ${payload.cashierFullName}`);
	if (payload.cashierInn) {
		builder.line(`ИНН кассира: ${payload.cashierInn}`);
	}
	if (payload.customerContact) {
		builder.line(`Покупатель: ${payload.customerContact}`);
	}
	builder.separator("-");

	// 3. Line Items
	payload.items.forEach((item, idx) => {
		builder.bold(true);
		builder.line(`${idx + 1}. ${item.name}`);
		builder.bold(false);

		if (item.medicalServiceCode804n) {
			builder.line(`   Код 804н: ${item.medicalServiceCode804n}`);
		}
		if (item.markingCode) {
			builder.line(`   [М] DataMatrix: ${item.markingCode.slice(0, 16)}...`);
		}

		const qtyStr = `${item.quantity} шт. x ${item.priceRub.toFixed(2)}`;
		const totalStr = `${item.amountRub.toFixed(2)} ₽`;
		builder.twoColumns(`   ${qtyStr}`, totalStr);
	});

	builder.separator("-");

	// 4. Totals & Payment Methods
	builder.align("right");
	builder.doubleBoth(true);
	builder.line(`ИТОГ: ${payload.totalRub.toFixed(2)} ₽`);
	builder.doubleBoth(false);

	builder.align("left");
	if (payload.electronicRub && payload.electronicRub > 0) {
		builder.twoColumns("БЕЗНАЛИЧНЫМИ (КАРТА):", `${payload.electronicRub.toFixed(2)} ₽`);
	}
	if (payload.cashRub && payload.cashRub > 0) {
		builder.twoColumns("НАЛИЧНЫМИ:", `${payload.cashRub.toFixed(2)} ₽`);
	}
	if (payload.sbpRub && payload.sbpRub > 0) {
		builder.twoColumns("СБП QR (0.7%):", `${payload.sbpRub.toFixed(2)} ₽`);
	}
	if (payload.prepaidRub && payload.prepaidRub > 0) {
		builder.twoColumns("ПРЕДОПЛАТА (ДЕПОЗИТ):", `${payload.prepaidRub.toFixed(2)} ₽`);
	}

	builder.twoColumns("СНО: УСН Доходы", "Без НДС (0%)");
	builder.separator("-");

	// 5. Fiscal Attributes & FNS QR Code
	const fn = payload.fnSerial || "9960440302145896";
	const fd = payload.fiscalDocNum || "10042";
	const fpd = payload.fiscalSign || "1234567890";

	builder.line(`ФН: ${fn}`);
	builder.line(`ФД: ${fd}   ФПД: ${fpd}`);
	builder.line("Сайт ФНС: www.nalog.gov.ru");

	const qrStr =
		payload.fnsQrString ||
		`t=${dateObj.toISOString().slice(0, 19).replace(/[-:T]/g, "")}&s=${payload.totalRub.toFixed(2)}&fn=${fn}&i=${fd}&fp=${fpd}&n=${payload.operationType === "income_return" ? "2" : "1"}`;

	builder.feed(1);
	builder.align("center");
	builder.qrCode(qrStr, { moduleSize: paperWidth === 80 ? 5 : 4, centerAlign: true });
	builder.feed(1);

	builder.line("Спасибо за доверие!");
	builder.line("Здоровья вашим зубам!");

	// 6. Paper Feed & Cut
	builder.feed(4);
	if (payload.autoCut !== false) {
		builder.cut(true);
	}

	return builder.build();
}

export interface EscPosAppointmentTicketPayload {
	readonly clinicName?: string | undefined;
	readonly ticketNumber: string;
	readonly patientFullName: string;
	readonly doctorFullName: string;
	readonly doctorSpecialtyRu?: string | undefined;
	readonly cabinetName: string;
	readonly appointmentDateRu: string;
	readonly appointmentTimeRu: string;
	readonly toothCodes?: readonly string[] | undefined;
	readonly plannedProcedures?: readonly string[] | undefined;
	readonly checkInQrPayload?: string | undefined;
	readonly barcode128Value?: string | undefined;
	readonly note?: string | undefined;
	readonly paperWidthMm?: 58 | 80 | undefined;
	readonly autoCut?: boolean | undefined;
}

/**
 * Builds Doctor Appointment / Patient Queue Slip thermal ticket with CP866 encoding.
 * Used on iPad / Mobile terminals in dental operatory and reception.
 */
export function buildEscPosAppointmentTicketBuffer(
	payload: EscPosAppointmentTicketPayload,
): Uint8Array {
	const paperWidth = payload.paperWidthMm ?? 58;
	const builder = new EscPosBufferBuilder(paperWidth);

	builder.init();

	// 1. Clinic Header
	builder.align("center");
	builder.bold(true);
	builder.line(payload.clinicName || "DENTE СТОМАТОЛОГИЯ");
	builder.bold(false);
	builder.line("ТАЛОН ПРИЕМА / ПАМЯТКА");
	builder.separator("=");

	// 2. Large Ticket Number
	builder.align("center");
	builder.doubleBoth(true);
	builder.line(payload.ticketNumber);
	builder.doubleBoth(false);
	builder.separator("-");

	// 3. Appointment Details
	builder.align("left");
	builder.twoColumns("Кабинет:", payload.cabinetName);
	builder.twoColumns("Дата приема:", payload.appointmentDateRu);
	builder.twoColumns("Время приема:", payload.appointmentTimeRu);
	builder.separator("-");

	// 4. Doctor & Patient
	builder.bold(true);
	builder.line(`Врач: ${payload.doctorFullName}`);
	builder.bold(false);
	if (payload.doctorSpecialtyRu) {
		builder.line(`Специальность: ${payload.doctorSpecialtyRu}`);
	}
	builder.line(`Пациент: ${payload.patientFullName}`);

	if (payload.toothCodes && payload.toothCodes.length > 0) {
		builder.line(`Зубы (FDI): ${payload.toothCodes.join(", ")}`);
	}

	if (payload.plannedProcedures && payload.plannedProcedures.length > 0) {
		builder.separator("-");
		builder.bold(true);
		builder.line("Планируемые процедуры:");
		builder.bold(false);
		payload.plannedProcedures.forEach((proc, i) => {
			builder.line(`${i + 1}. ${proc}`);
		});
	}

	if (payload.note) {
		builder.separator("-");
		builder.line(`Примечание: ${payload.note}`);
	}

	// 5. Express Check-in 2D QR Code / 1D Barcode
	if (payload.checkInQrPayload) {
		builder.separator("-");
		builder.align("center");
		builder.line("QR-КОД ДЛЯ РЕГИСТРАЦИИ В КЛИНИКЕ:");
		builder.feed(1);
		builder.qrCode(payload.checkInQrPayload || "DENTE:CHECKIN", {
			moduleSize: paperWidth === 80 ? 5 : 4,
			centerAlign: true,
		});
		builder.feed(1);
	} else if (payload.barcode128Value) {
		builder.separator("-");
		builder.align("center");
		builder.barcode128(payload.barcode128Value, { centerAlign: true });
		builder.feed(1);
	}

	builder.align("center");
	builder.line("Пожалуйста, приходите за 10 мин до начала");
	builder.line("тел. клиники: +7 (495) 123-45-67");

	// 6. Paper Feed & Cut
	builder.feed(4);
	if (payload.autoCut !== false) {
		builder.cut(true);
	}

	return builder.build();
}
