import { readSync, closeSync, statSync, openSync } from "node:fs";
import { normalizeDate } from "@dental/shared";
import {
	dicomFirstFramePreviewResponseSchema
} from "@dental/shared";
import {
	parseInstanceNumber
} from "./manifestParser.js";
import { open, stat, readdir, type FileHandle } from "node:fs/promises";
import path from "node:path";
import type { DicomFirstFramePreviewResponse } from "@dental/shared";
import {
	dicomArchiveExtensions,
	dicomPixelFileExtensions,
	dicomMetadataTags,
	type DicomHeaderMetadata,
} from "./imagingConstants.js";
import {
	normalizeDicomUid,
	normalizeModality,
} from "./manifestParser.js";

export function isDicomArchivePath(filePath: string | null): boolean {
	if (!filePath) return false;
	if (filePath.includes("::")) return false;
	return dicomArchiveExtensions.has(
		path.extname(filePath.split("::")[0] ?? filePath).toLowerCase(),
	);
}

export function isDicomArchiveVirtualEntryPath(filePath: string | null): boolean {
	if (!filePath?.includes("::")) return false;
	const archivePath = filePath.split("::")[0] ?? "";
	return dicomArchiveExtensions.has(path.extname(archivePath).toLowerCase());
}

export function isZipArchivePath(filePath: string | null): boolean {
	if (!filePath) return false;
	return (
		path.extname(filePath.split("::")[0] ?? filePath).toLowerCase() === ".zip"
	);
}

export function isDicomLikeEntry(entryName: string): boolean {
	const normalized = entryName.replaceAll("\\", "/");
	const extension = path.extname(normalized).toLowerCase();
	return (
		dicomPixelFileExtensions.has(extension) ||
		/(?:^|\/)DICOMDIR$/i.test(normalized)
	);
}

export function isDicomPixelPath(filePath: string): boolean {
	const normalized = filePath.replaceAll("\\", "/");
	const extension = path
		.extname(normalized.split("::")[0] ?? normalized)
		.toLowerCase();
	return (
		dicomPixelFileExtensions.has(extension) ||
		/(?:^|\/)DICOMDIR$/i.test(normalized)
	);
}

export async function hasDicomMagicAsync(filePath: string): Promise<boolean> {
	let handle: FileHandle | null = null;
	try {
		const stats = await stat(filePath);
		if (
			!stats.isFile() ||
			stats.size < 132 ||
			stats.size > 2 * 1024 * 1024 * 1024
		)
			return false;
		const buffer = Buffer.alloc(132);
		handle = await open(filePath, "r");
		await handle.read(buffer, 0, 132, 0);
		return buffer.toString("latin1", 128, 132) === "DICM";
	} catch (_err) {
		return false;
	} finally {
		if (handle) {
			await handle.close().catch(() => {});
		}
	}
}

export function hasDicomMagic(filePath: string): boolean {
	try {
		const stats = statSync(filePath);
		if (
			!stats.isFile() ||
			stats.size < 132 ||
			stats.size > 2 * 1024 * 1024 * 1024
		)
			return false;
		const buffer = Buffer.alloc(132);
		const handle = openSync(filePath, "r");
		try {
			readSync(handle, buffer, 0, 132, 0);
			return buffer.toString("latin1", 128, 132) === "DICM";
		} finally {
			closeSync(handle);
		}
	} catch (_err) {
		return false;
	}
}

export function isDicomHeaderCandidatePath(filePath: string): boolean {
	if (isDicomPixelPath(filePath) || isZipArchivePath(filePath)) return true;
	const extension = path.extname(filePath).toLowerCase();
	if (extension && extension.length > 1) return false;
	return hasDicomMagic(filePath);
}

export async function readFilePrefixAsync(filePath: string, maxBytes: number): Promise<Buffer> {
	let handle: FileHandle | null = null;
	try {
		const stats = await stat(filePath);
		const bytesToRead = Math.max(0, Math.min(stats.size, maxBytes));
		const buffer = Buffer.alloc(bytesToRead);
		handle = await open(filePath, "r");
		await handle.read(buffer, 0, bytesToRead, 0);
		return buffer;
	} finally {
		if (handle) {
			await handle.close().catch(() => {});
		}
	}
}

export function readFilePrefix(filePath: string, maxBytes: number): Buffer {
	const stats = statSync(filePath);
	const bytesToRead = Math.max(0, Math.min(stats.size, maxBytes));
	const buffer = Buffer.alloc(bytesToRead);
	const handle = openSync(filePath, "r");
	try {
		readSync(handle, buffer, 0, bytesToRead, 0);
		return buffer;
	} finally {
		closeSync(handle);
	}
}

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

export function emptyDicomHeaderMetadata(
	warnings: string[] = [],
): DicomHeaderMetadata {
	return {
		patientName: null,
		modality: null,
		studyInstanceUid: null,
		seriesInstanceUid: null,
		sopInstanceUid: null,
		studyDescription: null,
		seriesDescription: null,
		instanceNumber: null,
		imageRows: null,
		imageColumns: null,
		bitsAllocated: null,
		samplesPerPixel: null,
		estimatedPixelBytes: null,
		capturedAt: null,
		tagsRead: 0,
		transferSyntaxUid: null,
		pixelSpacing: null,
		sliceThickness: null,
		warnings,
	};
}

export function parseDicomUnsignedInt(valueBuffer: Buffer) {
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

export function updateDicomEstimatedPixelBytes(metadata: DicomHeaderMetadata) {
	if (
		!metadata.imageRows ||
		!metadata.imageColumns ||
		!metadata.bitsAllocated
	) {
		metadata.estimatedPixelBytes = null;
		return;
	}
	const samples = metadata.samplesPerPixel ?? 1;
	const bytesPerSample = Math.max(1, Math.ceil(metadata.bitsAllocated / 8));
	metadata.estimatedPixelBytes =
		metadata.imageRows * metadata.imageColumns * samples * bytesPerSample;
}

export function assignDicomHeaderValue(
	metadata: DicomHeaderMetadata,
	tagKey: string,
	valueBuffer: Buffer,
) {
	const value = cleanDicomText(valueBuffer);

	if (tagKey === "00280010")
		metadata.imageRows = parseDicomUnsignedInt(valueBuffer);
	else if (tagKey === "00280011")
		metadata.imageColumns = parseDicomUnsignedInt(valueBuffer);
	else if (tagKey === "00280100")
		metadata.bitsAllocated = parseDicomUnsignedInt(valueBuffer);
	else if (tagKey === "00280002")
		metadata.samplesPerPixel = parseDicomUnsignedInt(valueBuffer);
	else if (tagKey === "00280030") {
		const text = cleanDicomText(valueBuffer);
		if (text) {
			const parts = text.split(/[\\/]/).map((p) => Number.parseFloat(p.trim()));
			const p0 = parts[0];
			const p1 = parts[1];
			if (parts.length >= 2 && p0 !== undefined && p1 !== undefined && Number.isFinite(p0) && Number.isFinite(p1)) {
				metadata.pixelSpacing = [p0, p1];
			}
		}
	} else if (tagKey === "00180050") {
		const text = cleanDicomText(valueBuffer);
		if (text) {
			const num = Number.parseFloat(text.split(/[\\/]/)[0]?.trim() ?? "");
			if (Number.isFinite(num)) {
				metadata.sliceThickness = num;
			}
		}
	} else if (value) {
		if (tagKey === "00100010") metadata.patientName = value;
		else if (tagKey === "00080060")
			metadata.modality = normalizeModality(value);
		else if (tagKey === "0020000d")
			metadata.studyInstanceUid = normalizeDicomUid(value);
		else if (tagKey === "0020000e")
			metadata.seriesInstanceUid = normalizeDicomUid(value);
		else if (tagKey === "00080018")
			metadata.sopInstanceUid = normalizeDicomUid(value);
		else if (tagKey === "00081030") metadata.studyDescription = value;
		else if (tagKey === "0008103e") metadata.seriesDescription = value;
		else if (tagKey === "00200013")
			metadata.instanceNumber = parseInstanceNumber(value);
		else if (
			tagKey === "00080022" ||
			(tagKey === "00080020" && !metadata.capturedAt)
		) {
			metadata.capturedAt = normalizeDicomDate(value);
		}
	}
	updateDicomEstimatedPixelBytes(metadata);
}

export function parseDicomHeader(buffer: Buffer): DicomHeaderMetadata {
	if (buffer.length < 12)
		return emptyDicomHeaderMetadata([
			"Заголовок снимка слишком короткий для разбора.",
		]);

	const metadata = emptyDicomHeaderMetadata();
	let cursor =
		buffer.length >= 132 &&
		buffer.subarray(128, 132).toString("latin1") === "DICM"
			? 132
			: 0;
	let explicitVr = true;
	let bigEndian = false;
	let transferSyntaxUid: string | null = null;

	for (let guard = 0; guard < 4096 && cursor + 8 <= buffer.length; guard += 1) {
		const group = bigEndian
			? buffer.readUInt16BE(cursor)
			: buffer.readUInt16LE(cursor);
		const element = bigEndian
			? buffer.readUInt16BE(cursor + 2)
			: buffer.readUInt16LE(cursor + 2);
		const tagKey = `${group.toString(16).padStart(4, "0")}${element.toString(16).padStart(4, "0")}`;
		if (tagKey === "7fe00010") break;

		let valueLength = 0;
		let valueOffset = 0;

		if (group === 0x0002 || explicitVr) {
			const vr = buffer.subarray(cursor + 4, cursor + 6).toString("latin1");
			const longVr = [
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
			].includes(vr);
			if (longVr) {
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
			valueLength = buffer.readUInt32LE(cursor + 4);
			valueOffset = cursor + 8;
		}

		if (valueLength === 0xffffffff) {
			metadata.warnings.push(
				`Элемент метаданных снимка ${tagKey} с неопределенной длиной пропущен.`,
			);
			break;
		}
		if (valueLength < 0 || valueOffset + valueLength > buffer.length) break;

		if (tagKey === "00020010") {
			transferSyntaxUid = cleanDicomText(
				buffer.subarray(valueOffset, valueOffset + valueLength),
			);
			metadata.transferSyntaxUid = transferSyntaxUid;
			if (transferSyntaxUid === "1.2.840.10008.1.2") explicitVr = false;
			if (transferSyntaxUid === "1.2.840.10008.1.2.2") {
				bigEndian = true;
				explicitVr = true;
				metadata.warnings.push(
					"Обнаружен big-endian transfer syntax; предпросмотр метаданных выполнен в best-effort режиме.",
				);
			}
		}

		if (dicomMetadataTags.has(tagKey)) {
			assignDicomHeaderValue(
				metadata,
				tagKey,
				buffer.subarray(valueOffset, valueOffset + valueLength),
			);
			metadata.tagsRead += 1;
		}

		cursor = valueOffset + valueLength + (valueLength % 2);
		if (cursor >= buffer.length) break;
	}

	if (!metadata.tagsRead)
		metadata.warnings.push(
			"В доступной части заголовка не найдены известные метаданные снимка.",
		);
	return metadata;
}

export type DicomFirstFramePixelParse = {
	status: "ready" | "unsupported";
	transferSyntaxUid: string | null;
	photometricInterpretation: string | null;
	sourceWidth: number | null;
	sourceHeight: number | null;
	bitsAllocated: number | null;
	bitsStored: number | null;
	pixelRepresentation: number | null;
	windowCenter: number | null;
	windowWidth: number | null;
	pixelSpacing?: [number, number] | null | undefined;
	sliceThickness?: number | null | undefined;
	imageDataUrl: string | null;
	width: number | null;
	height: number | null;
	previewGrayRange?: number;
	previewGrayMean?: number;
	warnings: string[];
	nextAction: string;
};

export const uncompressedLittleEndianTransferSyntaxes = new Set([
	"1.2.840.10008.1.2",
	"1.2.840.10008.1.2.1",
]);

export function redactDicomPreviewText(value: string) {
	return value
		.replace(/[A-Za-z]:[\\/][^\r\n]*/g, "redacted-local-dicom-path")
		.replace(/\\\\[^\r\n]*/g, "redacted-local-dicom-path");
}

export function redactDicomPreviewWarnings(warnings: string[]) {
	return Array.from(
		new Set(
			warnings
				.map((warning) => redactDicomPreviewText(warning))
				.filter((warning) => warning.trim()),
		),
	);
}

export function emptyDicomFirstFramePreview(input: {
	folderPath: string;
	status: "unsupported" | "not_found";
	warnings: string[];
	nextAction: string;
	requestedFileIndex?: number | null;
	selectableFileCount?: number;
}): DicomFirstFramePreviewResponse {
	return dicomFirstFramePreviewResponseSchema.parse({
		version: "dental-crm-dicom-first-frame-preview-v1",
		generatedAt: new Date().toISOString(),
		folderPath: "redacted-local-dicom-folder",
		status: input.status,
		sourceFileName: null,
		sourceFileIndex: null,
		requestedFileIndex: input.requestedFileIndex ?? null,
		selectableFileCount: input.selectableFileCount ?? 0,
		transferSyntaxUid: null,
		photometricInterpretation: null,
		width: null,
		height: null,
		sourceWidth: null,
		sourceHeight: null,
		bitsAllocated: null,
		bitsStored: null,
		pixelRepresentation: null,
		windowCenter: null,
		windowWidth: null,
		imageDataUrl: null,
		warnings: redactDicomPreviewWarnings(input.warnings),
		nextAction: input.nextAction,
	});
}

export function readDicomUs(buffer: Buffer, bigEndian: boolean) {
	if (buffer.length < 2) return null;
	return bigEndian ? buffer.readUInt16BE(0) : buffer.readUInt16LE(0);
}

export function readDicomDsNumber(buffer: Buffer) {
	const text = cleanDicomText(buffer);
	if (!text) return null;
	const first = text.split("\\")[0]?.trim();
	if (!first) return null;
	const value = Number(first);
	return Number.isFinite(value) ? value : null;
}

export function dicomTransferSyntaxIsSupported(transferSyntaxUid: string | null) {
	if (!transferSyntaxUid) return true;
	return uncompressedLittleEndianTransferSyntaxes.has(transferSyntaxUid);
}

export interface DicomImageMetadata {
	explicitVr: boolean;
	bigEndian: boolean;
	transferSyntaxUid: string | null;
	photometricInterpretation: string | null;
	rows: number | null;
	columns: number | null;
	bitsAllocated: number | null;
	bitsStored: number | null;
	pixelRepresentation: number | null;
	samplesPerPixel: number | null;
	windowCenter: number | null;
	windowWidth: number | null;
	rescaleIntercept: number;
	rescaleSlope: number;
	pixelSpacing?: [number, number] | null | undefined;
	sliceThickness?: number | null | undefined;
	pixelDataOffset: number;
	pixelDataLength: number;
	warnings: string[];
	isCompressed?: boolean;
}

export function extractDicomMetadata(
	buffer: Buffer,
	warnings: string[],
): DicomImageMetadata | null {
	let cursor =
		buffer.length >= 132 &&
		buffer.subarray(128, 132).toString("latin1") === "DICM"
			? 132
			: 0;
	let explicitVr = true;
	let bigEndian = false;
	let transferSyntaxUid: string | null = null;
	let photometricInterpretation: string | null = null;
	let rows: number | null = null;
	let columns: number | null = null;
	let bitsAllocated: number | null = null;
	let bitsStored: number | null = null;
	let pixelRepresentation: number | null = null;
	let samplesPerPixel: number | null = null;
	let windowCenter: number | null = null;
	let windowWidth: number | null = null;
	let pixelSpacing: [number, number] | null = null;
	let sliceThickness: number | null = null;
	let rescaleIntercept = 0;
	let rescaleSlope = 1;
	let pixelDataOffset = -1;
	let pixelDataLength = 0;

	for (
		let guard = 0;
		guard < 100_000 && cursor + 8 <= buffer.length;
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
			const longVr = [
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
			].includes(vr);
			if (longVr) {
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
			valueLength = buffer.readUInt32LE(cursor + 4);
			valueOffset = cursor + 8;
		}

		if (tagKey === "7fe00010") {
			if (valueLength === 0xffffffff) {
				return {
					explicitVr,
					bigEndian,
					transferSyntaxUid,
					photometricInterpretation,
					rows,
					columns,
					bitsAllocated,
					bitsStored,
					pixelRepresentation,
					samplesPerPixel,
					windowCenter,
					windowWidth,
					rescaleIntercept,
					rescaleSlope,
					pixelDataOffset: -1,
					pixelDataLength: 0,
					warnings,
					isCompressed: true,
				};
			}
			pixelDataOffset = valueOffset;
			pixelDataLength = valueLength;
			break;
		}

		if (valueLength === 0xffffffff) {
			warnings.push(
				`Элемент метаданных снимка ${tagKey} с неопределенной длиной пропущен.`,
			);
			break;
		}
		if (valueLength < 0 || valueOffset + valueLength > buffer.length) break;

		const value = buffer.subarray(valueOffset, valueOffset + valueLength);
		if (tagKey === "00020010") {
			transferSyntaxUid = cleanDicomText(value);
			if (transferSyntaxUid === "1.2.840.10008.1.2") explicitVr = false;
			if (transferSyntaxUid === "1.2.840.10008.1.2.2") {
				bigEndian = true;
				explicitVr = true;
			}
		} else if (tagKey === "00280002")
			samplesPerPixel = readDicomUs(value, bigEndian);
		else if (tagKey === "00280004")
			photometricInterpretation = cleanDicomText(value)?.toUpperCase() ?? null;
		else if (tagKey === "00280010") rows = readDicomUs(value, bigEndian);
		else if (tagKey === "00280011") columns = readDicomUs(value, bigEndian);
		else if (tagKey === "00280100")
			bitsAllocated = readDicomUs(value, bigEndian);
		else if (tagKey === "00280101") bitsStored = readDicomUs(value, bigEndian);
		else if (tagKey === "00280103")
			pixelRepresentation = readDicomUs(value, bigEndian);
		else if (tagKey === "00281050") windowCenter = readDicomDsNumber(value);
		else if (tagKey === "00281051") windowWidth = readDicomDsNumber(value);
		else if (tagKey === "00281052")
			rescaleIntercept = readDicomDsNumber(value) ?? 0;
		else if (tagKey === "00281053")
			rescaleSlope = readDicomDsNumber(value) ?? 1;
		else if (tagKey === "00280030") {
			const text = cleanDicomText(value);
			if (text) {
				const parts = text.split(/[\\/]/).map((p) => Number.parseFloat(p.trim()));
				const p0 = parts[0];
				const p1 = parts[1];
				if (parts.length >= 2 && p0 !== undefined && p1 !== undefined && Number.isFinite(p0) && Number.isFinite(p1)) {
					pixelSpacing = [p0, p1];
				}
			}
		} else if (tagKey === "00180050") {
			sliceThickness = readDicomDsNumber(value);
		}

		cursor = valueOffset + valueLength + (valueLength % 2);
	}

	return {
		explicitVr,
		bigEndian,
		transferSyntaxUid,
		photometricInterpretation,
		rows,
		columns,
		bitsAllocated,
		bitsStored,
		pixelRepresentation,
		samplesPerPixel,
		windowCenter,
		windowWidth,
		rescaleIntercept,
		rescaleSlope,
		pixelSpacing,
		sliceThickness,
		pixelDataOffset,
		pixelDataLength,
		warnings,
	};
}

export function buildUnsupportedDicomResponse(
	metadata: DicomImageMetadata,
	message: string,
	nextAction: string,
): DicomFirstFramePixelParse {
	return {
		status: "unsupported",
		transferSyntaxUid: metadata.transferSyntaxUid,
		photometricInterpretation: metadata.photometricInterpretation,
		sourceWidth: metadata.columns,
		sourceHeight: metadata.rows,
		bitsAllocated: metadata.bitsAllocated,
		bitsStored: metadata.bitsStored,
		pixelRepresentation: metadata.pixelRepresentation,
		windowCenter: metadata.windowCenter,
		windowWidth: metadata.windowWidth,
		pixelSpacing: metadata.pixelSpacing ?? null,
		sliceThickness: metadata.sliceThickness ?? null,
		imageDataUrl: null,
		width: null,
		height: null,
		warnings: [...metadata.warnings, message],
		nextAction,
	};
}

export function buildDicomPreviewRgba(
	width: number,
	height: number,
	r: number,
	c: number,
	invert: boolean,
	sampleValue: (index: number) => number,
	renderCenter: number,
	renderWindow: number,
): { rgba: Buffer; grayMin: number; grayMax: number; grayMean: number } {
	const lower = renderCenter - renderWindow / 2;
	const upper = renderCenter + renderWindow / 2;
	const rendered = Buffer.alloc(width * height * 4);
	let grayMin = 255;
	let grayMax = 0;
	let graySum = 0;

	for (let y = 0; y < height; y += 1) {
		const sourceY = Math.min(r - 1, Math.floor((y / height) * r));
		for (let x = 0; x < width; x += 1) {
			const sourceX = Math.min(c - 1, Math.floor((x / width) * c));
			const pixelValue = sampleValue(sourceY * c + sourceX);
			const clamped = Math.max(
				0,
				Math.min(1, (pixelValue - lower) / Math.max(1, upper - lower)),
			);
			const gray = invert
				? 255 - Math.round(clamped * 255)
				: Math.round(clamped * 255);
			const targetOffset = (y * width + x) * 4;
			rendered[targetOffset] = gray;
			rendered[targetOffset + 1] = gray;
			rendered[targetOffset + 2] = gray;
			rendered[targetOffset + 3] = 255;
			if (gray < grayMin) grayMin = gray;
			if (gray > grayMax) grayMax = gray;
			graySum += gray;
		}
	}

	return {
		rgba: rendered,
		grayMin,
		grayMax,
		grayMean: graySum / Math.max(1, width * height),
	};
}

export function createDicomPixelSampler(
	buffer: Buffer,
	pixelDataOffset: number,
	bytesPerPixel: number,
	bitsAllocated: number,
	pixelRepresentation: number | null | undefined,
	rescaleSlope: number,
	rescaleIntercept: number,
	bitsStored?: number | null,
): (index: number) => number {
	const requiredBytes = bitsAllocated === 16 ? 2 : 1;
	const bufLen = buffer.length;
	const stored =
		bitsStored && bitsStored > 0 && bitsStored <= bitsAllocated
			? bitsStored
			: bitsAllocated;
	const mask = (1 << stored) - 1;
	const signBit = 1 << (stored - 1);

	return (index: number) => {
		const offset = pixelDataOffset + index * bytesPerPixel;
		if (offset < 0 || offset + requiredBytes > bufLen) {
			return rescaleIntercept;
		}
		let raw: number;
		if (bitsAllocated === 16) {
			const uval = buffer.readUInt16LE(offset);
			if (pixelRepresentation === 1) {
				const masked = uval & mask;
				raw = masked & signBit ? masked - (1 << stored) : masked;
			} else {
				raw = uval & mask;
			}
		} else {
			const uval = buffer.readUInt8(offset);
			if (pixelRepresentation === 1) {
				const masked = uval & mask;
				raw = masked & signBit ? masked - (1 << stored) : masked;
			} else {
				raw = uval & mask;
			}
		}
		return raw * rescaleSlope + rescaleIntercept;
	};
}

export interface ParsedDicomMetadata {
	patientName: string | null;
	patientId: string | null;
	patientBirthDate: string | null; // ISO YYYY-MM-DD
	patientSex: string | null;
	studyDate: string | null; // ISO YYYY-MM-DD
	studyTime: string | null;
	modality: string | null;
	manufacturer: string | null;
	manufacturerModelName: string | null;
	studyDescription: string | null;
	seriesDescription: string | null;
	studyInstanceUid: string | null;
	seriesInstanceUid: string | null;
	sopInstanceUid: string | null;
	instanceNumber: number | null;
	rows: number | null;
	columns: number | null;
	bitsAllocated: number | null;
	bitsStored: number | null;
	sliceThickness: number | null;
	spacingBetweenSlices: number | null;
	pixelSpacing: [number, number] | null;
	transferSyntaxUid: string | null;
	fileSizeBytes: number;
	warnings: string[];
}

export interface DicomSeriesScanSummary {
	folderPath: string;
	studyInstanceUid: string | null;
	seriesInstanceUid: string | null;
	patientName: string | null;
	patientId: string | null;
	patientBirthDate: string | null;
	modality: string;
	manufacturer: string | null;
	studyDate: string | null;
	seriesDescription: string | null;
	sliceCount: number;
	sliceThickness: number | null;
	dimensions: string | null; // e.g. "512x512"
	voxelSpacing: string | null; // e.g. "0.2x0.2x0.2 мм"
	totalSizeBytes: number;
	sampleFilePath: string;
	dicomFilePaths: string[];
}

const DICOM_MAX_HEADER_READ_BYTES = 512 * 1024; // 512 КБ для метаданных

/**
 * Проверка наличия сигнатуры DICM на 128 байте (алиас к hasDicomMagic)
 */
export function hasDicomPreamble(filePath: string): boolean {
	return hasDicomMagic(filePath);
}

/**
 * Нормализация даты DICOM (YYYYMMDD) в ISO (YYYY-MM-DD)
 */
export function formatDicomDateToIso(rawDate: string | null | undefined): string | null {
	if (!rawDate) return null;
	const digits = rawDate.replace(/\D/g, "");
	if (digits.length === 8) {
		const y = digits.slice(0, 4);
		const m = digits.slice(4, 6);
		const d = digits.slice(6, 8);
		const yearNum = Number.parseInt(y, 10);
		const monthNum = Number.parseInt(m, 10);
		const dayNum = Number.parseInt(d, 10);
		if (yearNum >= 1900 && yearNum <= 2099 && monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31) {
			return `${y}-${m}-${d}`;
		}
	}
	return null;
}

function parseDsNumberInternal(buf: Buffer): number | null {
	const text = buf.toString("latin1").replace(/\0+$/g, "").trim();
	if (!text) return null;
	const num = Number.parseFloat(text);
	return Number.isFinite(num) ? num : null;
}

function parseIntegerInternal(buf: Buffer, isBigEndian: boolean): number | null {
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

function createEmptyParsedMetadata(fileSizeBytes: number, warnings: string[]): ParsedDicomMetadata {
	return {
		patientName: null,
		patientId: null,
		patientBirthDate: null,
		patientSex: null,
		studyDate: null,
		studyTime: null,
		modality: null,
		manufacturer: null,
		manufacturerModelName: null,
		studyDescription: null,
		seriesDescription: null,
		studyInstanceUid: null,
		seriesInstanceUid: null,
		sopInstanceUid: null,
		instanceNumber: null,
		rows: null,
		columns: null,
		bitsAllocated: null,
		bitsStored: null,
		sliceThickness: null,
		spacingBetweenSlices: null,
		pixelSpacing: null,
		transferSyntaxUid: null,
		fileSizeBytes,
		warnings,
	};
}

/**
 * Парсер метаданных одного DICOM файла
 */
export function parseDicomFile(filePath: string): ParsedDicomMetadata {
	const warnings: string[] = [];
	let fileSize = 0;

	try {
		const st = statSync(filePath);
		fileSize = st.size;
	} catch (e) {
		return createEmptyParsedMetadata(fileSize, [`Не удалось прочитать файл: ${String(e)}`]);
	}

	const bytesToRead = Math.min(fileSize, DICOM_MAX_HEADER_READ_BYTES);
	if (bytesToRead < 132) {
		return createEmptyParsedMetadata(fileSize, ["Файл слишком мал для формата DICOM"]);
	}

	const buffer = Buffer.alloc(bytesToRead);
	let bytesRead = 0;
	try {
		const fd = openSync(filePath, "r");
		try {
			bytesRead = readSync(fd, buffer, 0, bytesToRead, 0);
		} finally {
			closeSync(fd);
		}
	} catch (e) {
		return createEmptyParsedMetadata(fileSize, [`Ошибка чтения: ${String(e)}`]);
	}

	const metadata: ParsedDicomMetadata = {
		patientName: null,
		patientId: null,
		patientBirthDate: null,
		patientSex: null,
		studyDate: null,
		studyTime: null,
		modality: null,
		manufacturer: null,
		manufacturerModelName: null,
		studyDescription: null,
		seriesDescription: null,
		studyInstanceUid: null,
		seriesInstanceUid: null,
		sopInstanceUid: null,
		instanceNumber: null,
		rows: null,
		columns: null,
		bitsAllocated: null,
		bitsStored: null,
		sliceThickness: null,
		spacingBetweenSlices: null,
		pixelSpacing: null,
		transferSyntaxUid: null,
		fileSizeBytes: fileSize,
		warnings,
	};

	let cursor = 0;
	if (bytesRead >= 132 && buffer.toString("latin1", 128, 132) === "DICM") {
		cursor = 132;
	}

	let explicitVr = true;
	let bigEndian = false;

	while (cursor + 8 <= bytesRead) {
		const group = bigEndian ? buffer.readUInt16BE(cursor) : buffer.readUInt16LE(cursor);
		const element = bigEndian ? buffer.readUInt16BE(cursor + 2) : buffer.readUInt16LE(cursor + 2);
		const tagHex = `${group.toString(16).padStart(4, "0")}${element.toString(16).padStart(4, "0")}`.toLowerCase();

		// Тег PixelData (7FE0,0010) означает начало вокселей — метаданные прочитаны
		if (tagHex === "7fe00010") {
			break;
		}

		let valueLength = 0;
		let valueOffset = 0;

		if (group === 0x0002 || explicitVr) {
			const vr = buffer.subarray(cursor + 4, cursor + 6).toString("latin1");
			const isLongVr = ["OB", "OD", "OF", "OL", "OV", "OW", "SQ", "UC", "UR", "UT", "UN"].includes(vr);

			if (isLongVr) {
				if (cursor + 12 > bytesRead) break;
				valueLength = bigEndian ? buffer.readUInt32BE(cursor + 8) : buffer.readUInt32LE(cursor + 8);
				valueOffset = cursor + 12;
			} else {
				valueLength = bigEndian ? buffer.readUInt16BE(cursor + 6) : buffer.readUInt16LE(cursor + 6);
				valueOffset = cursor + 8;
			}
		} else {
			valueLength = bigEndian ? buffer.readUInt32BE(cursor + 4) : buffer.readUInt32LE(cursor + 4);
			valueOffset = cursor + 8;
		}

		// Неопределенная длина (часто для SQ или сжатых фрагментов)
		if (valueLength === 0xffffffff) {
			cursor = valueOffset;
			continue;
		}

		if (valueOffset + valueLength > bytesRead) {
			// Метаданные выходят за прочитанный буфер
			break;
		}

		const valBuf = buffer.subarray(valueOffset, valueOffset + valueLength);

		// Обработка синтаксиса передачи
		if (tagHex === "00020010") {
			const syntax = cleanDicomText(valBuf);
			metadata.transferSyntaxUid = syntax;
			if (syntax === "1.2.840.10008.1.2") {
				explicitVr = false;
			} else if (syntax === "1.2.840.10008.1.2.2") {
				bigEndian = true;
				explicitVr = true;
			}
		}

		// Клинические теги
		switch (tagHex) {
			case "00100010": // PatientName
				metadata.patientName = cleanDicomText(valBuf);
				break;
			case "00100020": // PatientID
				metadata.patientId = cleanDicomText(valBuf);
				break;
			case "00100030": // PatientBirthDate
				metadata.patientBirthDate = formatDicomDateToIso(cleanDicomText(valBuf));
				break;
			case "00100040": // PatientSex
				metadata.patientSex = cleanDicomText(valBuf);
				break;
			case "00080020": // StudyDate
				metadata.studyDate = formatDicomDateToIso(cleanDicomText(valBuf));
				break;
			case "00080030": // StudyTime
				metadata.studyTime = cleanDicomText(valBuf);
				break;
			case "00080060": // Modality
				metadata.modality = cleanDicomText(valBuf)?.toUpperCase() ?? null;
				break;
			case "00080070": // Manufacturer
				metadata.manufacturer = cleanDicomText(valBuf);
				break;
			case "00081090": // ManufacturerModelName
				metadata.manufacturerModelName = cleanDicomText(valBuf);
				break;
			case "00081030": // StudyDescription
				metadata.studyDescription = cleanDicomText(valBuf);
				break;
			case "0008103e": // SeriesDescription
				metadata.seriesDescription = cleanDicomText(valBuf);
				break;
			case "0020000d": // StudyInstanceUID
				metadata.studyInstanceUid = cleanDicomText(valBuf);
				break;
			case "0020000e": // SeriesInstanceUID
				metadata.seriesInstanceUid = cleanDicomText(valBuf);
				break;
			case "00080018": // SOPInstanceUID
				metadata.sopInstanceUid = cleanDicomText(valBuf);
				break;
			case "00200013": // InstanceNumber
				metadata.instanceNumber = parseIntegerInternal(valBuf, bigEndian);
				break;
			case "00280010": // Rows
				metadata.rows = parseIntegerInternal(valBuf, bigEndian);
				break;
			case "00280011": // Columns
				metadata.columns = parseIntegerInternal(valBuf, bigEndian);
				break;
			case "00280100": // BitsAllocated
				metadata.bitsAllocated = parseIntegerInternal(valBuf, bigEndian);
				break;
			case "00280101": // BitsStored
				metadata.bitsStored = parseIntegerInternal(valBuf, bigEndian);
				break;
			case "00180050": // SliceThickness
				metadata.sliceThickness = parseDsNumberInternal(valBuf);
				break;
			case "00180088": // SpacingBetweenSlices
				metadata.spacingBetweenSlices = parseDsNumberInternal(valBuf);
				break;
			case "00280030": { // PixelSpacing (Row \ Column)
				const text = cleanDicomText(valBuf);
				if (text) {
					const parts = text.split(/[\\/]/).map((p) => Number.parseFloat(p.trim()));
					const p0 = parts[0];
					const p1 = parts[1];
					if (parts.length >= 2 && p0 !== undefined && p1 !== undefined && Number.isFinite(p0) && Number.isFinite(p1)) {
						metadata.pixelSpacing = [p0, p1];
					}
				}
				break;
			}
		}

		cursor = valueOffset + valueLength;
		// DICOM выравнивание по четному байту
		if (cursor % 2 !== 0) cursor += 1;
	}

	return metadata;
}

/**
 * Сканирование папки на наличие серии DICOM срезов КТ
 */
export async function scanDicomSeriesFolder(folderPath: string): Promise<DicomSeriesScanSummary | null> {
	let entries;
	try {
		entries = await readdir(folderPath, { withFileTypes: true });
	} catch {
		return null;
	}

	const dicomFiles: Array<{ filePath: string; size: number }> = [];

	for (const entry of entries) {
		if (!entry.isFile()) continue;
		const name = entry.name;
		const ext = path.extname(name).toLowerCase();
		const fullPath = path.join(folderPath, name);

		if (ext === ".dcm" || ext === ".dicom" || ext === ".ima" || hasDicomMagic(fullPath)) {
			try {
				const st = statSync(fullPath);
				dicomFiles.push({ filePath: fullPath, size: st.size });
			} catch {
				// пропустить недоступный файл
			}
		}
	}

	if (dicomFiles.length === 0) {
		return null;
	}

	// Читаем метаданные первого среза
	const sample = dicomFiles[0];
	if (!sample) return null;
	const firstMetadata = parseDicomFile(sample.filePath);

	let totalSize = 0;
	for (const f of dicomFiles) {
		totalSize += f.size;
	}

	const dimensions =
		firstMetadata.rows && firstMetadata.columns
			? `${firstMetadata.columns}x${firstMetadata.rows}`
			: null;

	let voxelSpacing: string | null = null;
	if (firstMetadata.pixelSpacing && (firstMetadata.sliceThickness || firstMetadata.spacingBetweenSlices)) {
		const z = firstMetadata.spacingBetweenSlices ?? firstMetadata.sliceThickness ?? 0;
		voxelSpacing = `${firstMetadata.pixelSpacing[0].toFixed(2)}x${firstMetadata.pixelSpacing[1].toFixed(2)}x${z.toFixed(2)} мм`;
	}

	return {
		folderPath,
		studyInstanceUid: firstMetadata.studyInstanceUid,
		seriesInstanceUid: firstMetadata.seriesInstanceUid,
		patientName: firstMetadata.patientName,
		patientId: firstMetadata.patientId,
		patientBirthDate: firstMetadata.patientBirthDate,
		modality: firstMetadata.modality || (dicomFiles.length > 30 ? "CBCT" : "DX"),
		manufacturer: firstMetadata.manufacturer || firstMetadata.manufacturerModelName,
		studyDate: firstMetadata.studyDate,
		seriesDescription: firstMetadata.seriesDescription || firstMetadata.studyDescription,
		sliceCount: dicomFiles.length,
		sliceThickness: firstMetadata.sliceThickness,
		dimensions,
		voxelSpacing,
		totalSizeBytes: totalSize,
		sampleFilePath: sample.filePath,
		dicomFilePaths: dicomFiles.map((f) => f.filePath),
	};
}
