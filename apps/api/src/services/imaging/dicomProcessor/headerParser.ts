/**
 * headerParser.ts — Layer 1: Парсинг бинарных заголовков DICOM (Explicit/Implicit VR, Little/Big Endian) и валидация буферов.
 */

import {
	cleanDicomText,
	normalizeDicomDate,
	normalizeDicomUid,
	normalizeModality,
	parseInstanceNumber,
} from "./normalization.js";
import {
	type DicomHeaderMetadata,
	type DicomImageMetadata,
	type DicomParseResult,
	dicomMetadataTags,
} from "./types.js";

export function emptyDicomHeaderMetadata(
	warnings: string[] = [],
): DicomHeaderMetadata {
	return {
		patientName: null,
		patientId: null,
		studyDate: null,
		sliceThickness: null,
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

export function readDicomDsNumber(buffer: Buffer) {
	const text = cleanDicomText(buffer);
	if (!text) return null;
	const first = text.split("\\")[0]?.trim();
	if (!first) return null;
	const value = Number(first);
	return Number.isFinite(value) ? value : null;
}

export function readDicomUs(buffer: Buffer, bigEndian: boolean) {
	if (buffer.length < 2) return null;
	return bigEndian ? buffer.readUInt16BE(0) : buffer.readUInt16LE(0);
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
	else if (tagKey === "00180050")
		metadata.sliceThickness = readDicomDsNumber(valueBuffer);
	else if (value) {
		if (tagKey === "00100010") metadata.patientName = value;
		else if (tagKey === "00100020") metadata.patientId = value;
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
		else if (tagKey === "00080020") {
			const norm = normalizeDicomDate(value);
			metadata.studyDate = norm;
			if (!metadata.capturedAt) metadata.capturedAt = norm;
		} else if (tagKey === "00080022") {
			metadata.capturedAt = normalizeDicomDate(value);
		}
	}
	updateDicomEstimatedPixelBytes(metadata);
}

export function parseDicomHeader(buffer: Buffer): DicomHeaderMetadata {
	if (!buffer || buffer.length < 12)
		return emptyDicomHeaderMetadata([
			"Заголовок снимка слишком короткий для разбора.",
		]);

	const metadata = emptyDicomHeaderMetadata();
	try {
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
			if (valueLength < 0 || valueOffset + valueLength > buffer.length) {
				metadata.warnings.push(
					`Элемент ${tagKey} имеет длину ${valueLength}, превышающую остаток буфера (${buffer.length - valueOffset} байт). Заголовок усечен.`,
				);
				break;
			}

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
	} catch (parseError) {
		metadata.warnings.push(
			`Сбой при разборе бинарного заголовка DICOM: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
		);
	}

	if (!metadata.tagsRead)
		metadata.warnings.push(
			"В доступной части заголовка не найдены известные метаданные снимка.",
		);
	return metadata;
}

/**
 * Robust DICOM buffer parser that safely handles corrupted, truncated,
 * or non-DICOM buffers without crashing the Node.js process.
 * Returns 400 Bad Request if file signature is missing/invalid,
 * or 422 Unprocessable Entity if header is damaged or unreadable.
 */
export function parseDicomBufferSafe(buffer: Buffer): DicomParseResult {
	if (!buffer || buffer.length === 0) {
		return {
			success: false,
			metadata: emptyDicomHeaderMetadata(["Буфер файла пуст."]),
			errorCode: 400,
			error: "Файл не содержит данных (400 Bad Request).",
		};
	}

	const hasDicm = buffer.length >= 132 && buffer.subarray(128, 132).toString("latin1") === "DICM";
	const hasPreambleLessTag = buffer.length >= 8 && (
		(buffer[0] === 0x02 && buffer[1] === 0x00) ||
		(buffer[0] === 0x08 && buffer[1] === 0x00) ||
		(buffer[0] === 0x00 && buffer[1] === 0x02) ||
		(buffer[0] === 0x00 && buffer[1] === 0x08)
	);

	if (!hasDicm && !hasPreambleLessTag) {
		return {
			success: false,
			metadata: emptyDicomHeaderMetadata(["Файл не содержит валидной сигнатуры DICOM (DICM)."]),
			errorCode: 400,
			error: "Файл не является исследованием DICOM (400 Bad Request): отсутствует сигнатура DICM.",
		};
	}

	const metadata = parseDicomHeader(buffer);
	if (metadata.tagsRead === 0 && metadata.warnings.length > 0) {
		return {
			success: false,
			metadata,
			errorCode: 422,
			error: `Файл DICOM поврежден и не может быть обработан (422 Unprocessable Entity): ${metadata.warnings.join("; ")}`,
		};
	}

	return {
		success: true,
		metadata,
	};
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
		pixelDataOffset,
		pixelDataLength,
		warnings,
	};
}

const uncompressedLittleEndianTransferSyntaxes = new Set([
	"1.2.840.10008.1.2",
	"1.2.840.10008.1.2.1",
]);

export function dicomTransferSyntaxIsSupported(
	transferSyntaxUid: string | null,
) {
	if (!transferSyntaxUid) return true;
	return uncompressedLittleEndianTransferSyntaxes.has(transferSyntaxUid);
}
