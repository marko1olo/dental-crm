/**
 * @dental/shared/hardware/escpos — Layer 2: ESC/POS Byte Commands, CP866 Encoder & Buffer Builder
 *
 * Implements low-level ESC/POS byte sequence generation, Russian CP866 encoding,
 * hardware status interrogation, and the fluent EscPosBufferBuilder stream constructor.
 */

import { buildEscPosBarcode128Buffer, buildEscPosQrCodeBuffer } from "./barcodeQrEncoder.js";
import type { EscPosBarcode128Options, EscPosQrOptions, EscPosTableColumn } from "./types.js";

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
// 2. RUSSIAN CODE PAGE 866 (CP866) ENCODER & DECODER
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
// 3. FLUENT ESC/POS BUFFER BUILDER
// ============================================================================

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
// 4. REAL-TIME ESC/POS STATUS COMMANDS & PARSER
// ============================================================================

export const ESC_POS_STATUS_COMMANDS = {
	/** DLE EOT 1: Transmit printer status */
	QUERY_PRINTER_STATUS: new Uint8Array([0x10, 0x04, 0x01]),
	/** DLE EOT 2: Transmit offline status */
	QUERY_OFFLINE_STATUS: new Uint8Array([0x10, 0x04, 0x02]),
	/** DLE EOT 3: Transmit error status */
	QUERY_ERROR_STATUS: new Uint8Array([0x10, 0x04, 0x03]),
	/** DLE EOT 4: Transmit roll paper sensor status */
	QUERY_PAPER_STATUS: new Uint8Array([0x10, 0x04, 0x04]),
} as const;

/**
 * Parses real-time ESC/POS DLE EOT response byte into normalized PrinterStatusReport.
 */
export function parseEscPosStatusByte(
	statusType: 1 | 2 | 3 | 4,
	byte: number,
): {
	online: boolean;
	paperPresent: boolean;
	coverClosed: boolean;
	hasError: boolean;
	status: "online" | "offline" | "paper_out" | "cover_open" | "error";
	errorMessage?: string | undefined;
} {
	if (statusType === 1) {
		// Printer status: Bit 3: 0 = Online, 1 = Offline
		const isOffline = (byte & 0x08) !== 0;
		return {
			online: !isOffline,
			paperPresent: true,
			coverClosed: true,
			hasError: isOffline,
			status: isOffline ? "offline" : "online",
			errorMessage: isOffline ? "Принтер переведен в автономный режим (Offline)" : undefined,
		};
	}

	if (statusType === 2) {
		// Offline status: Bit 2 = Cover open (0x04), Bit 5 = Out of paper (0x20), Bit 6 = Error (0x40)
		const coverOpen = (byte & 0x04) !== 0;
		const paperOut = (byte & 0x20) !== 0;
		const errorOccurred = (byte & 0x40) !== 0;

		let status: "online" | "offline" | "paper_out" | "cover_open" | "error" = "online";
		let msg: string | undefined;

		if (coverOpen) {
			status = "cover_open";
			msg = "Крышка принтера открыта";
		} else if (paperOut) {
			status = "paper_out";
			msg = "Закончилась термолента";
		} else if (errorOccurred) {
			status = "error";
			msg = "Аппаратная ошибка механизма принтера";
		}

		return {
			online: !coverOpen && !paperOut && !errorOccurred,
			paperPresent: !paperOut,
			coverClosed: !coverOpen,
			hasError: errorOccurred,
			status,
			errorMessage: msg,
		};
	}

	if (statusType === 3) {
		// Error status: Bit 2 = Mechanical error, Bit 3 = Cutter error, Bit 5 = Unrecoverable error
		const cutterError = (byte & 0x08) !== 0;
		const mechError = (byte & 0x04) !== 0;
		const unrecoverable = (byte & 0x20) !== 0;
		const hasErr = cutterError || mechError || unrecoverable;

		return {
			online: !hasErr,
			paperPresent: true,
			coverClosed: true,
			hasError: hasErr,
			status: hasErr ? "error" : "online",
			errorMessage: cutterError
				? "Замятие или ошибка ножа автоотрезчика"
				: mechError
					? "Механическая ошибка термоголовки"
					: unrecoverable
						? "Критическая неисправимая ошибка принтера"
						: undefined,
		};
	}

	// statusType === 4: Paper sensor status
	// Bit 2, 3 = Paper near end (0x0C)
	// Bit 5, 6 = Paper empty (0x60)
	const paperEmpty = (byte & 0x60) !== 0;
	const paperNearEnd = (byte & 0x0c) !== 0;

	return {
		online: !paperEmpty,
		paperPresent: !paperEmpty,
		coverClosed: true,
		hasError: paperEmpty,
		status: paperEmpty ? "paper_out" : "online",
		errorMessage: paperEmpty
			? "Бумага отсутствует (датчик рулона)"
			: paperNearEnd
				? "Термолента заканчивается (рулон почти пуст)"
				: undefined,
	};
}
