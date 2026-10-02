/**
 * dicomMetadataParser.ts — Парсер метаданных DICOM файлов и серий срезов КТ/томографов.
 *
 * ФУНКЦИОНАЛ:
 * 1. Чтение DICOM-заголовков (Explicit/Implicit VR, Little/Big Endian).
 * 2. Полное извлечение клинических тегов:
 *    - (0010,0010) PatientName
 *    - (0010,0020) PatientID
 *    - (0010,0030) PatientBirthDate
 *    - (0010,0040) PatientSex
 *    - (0008,0020) StudyDate
 *    - (0008,0030) StudyTime
 *    - (0008,0060) Modality (CT, CBCT, DX, PX, CR, IO)
 *    - (0008,0070) Manufacturer (Vatech, Planmeca, Dentsply Sirona, KaVo, Morita, Gendex)
 *    - (0008,1090) ManufacturerModelName
 *    - (0008,1030) StudyDescription
 *    - (0008,103E) SeriesDescription
 *    - (0020,000D) StudyInstanceUID
 *    - (0020,000E) SeriesInstanceUID
 *    - (0008,0018) SOPInstanceUID
 *    - (0020,0013) InstanceNumber
 *    - (0028,0010) Rows, (0028,0011) Columns
 *    - (0028,0100) BitsAllocated, (0028,0101) BitsStored
 *    - (0018,0050) SliceThickness
 *    - (0018,0088) SpacingBetweenSlices
 *    - (0028,0030) PixelSpacing
 * 3. Быстрое сканирование каталогов серий срезов КТ без полной загрузки пикселей в память.
 */

import { openSync, readSync, closeSync, statSync } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";

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
 * Проверка наличия сигнатуры DICM на 128 байте
 */
export function hasDicomPreamble(filePath: string): boolean {
	try {
		const stats = statSync(filePath);
		if (!stats.isFile() || stats.size < 132) return false;
		const buffer = Buffer.alloc(132);
		const handle = openSync(filePath, "r");
		try {
			readSync(handle, buffer, 0, 132, 0);
			return buffer.toString("latin1", 128, 132) === "DICM";
		} finally {
			closeSync(handle);
		}
	} catch {
		return false;
	}
}

/**
 * Очистка строкового значения DICOM
 */
function cleanString(buf: Buffer): string | null {
	const str = buf
		.toString("utf8")
		.replace(/\0+$/g, "")
		.replace(/\^/g, " ")
		.replace(/\s+/g, " ")
		.trim();
	return str || null;
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

/**
 * Парсинг десятичного числа с плавающей точкой (DS) в DICOM
 */
function parseDsNumber(buf: Buffer): number | null {
	const text = buf.toString("latin1").replace(/\0+$/g, "").trim();
	if (!text) return null;
	const num = Number.parseFloat(text);
	return Number.isFinite(num) ? num : null;
}

/**
 * Парсинг целого числа (IS / US / SS) в DICOM
 */
function parseInteger(buf: Buffer, isBigEndian: boolean): number | null {
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
		return createEmptyMetadata(fileSize, [`Не удалось прочитать файл: ${String(e)}`]);
	}

	const bytesToRead = Math.min(fileSize, DICOM_MAX_HEADER_READ_BYTES);
	if (bytesToRead < 132) {
		return createEmptyMetadata(fileSize, ["Файл слишком мал для формата DICOM"]);
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
		return createEmptyMetadata(fileSize, [`Ошибка чтения: ${String(e)}`]);
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
			const syntax = cleanString(valBuf);
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
				metadata.patientName = cleanString(valBuf);
				break;
			case "00100020": // PatientID
				metadata.patientId = cleanString(valBuf);
				break;
			case "00100030": // PatientBirthDate
				metadata.patientBirthDate = formatDicomDateToIso(cleanString(valBuf));
				break;
			case "00100040": // PatientSex
				metadata.patientSex = cleanString(valBuf);
				break;
			case "00080020": // StudyDate
				metadata.studyDate = formatDicomDateToIso(cleanString(valBuf));
				break;
			case "00080030": // StudyTime
				metadata.studyTime = cleanString(valBuf);
				break;
			case "00080060": // Modality
				metadata.modality = cleanString(valBuf)?.toUpperCase() ?? null;
				break;
			case "00080070": // Manufacturer
				metadata.manufacturer = cleanString(valBuf);
				break;
			case "00081090": // ManufacturerModelName
				metadata.manufacturerModelName = cleanString(valBuf);
				break;
			case "00081030": // StudyDescription
				metadata.studyDescription = cleanString(valBuf);
				break;
			case "0008103e": // SeriesDescription
				metadata.seriesDescription = cleanString(valBuf);
				break;
			case "0020000d": // StudyInstanceUID
				metadata.studyInstanceUid = cleanString(valBuf);
				break;
			case "0020000e": // SeriesInstanceUID
				metadata.seriesInstanceUid = cleanString(valBuf);
				break;
			case "00080018": // SOPInstanceUID
				metadata.sopInstanceUid = cleanString(valBuf);
				break;
			case "00200013": // InstanceNumber
				metadata.instanceNumber = parseInteger(valBuf, bigEndian);
				break;
			case "00280010": // Rows
				metadata.rows = parseInteger(valBuf, bigEndian);
				break;
			case "00280011": // Columns
				metadata.columns = parseInteger(valBuf, bigEndian);
				break;
			case "00280100": // BitsAllocated
				metadata.bitsAllocated = parseInteger(valBuf, bigEndian);
				break;
			case "00280101": // BitsStored
				metadata.bitsStored = parseInteger(valBuf, bigEndian);
				break;
			case "00180050": // SliceThickness
				metadata.sliceThickness = parseDsNumber(valBuf);
				break;
			case "00180088": // SpacingBetweenSlices
				metadata.spacingBetweenSlices = parseDsNumber(valBuf);
				break;
			case "00280030": { // PixelSpacing (Row \ Column)
				const text = cleanString(valBuf);
				if (text) {
					const parts = text.split(/[\\/]/).map((p) => Number.parseFloat(p.trim()));
					if (parts.length >= 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1])) {
						metadata.pixelSpacing = [parts[0]!, parts[1]!];
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

function createEmptyMetadata(fileSizeBytes: number, warnings: string[]): ParsedDicomMetadata {
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

		if (ext === ".dcm" || ext === ".dicom" || ext === ".ima" || hasDicomPreamble(fullPath)) {
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
	const sample = dicomFiles[0]!;
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
