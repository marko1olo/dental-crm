import { normalizeDate } from "@dental/shared";

const LONG_DICOM_VRS = new Set([
	"OB",
	"OD",
	"OF",
	"OL",
	"OV",
	"OW",
	"SQ",
	"UC",
	"UR",
	"UT",
	"UN",
]);

export const uncompressedLittleEndianTransferSyntaxes = new Set([
	"1.2.840.10008.1.2",
	"1.2.840.10008.1.2.1",
]);

export function cleanDicomText(value: Buffer): string | null {
	const text = value
		.toString("latin1")
		.replace(/\0/g, "")
		.replace(/\^/g, " ")
		.replace(/\s+/g, " ")
		.trim();
	return text || null;
}

export function normalizeDicomDate(value: string | null): string | null {
	if (!value) return null;
	const compact = value.match(/^(\d{4})(\d{2})(\d{2})$/);
	if (compact) return `${compact[1]}-${compact[2]}-${compact[3]}`;
	return normalizeDate(value);
}

export function formatDicomDateToIso(
	rawDate: string | null | undefined,
): string | null {
	if (!rawDate) return null;
	const digits = rawDate.replace(/\D/g, "");
	if (digits.length === 8) {
		const y = digits.slice(0, 4);
		const m = digits.slice(4, 6);
		const d = digits.slice(6, 8);
		const yearNum = Number.parseInt(y, 10);
		const monthNum = Number.parseInt(m, 10);
		const dayNum = Number.parseInt(d, 10);
		if (
			yearNum >= 1900 &&
			yearNum <= 2099 &&
			monthNum >= 1 &&
			monthNum <= 12 &&
			dayNum >= 1 &&
			dayNum <= 31
		) {
			return `${y}-${m}-${d}`;
		}
	}
	return null;
}

export function parseDicomUnsignedInt(valueBuffer: Buffer): number | null {
	const text = cleanDicomText(valueBuffer);
	if (text) {
		const parsedText = Number.parseInt(text, 10);
		if (Number.isInteger(parsedText) && parsedText > 0) return parsedText;
	}
	if (valueBuffer.length >= 2) {
		const parsedBinary = valueBuffer.readUInt16LE(0);
		if (parsedBinary > 0) return parsedBinary;
	}
	return null;
}

export function parseDicomInt(
	buf: Buffer,
	isBigEndian: boolean,
): number | null {
	const text = buf.toString("latin1").replace(/\0+$/g, "").trim();
	if (text) {
		const parsed = Number.parseInt(text, 10);
		if (Number.isInteger(parsed)) return parsed;
	}
	if (buf.length >= 2) {
		return isBigEndian ? buf.readUInt16BE(0) : buf.readUInt16LE(0);
	}
	return null;
}

export function readDicomUs(buffer: Buffer, bigEndian: boolean): number | null {
	if (buffer.length < 2) return null;
	return bigEndian ? buffer.readUInt16BE(0) : buffer.readUInt16LE(0);
}

export function readDicomDsNumber(buffer: Buffer): number | null {
	const text = cleanDicomText(buffer);
	if (!text) return null;
	const first = text.split("\\")[0]?.trim();
	if (!first) return null;
	const value = Number(first);
	return Number.isFinite(value) ? value : null;
}

export function readDicomDsFloatTrimmed(buf: Buffer): number | null {
	const text = buf.toString("latin1").replace(/\0+$/g, "").trim();
	if (!text) return null;
	const num = Number.parseFloat(text);
	return Number.isFinite(num) ? num : null;
}

export function parseDicomPixelSpacing(
	valueBuffer: Buffer,
): [number, number] | null {
	const text = cleanDicomText(valueBuffer);
	if (!text) return null;
	const parts = text.split(/[\\/]/).map((p) => Number.parseFloat(p.trim()));
	const p0 = parts[0];
	const p1 = parts[1];
	if (
		parts.length >= 2 &&
		p0 !== undefined &&
		p1 !== undefined &&
		Number.isFinite(p0) &&
		Number.isFinite(p1)
	) {
		return [p0, p1];
	}
	return null;
}

export function dicomTransferSyntaxIsSupported(
	transferSyntaxUid: string | null,
): boolean {
	if (!transferSyntaxUid) return true;
	return uncompressedLittleEndianTransferSyntaxes.has(transferSyntaxUid);
}

export interface DicomTagEntry {
	readonly tagKey: string;
	readonly valueOffset: number;
	readonly valueLength: number;
	readonly value: Buffer;
	readonly bigEndian: boolean;
	readonly explicitVr: boolean;
	readonly transferSyntaxUid: string | null;
}

export interface WalkDicomTagsOptions {
	readonly maxIterations: number;
	readonly onIndefiniteLength: "break_with_warning" | "skip_sequence";
	readonly onPixelData?: (event: {
		valueOffset: number;
		valueLength: number;
		indefinite: boolean;
		explicitVr: boolean;
		bigEndian: boolean;
		transferSyntaxUid: string | null;
	}) => void;
	readonly onTransferSyntax?: (event: {
		transferSyntaxUid: string | null;
		bigEndian: boolean;
		explicitVr: boolean;
	}) => void;
	readonly onIndefiniteWarning?: (tagKey: string) => void;
}

/**
 * Единый проходчик DICOM data elements (Explicit/Implicit VR, Little/Big Endian).
 */
export function walkDicomTags(
	buffer: Buffer,
	options: WalkDicomTagsOptions,
	onTag: (entry: DicomTagEntry) => void,
): { explicitVr: boolean; bigEndian: boolean; transferSyntaxUid: string | null } {
	let cursor =
		buffer.length >= 132 &&
		buffer.subarray(128, 132).toString("latin1") === "DICM"
			? 132
			: 0;
	let explicitVr = true;
	let bigEndian = false;
	let transferSyntaxUid: string | null = null;

	for (
		let guard = 0;
		guard < options.maxIterations && cursor + 8 <= buffer.length;
		guard += 1
	) {
		const group = bigEndian
			? buffer.readUInt16BE(cursor)
			: buffer.readUInt16LE(cursor);
		const element = bigEndian
			? buffer.readUInt16BE(cursor + 2)
			: buffer.readUInt16LE(cursor + 2);
		const tagKey = `${group.toString(16).padStart(4, "0")}${element.toString(16).padStart(4, "0")}`;

		let valueLength = 0;
		let valueOffset = 0;

		if (group === 0x0002 || explicitVr) {
			const vr = buffer.subarray(cursor + 4, cursor + 6).toString("latin1");
			if (LONG_DICOM_VRS.has(vr)) {
				if (cursor + 12 > buffer.length) break;
				valueLength = bigEndian
					? buffer.readUInt32BE(cursor + 8)
					: buffer.readUInt32LE(cursor + 8);
				valueOffset = cursor + 12;
			} else {
				valueLength = bigEndian
					? buffer.readUInt16BE(cursor + 6)
					: buffer.readUInt16LE(cursor + 6);
				valueOffset = cursor + 8;
			}
		} else {
			valueLength = bigEndian
				? buffer.readUInt32BE(cursor + 4)
				: buffer.readUInt32LE(cursor + 4);
			valueOffset = cursor + 8;
		}

		if (tagKey === "7fe00010") {
			options.onPixelData?.({
				valueOffset,
				valueLength,
				indefinite: valueLength === 0xffffffff,
				explicitVr,
				bigEndian,
				transferSyntaxUid,
			});
			break;
		}

		if (valueLength === 0xffffffff) {
			if (options.onIndefiniteLength === "skip_sequence") {
				cursor = valueOffset;
				continue;
			}
			options.onIndefiniteWarning?.(tagKey);
			break;
		}

		if (valueLength < 0 || valueOffset + valueLength > buffer.length) break;

		const value = buffer.subarray(valueOffset, valueOffset + valueLength);
		if (tagKey === "00020010") {
			transferSyntaxUid = cleanDicomText(value);
			if (transferSyntaxUid === "1.2.840.10008.1.2") {
				explicitVr = false;
			} else if (transferSyntaxUid === "1.2.840.10008.1.2.2") {
				bigEndian = true;
				explicitVr = true;
			}
			options.onTransferSyntax?.({
				transferSyntaxUid,
				bigEndian,
				explicitVr,
			});
		}

		onTag({
			tagKey,
			valueOffset,
			valueLength,
			value,
			bigEndian,
			explicitVr,
			transferSyntaxUid,
		});

		cursor = valueOffset + valueLength + (valueLength % 2);
		if (cursor >= buffer.length) break;
	}

	return { explicitVr, bigEndian, transferSyntaxUid };
}
