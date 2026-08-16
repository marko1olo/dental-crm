/**
 * DicomProcessorService.ts — чистый сервисный слой для парсинга, обработки и извлечения метаданных DICOM.
 *
 * ФУНКЦИОНАЛ:
 * 1. Парсинг DICOM заголовков (Explicit/Implicit VR, Little/Big Endian).
 * 2. Генерация первого кадра предпросмотра (RGBA -> PNG DataURL).
 * 3. Сканирование локальных папок и ZIP-архивов со снимками.
 * 4. Сопоставление с базой пациентов и генерация манифестов импорта.
 * 5. Фиксация импортированных исследований в БД.
 */

import {
	closeSync,
	type Dirent,
	existsSync,
	openSync,
	readSync,
	type Stats,
	statSync,
} from "node:fs";
import {
	access,
	type FileHandle,
	open,
	opendir,
	readdir,
	readFile,
	stat,
} from "node:fs/promises";
import path from "node:path";
import { setImmediate as yieldImmediate } from "node:timers/promises";
import { createInflateRaw, deflateSync } from "node:zlib";
import {
	type DicomFirstFramePreviewResponse,
	type DicomSeriesPreviewGroup,
	type DicomSeriesPreviewRow,
	type ImagingImportPreviewRow,
	type ImagingSourceKind,
	type ImagingStudyKind,
	dicomFirstFramePreviewResponseSchema,
	dicomSeriesPreviewResponseSchema,
	imagingImportCommitResponseSchema,
	imagingImportPreviewResponseSchema,
	normalizeDate,
	splitLine,
} from "@dental/shared";
import { createImagingStudyInDb } from "../../db/imagingQuery.js";
import { getPatientsFromDb } from "../../db/patientsQuery.js";

export const dicomArchiveExtensions = new Set([".zip"]);

export const dicomPixelFileExtensions = new Set([
	".dcm",
	".dicom",
	".ima",
	".rvg",
	".vix",
	".xvix",
	".raw",
	".bin",
]);

export const dicomFirstFrameHeaderReadLimit = 4 * 1024 * 1024;
export const dicomFirstFramePixelReadLimit = 32 * 1024 * 1024;

export const dicomMetadataTags = new Set([
	"00100010", // PatientName
	"00080060", // Modality
	"0020000d", // StudyInstanceUID
	"0020000e", // SeriesInstanceUID
	"00080018", // SOPInstanceUID
	"00081030", // StudyDescription
	"0008103e", // SeriesDescription
	"00200013", // InstanceNumber
	"00280010", // Rows
	"00280011", // Columns
	"00280100", // BitsAllocated
	"00280002", // SamplesPerPixel
	"00080020", // StudyDate
	"00080022", // AcquisitionDate
]);

export interface DicomHeaderMetadata {
	patientName: string | null;
	modality: string | null;
	studyInstanceUid: string | null;
	seriesInstanceUid: string | null;
	sopInstanceUid: string | null;
	studyDescription: string | null;
	seriesDescription: string | null;
	instanceNumber: number | null;
	imageRows: number | null;
	imageColumns: number | null;
	bitsAllocated: number | null;
	samplesPerPixel: number | null;
	estimatedPixelBytes: number | null;
	capturedAt: string | null;
	tagsRead: number;
	transferSyntaxUid: string | null;
	warnings: string[];
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
	pixelDataOffset: number;
	pixelDataLength: number;
	warnings: string[];
	isCompressed?: boolean;
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
	imageDataUrl: string | null;
	width: number | null;
	height: number | null;
	previewGrayRange?: number;
	previewGrayMean?: number;
	warnings: string[];
	nextAction: string;
};

export interface ApiDicomScanOptions {
	signal?: AbortSignal;
}

export interface ApiDicomScanYieldState {
	processedCount: number;
	lastYieldAt: number;
}

export function createApiDicomScanYieldState(): ApiDicomScanYieldState {
	return {
		processedCount: 0,
		lastYieldAt: Date.now(),
	};
}

export async function maybeYieldApiDicomScan(
	yieldState: ApiDicomScanYieldState,
	options: ApiDicomScanOptions = {},
	stride = 32,
	maxIntervalMs = 25,
) {
	if (options.signal?.aborted) {
		throw options.signal.reason ?? new Error("DICOM scan aborted");
	}
	yieldState.processedCount += 1;
	const now = Date.now();
	if (
		yieldState.processedCount % stride === 0 ||
		now - yieldState.lastYieldAt >= maxIntervalMs
	) {
		yieldState.lastYieldAt = now;
		await yieldImmediate();
		if (options.signal?.aborted) {
			throw options.signal.reason ?? new Error("DICOM scan aborted");
		}
	}
}

export const headerAliases: Record<string, string> = {
	"patient name": "patientName",
	patient: "patientName",
	пациент: "patientName",
	фио: "patientName",
	"фио пациента": "patientName",
	phone: "phone",
	телефон: "phone",
	"номер телефона": "phone",
	kind: "kind",
	тип: "kind",
	"тип снимка": "kind",
	вид: "kind",
	"вид снимка": "kind",
	tooth: "toothCode",
	зуб: "toothCode",
	"номер зуба": "toothCode",
	region: "region",
	область: "region",
	сегмент: "region",
	date: "capturedAt",
	дата: "capturedAt",
	"дата снимка": "capturedAt",
	capturedat: "capturedAt",
	title: "title",
	название: "title",
	описание: "title",
	path: "filePath",
	file: "filePath",
	файл: "filePath",
	"путь к файлу": "filePath",
	"dicom файл": "filePath",
	source: "sourceName",
	источник: "sourceName",
	"название источника": "sourceName",
};

export const dicomHeaderAliases: Record<string, string> = {
	...headerAliases,
	studyinstanceuid: "studyInstanceUid",
	"study instance uid": "studyInstanceUid",
	"study uid": "studyInstanceUid",
	seriesinstanceuid: "seriesInstanceUid",
	"series instance uid": "seriesInstanceUid",
	"series uid": "seriesInstanceUid",
	sopinstanceuid: "sopInstanceUid",
	"sop instance uid": "sopInstanceUid",
	"sop uid": "sopInstanceUid",
	instancenumber: "instanceNumber",
	"instance number": "instanceNumber",
	"slice number": "instanceNumber",
	срез: "instanceNumber",
	"номер среза": "instanceNumber",
	modality: "modality",
	модальность: "modality",
	"study description": "studyDescription",
	"описание исследования": "studyDescription",
	"series description": "seriesDescription",
	"описание серии": "seriesDescription",
	imagerows: "imageRows",
	"image rows": "imageRows",
	строк: "imageRows",
	imagecolumns: "imageColumns",
	"image columns": "imageColumns",
	колонок: "imageColumns",
	bitsallocated: "bitsAllocated",
	"bits allocated": "bitsAllocated",
	бит: "bitsAllocated",
	"бит на пиксель": "bitsAllocated",
	samplesperpixel: "samplesPerPixel",
	"samples per pixel": "samplesPerPixel",
	компонент: "samplesPerPixel",
	filesizebytes: "fileSizeBytes",
	"file size bytes": "fileSizeBytes",
	размер: "fileSizeBytes",
	"размер файла": "fileSizeBytes",
};

export const kindSynonyms: Array<[RegExp, ImagingStudyKind]> = [
	[/cbct|клкт|кт|cone\s*beam/i, "cbct"],
	[/panoramic|opg|оптг|панорам/i, "opg"],
	[/teleradiography|ceph|трг|телерентген/i, "ceph"],
	[/periapical|intraoral|прицельн|интраоральн|rvg/i, "periapical"],
	[/photo|фото|портрет/i, "photo"],
	[/stl|3d\s*model|скан|слепок/i, "other"],
];

export const kindLabels: Record<ImagingStudyKind, string> = {
	cbct: "КЛКТ",
	opg: "ОПТГ",
	ceph: "ТРГ",
	periapical: "Прицельный снимок",
	bitewing: "Интраоральный снимок",
	photo: "Фотопротокол",
	other: "Другое",
};

export function normalizeHeader(value: string) {
	return value
		.trim()
		.toLowerCase()
		.replaceAll("_", " ")
		.replaceAll("-", " ")
		.replace(/\s+/g, " ");
}

export function detectDelimiter(headerLine: string) {
	const candidates = [";", ",", "\t", "|"];
	return (
		candidates
			.map((delimiter) => ({
				delimiter,
				count: headerLine.split(delimiter).length,
			}))
			.sort((left, right) => right.count - left.count)[0]?.delimiter ?? ";"
	);
}

export function normalizePhone(value: string | null) {
	if (!value) return null;
	const digits = value.replace(/\D/g, "");
	if (!digits) return null;
	if (digits.length === 10) return `+7${digits}`;
	if (digits.length === 11 && digits.startsWith("8"))
		return `+7${digits.slice(1)}`;
	if (digits.length === 11 && digits.startsWith("7")) return `+${digits}`;
	return value.trim();
}

export function detectKind(value: string | null): ImagingStudyKind | null {
	if (!value) return null;
	return kindSynonyms.find(([pattern]) => pattern.test(value))?.[1] ?? null;
}

export function detectSourceKind(
	value: string | null,
	fallback: ImagingSourceKind,
): ImagingSourceKind {
	const text = value ?? "";
	if (/dicomweb|qido|wado/i.test(text)) return "dicomweb";
	if (/pacs|orthanc|dcm4chee/i.test(text)) return "pacs";
	if (fallback === "dicomweb" || fallback === "pacs") return fallback;
	if (/twain|wia/i.test(text)) return "twain_wia";
	if (
		/sensor|rvg|ezsensor|carestream|vatech|sopro|xios|schick|kodak|vistascan/i.test(
			text,
		)
	)
		return "sensor_bridge";
	if (
		/sidexis|romexis|dtx|ondemand|invivo|ezdent|cliniview|clini view|dbswin|vistasoft|weasis|radiant|ohif|\.dcm|\.ima|\.zip|\.7z|\.rar|DICOMDIR|dicom/i.test(
			text,
		)
	) {
		return "dicom_file";
	}
	if (/watch|folder|папк/i.test(text)) return "folder_watch";
	return fallback;
}

export function extractFilePath(value: string) {
	const virtualArchivePath = value.match(
		/[A-Za-zА-Яа-яЁё]:[\\/][^;|\n]+?\.(?:zip)::[^;|\n]+?\.(?:dcm|dicom|ima)\b|\\\\[^;|\n]+?\.(?:zip)::[^;|\n]+?\.(?:dcm|dicom|ima)\b|\/[^;|\n]+?\.(?:zip)::[^;|\n]+?\.(?:dcm|dicom|ima)\b/i,
	)?.[0];
	if (virtualArchivePath) return virtualArchivePath.trim();

	const absolutePath = value.match(
		/[A-Za-zА-Яа-яЁё]:[\\/][^;|\n,]+?(?:\.(?:dcm|dicom|ima|jpg|jpeg|png|tif|tiff|bmp|webp|zip|7z|rar)\b|[\\/]DICOMDIR\b)|\\\\[^;|\n,]+?(?:\.(?:dcm|dicom|ima|jpg|jpeg|png|tif|tiff|bmp|webp|zip|7z|rar)\b|[\\/]DICOMDIR\b)|\/[^;|\n,]+?(?:\.(?:dcm|dicom|ima|jpg|jpeg|png|tif|tiff|bmp|webp|zip|7z|rar)\b|\/DICOMDIR\b)/i,
	)?.[0];
	if (absolutePath) return absolutePath.trim();

	return (
		value.match(
			/\b[^\s;|,]+\.(?:dcm|dicom|ima|jpg|jpeg|png|tif|tiff|bmp|webp|zip|7z|rar)\b|\bDICOMDIR\b/i,
		)?.[0] ?? null
	);
}

export function extractTooth(value: string) {
	return value.match(/\b(?:1[1-8]|2[1-8]|3[1-8]|4[1-8])\b/)?.[0] ?? null;
}

export function extractPhone(value: string) {
	return normalizePhone(
		value.match(
			/(?:\+7|7|8)?[\s(.-]*\d{3}[\s). -]*\d{3}[\s.-]*\d{2}[\s.-]*\d{2}/,
		)?.[0] ?? null,
	);
}

export function normalizeDicomUid(value: string | null | undefined) {
	if (!value) return null;
	const uid = value.trim().match(/\b\d+(?:\.\d+){2,}\b/)?.[0] ?? null;
	return uid && uid.length <= 96 ? uid : null;
}

const dicomUidPatternCache = new Map<string, RegExp>();

export function extractDicomUid(value: string, labels: string[]) {
	for (const label of labels) {
		let pattern = dicomUidPatternCache.get(label);
		if (!pattern) {
			pattern = new RegExp(`${label}\\s*[:=]\\s*(\\d+(?:\\.\\d+){2,})`, "i");
			dicomUidPatternCache.set(label, pattern);
		}
		const match = pattern.exec(value);
		if (match?.[1]) return normalizeDicomUid(match[1]);
	}
	return null;
}

export function normalizeModality(value: string | null | undefined) {
	if (!value) return null;
	const normalized = value.trim().toUpperCase();
	if (/CBCT|КЛКТ|ККТ/.test(normalized)) return "CBCT";
	if (/\bCT\b|КТ/.test(normalized)) return "CT";
	if (/\bDX\b|DIGITAL RADIOGRAPHY/.test(normalized)) return "DX";
	if (/\bCR\b/.test(normalized)) return "CR";
	if (/\bPX\b|PAN|OPG|ОПТГ|ОРТОПАН/.test(normalized)) return "PX";
	if (/CEPH|TRG|ТРГ|ТЕЛЕРЕНТГ/.test(normalized)) return "CEPH";
	if (/\bIO\b|RVG|ПРИЦЕЛ/.test(normalized)) return "IO";
	if (/\bMR\b/.test(normalized)) return "MR";
	if (/\bUS\b/.test(normalized)) return "US";
	return normalized.slice(0, 24);
}

export function modalityToKind(
	modality: string | null,
	text: string | null,
): ImagingStudyKind | null {
	const detected = detectKind(text);
	if (detected) return detected;
	if (!modality) return null;
	if (modality === "CBCT" || modality === "CT" || modality === "MR")
		return "cbct";
	if (modality === "PX") return "opg";
	if (modality === "CEPH") return "ceph";
	if (modality === "DX" || modality === "CR" || modality === "IO")
		return "periapical";
	return null;
}

export function parseInstanceNumber(value: string | null | undefined) {
	if (!value) return null;
	const explicit = value.match(
		/(?:instance|slice|image|срез|кадр|номер)\D{0,12}(\d{1,6})/i,
	)?.[1];
	const fallback = value.match(
		/\b(\d{1,6})(?:\.(?:dcm|dicom|ima|jpg|jpeg|png|tif|tiff|bmp|webp))$/i,
	)?.[1];
	const parsed = Number(explicit ?? fallback ?? value.trim());
	return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

export function parsePositiveInteger(value: string | null | undefined) {
	if (!value) return null;
	const parsed = Number(value.trim());
	return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

const dicomFieldValuePatternCache = new Map<string, RegExp>();

export function extractDicomFieldValue(line: string, labels: string[]) {
	for (const label of labels) {
		let pattern = dicomFieldValuePatternCache.get(label);
		if (!pattern) {
			pattern = new RegExp(`${label}\\s*[:=]\\s*([^;|,]+)`, "i");
			dicomFieldValuePatternCache.set(label, pattern);
		}
		const match = pattern.exec(line);
		if (match?.[1]) return match[1].trim();
	}
	return null;
}

export function matchPatient(
	patients: Awaited<ReturnType<typeof getPatientsFromDb>>,
	patientName: string | null,
	phone: string | null,
): {
	patient: Awaited<ReturnType<typeof getPatientsFromDb>>[number] | null;
	ambiguous: boolean;
	weakMatch: boolean;
} {
	if (phone) {
		const byPhone = patients.filter((p) => normalizePhone(p.phone) === phone);
		if (byPhone.length === 1)
			return { patient: byPhone[0] ?? null, ambiguous: false, weakMatch: false };
		if (byPhone.length > 1) {
			if (patientName) {
				const cleaned = patientName.trim().toLowerCase();
				const byBoth = byPhone.filter(
					(p) => p.fullName.trim().toLowerCase() === cleaned,
				);
				if (byBoth.length === 1)
					return {
						patient: byBoth[0] ?? null,
						ambiguous: false,
						weakMatch: false,
					};
			}
			return { patient: null, ambiguous: true, weakMatch: false };
		}
	}

	if (patientName) {
		const cleaned = patientName.trim().toLowerCase();
		const byName = patients.filter(
			(p) => p.fullName.trim().toLowerCase() === cleaned,
		);
		if (byName.length === 1)
			return { patient: byName[0] ?? null, ambiguous: false, weakMatch: true };
		if (byName.length > 1)
			return { patient: null, ambiguous: true, weakMatch: true };
	}

	return { patient: null, ambiguous: false, weakMatch: false };
}

export function isDicomArchivePath(filePath: string | null): boolean {
	if (!filePath) return false;
	const cleanPath = filePath.split("::")[0] ?? filePath;
	return dicomArchiveExtensions.has(path.extname(cleanPath).toLowerCase());
}

export function isDicomArchiveVirtualEntryPath(
	filePath: string | null,
): boolean {
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
	} catch (err) {
		console.error("[Dente] Failed to read DICOM header:", err);
		return false;
	}
}

export function isDicomHeaderCandidatePath(filePath: string): boolean {
	if (isDicomPixelPath(filePath) || isZipArchivePath(filePath)) return true;
	const extension = path.extname(filePath).toLowerCase();
	if (extension && extension.length > 1) return false;
	return hasDicomMagic(filePath);
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
	else if (value) {
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

export function buildPngChunk(type: string, data: Buffer) {
	const typeBuffer = Buffer.from(type, "ascii");
	const length = Buffer.alloc(4);
	length.writeUInt32BE(data.length, 0);
	const crc = Buffer.alloc(4);
	crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
	return Buffer.concat([length, typeBuffer, data, crc]);
}

let pngCrcTable: Uint32Array | null = null;

export function crc32(buffer: Buffer) {
	if (!pngCrcTable) {
		pngCrcTable = new Uint32Array(256);
		for (let index = 0; index < 256; index += 1) {
			let value = index;
			for (let bit = 0; bit < 8; bit += 1) {
				value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
			}
			pngCrcTable[index] = value >>> 0;
		}
	}

	let crc = 0xffffffff;
	const table = pngCrcTable;
	for (const byte of buffer) {
		const lookup = table[(crc ^ byte) & 0xff] ?? 0;
		crc = lookup ^ (crc >>> 8);
	}
	return (crc ^ 0xffffffff) >>> 0;
}

export function rgbaToPngDataUrl(
	width: number,
	height: number,
	rgba: Buffer,
) {
	const signature = Buffer.from([
		0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
	]);
	const ihdr = Buffer.alloc(13);
	ihdr.writeUInt32BE(width, 0);
	ihdr.writeUInt32BE(height, 4);
	ihdr[8] = 8;
	ihdr[9] = 6;
	ihdr[10] = 0;
	ihdr[11] = 0;
	ihdr[12] = 0;

	const stride = width * 4;
	const raw = Buffer.alloc((stride + 1) * height);
	for (let y = 0; y < height; y += 1) {
		raw[y * (stride + 1)] = 0;
		rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
	}

	const png = Buffer.concat([
		signature,
		buildPngChunk("IHDR", ihdr),
		buildPngChunk("IDAT", deflateSync(raw)),
		buildPngChunk("IEND", Buffer.alloc(0)),
	]);
	return `data:image/png;base64,${png.toString("base64")}`;
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
): (index: number) => number {
	return (index: number) => {
		const offset = pixelDataOffset + index * bytesPerPixel;
		const raw =
			bitsAllocated === 16
				? pixelRepresentation === 1
					? buffer.readInt16LE(offset)
					: buffer.readUInt16LE(offset)
				: pixelRepresentation === 1
					? buffer.readInt8(offset)
					: buffer.readUInt8(offset);
		return raw * rescaleSlope + rescaleIntercept;
	};
}

export function renderDicomPreviewImage(
	buffer: Buffer,
	metadata: DicomImageMetadata,
	maxPreviewEdge: number,
): {
	imageDataUrl: string;
	width: number;
	height: number;
	grayRange: number;
	grayMean: number;
	finalCenter: number;
	finalWindow: number;
	finalWarnings: string[];
} {
	const warnings = [...metadata.warnings];
	const {
		rows,
		columns,
		bitsAllocated,
		pixelRepresentation,
		rescaleIntercept,
		rescaleSlope,
		pixelDataOffset,
		windowCenter,
		windowWidth,
		photometricInterpretation,
	} = metadata;

	const r = rows as number;
	const c = columns as number;

	const scale = Math.min(1, maxPreviewEdge / Math.max(r, c));
	const width = Math.max(1, Math.round(c * scale));
	const height = Math.max(1, Math.round(r * scale));
	const bytesPerPixel = (bitsAllocated as number) / 8;
	const invert = photometricInterpretation === "MONOCHROME1";

	const sampleValue = createDicomPixelSampler(
		buffer,
		pixelDataOffset,
		bytesPerPixel,
		bitsAllocated as number,
		pixelRepresentation,
		rescaleSlope,
		rescaleIntercept,
	);

	let minValue = Number.POSITIVE_INFINITY;
	let maxValue = Number.NEGATIVE_INFINITY;
	const sampleStep = Math.max(1, Math.floor((r * c) / 250_000));
	for (let index = 0; index < r * c; index += sampleStep) {
		const value = sampleValue(index);
		if (value < minValue) minValue = value;
		if (value > maxValue) maxValue = value;
	}

	let center = windowCenter ?? (minValue + maxValue) / 2;
	let window =
		windowWidth && windowWidth > 1
			? windowWidth
			: Math.max(1, maxValue - minValue);

	let rendered = buildDicomPreviewRgba(
		width,
		height,
		r,
		c,
		invert,
		sampleValue,
		center,
		window,
	);
	if (
		windowCenter &&
		windowWidth &&
		maxValue > minValue &&
		(rendered.grayMax - rendered.grayMin < 24 ||
			rendered.grayMean < 8 ||
			rendered.grayMean > 247)
	) {
		center = (minValue + maxValue) / 2;
		window = Math.max(1, maxValue - minValue);
		rendered = buildDicomPreviewRgba(
			width,
			height,
			r,
			c,
			invert,
			sampleValue,
			center,
			window,
		);
		warnings.push(
			"Окно снимка дало низкоконтрастный предпросмотр; использовано min/max окно по выборке.",
		);
	}

	if (scale < 1)
		warnings.push(`Предпросмотр уменьшен с ${c}x${r} до ${width}x${height}.`);
	if (!windowCenter || !windowWidth)
		warnings.push(
			"Окно яркости/контраста отсутствовало; предпросмотр использовал min/max окно по выборке.",
		);

	return {
		imageDataUrl: rgbaToPngDataUrl(width, height, rendered.rgba),
		width,
		height,
		grayRange: rendered.grayMax - rendered.grayMin,
		grayMean: rendered.grayMean,
		finalCenter: center,
		finalWindow: window,
		finalWarnings: warnings,
	};
}

export function parseDicomFirstFramePixel(
	buffer: Buffer,
	maxPreviewEdge: number,
): DicomFirstFramePixelParse {
	const metadata = extractDicomMetadata(buffer, []);
	if (!metadata) {
		return {
			status: "unsupported",
			transferSyntaxUid: null,
			photometricInterpretation: null,
			sourceWidth: null,
			sourceHeight: null,
			bitsAllocated: null,
			bitsStored: null,
			pixelRepresentation: null,
			windowCenter: null,
			windowWidth: null,
			imageDataUrl: null,
			width: null,
			height: null,
			warnings: ["Кадр снимка не найден в быстром предпросмотре."],
			nextAction:
				"Оставьте список серии или используйте отдельный КТ-просмотрщик.",
		};
	}

	if (metadata.isCompressed) {
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
			imageDataUrl: null,
			width: null,
			height: null,
			warnings: [
				...metadata.warnings,
				"Сжатый формат снимка не поддерживается быстрым предпросмотром.",
			],
			nextAction:
				"Откройте снимок через внешний КТ-модуль или локальный обработчик.",
		};
	}

	if (
		!metadata.pixelDataOffset ||
		metadata.pixelDataOffset < 0 ||
		metadata.pixelDataLength <= 0
	) {
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
			imageDataUrl: null,
			width: null,
			height: null,
			warnings: [
				...metadata.warnings,
				"Кадр снимка не найден в быстром предпросмотре.",
			],
			nextAction:
				"Оставьте список серии или используйте отдельный КТ-просмотрщик.",
		};
	}

	if (
		!dicomTransferSyntaxIsSupported(metadata.transferSyntaxUid) ||
		metadata.bigEndian
	) {
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
			imageDataUrl: null,
			width: null,
			height: null,
			warnings: [
				...metadata.warnings,
				"Формат файла снимка не поддерживается быстрым предпросмотром.",
			],
			nextAction:
				"Откройте снимок через внешний КТ-модуль или локальный обработчик для этого формата.",
		};
	}

	const normalizedPhotometric =
		metadata.photometricInterpretation ?? "MONOCHROME2";
	metadata.photometricInterpretation = normalizedPhotometric;

	if (
		!metadata.rows ||
		!metadata.columns ||
		metadata.rows <= 0 ||
		metadata.columns <= 0 ||
		metadata.rows > 8192 ||
		metadata.columns > 8192
	) {
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
			imageDataUrl: null,
			width: null,
			height: null,
			warnings: [
				...metadata.warnings,
				"Размер кадра не указан или слишком велик для быстрого предпросмотра.",
			],
			nextAction:
				"Откройте отдельный КТ-просмотрщик для такого размера изображения.",
		};
	}

	if (
		(metadata.samplesPerPixel ?? 1) !== 1 ||
		!["MONOCHROME1", "MONOCHROME2"].includes(normalizedPhotometric)
	) {
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
			imageDataUrl: null,
			width: null,
			height: null,
			warnings: [
				...metadata.warnings,
				"Быстрый предпросмотр открывает только серые стоматологические снимки.",
			],
			nextAction:
				"Откройте этот файл в полном просмотрщике: формат нестандартный для быстрого предпросмотра.",
		};
	}

	if (metadata.bitsAllocated !== 8 && metadata.bitsAllocated !== 16) {
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
			imageDataUrl: null,
			width: null,
			height: null,
			warnings: [
				...metadata.warnings,
				"Глубина изображения не поддерживается быстрым предпросмотром.",
			],
			nextAction: "Откройте этот файл в полном просмотрщике снимков.",
		};
	}

	const bytesPerPixel = metadata.bitsAllocated / 8;
	const expectedBytes = metadata.rows * metadata.columns * bytesPerPixel;
	if (
		metadata.pixelDataLength < expectedBytes ||
		metadata.pixelDataOffset + expectedBytes > buffer.length
	) {
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
			imageDataUrl: null,
			width: null,
			height: null,
			warnings: [
				...metadata.warnings,
				"Данные первого кадра короче ожидаемого размера.",
			],
			nextAction:
				"Откройте полный КТ-просмотрщик: быстрый предпросмотр не может открыть этот кадр.",
		};
	}

	const result = renderDicomPreviewImage(buffer, metadata, maxPreviewEdge);

	return {
		status: "ready",
		transferSyntaxUid: metadata.transferSyntaxUid,
		photometricInterpretation: normalizedPhotometric,
		sourceWidth: metadata.columns,
		sourceHeight: metadata.rows,
		bitsAllocated: metadata.bitsAllocated,
		bitsStored: metadata.bitsStored,
		pixelRepresentation: metadata.pixelRepresentation,
		windowCenter: result.finalCenter,
		windowWidth: result.finalWindow,
		imageDataUrl: result.imageDataUrl,
		width: result.width,
		height: result.height,
		previewGrayRange: result.grayRange,
		previewGrayMean: result.grayMean,
		warnings: result.finalWarnings,
		nextAction:
			"Используйте это только как быстрый ориентировочный предпросмотр; для диагностики нужен просмотрщик КТ-срезов.",
	};
}

export function parseManifestLine(
	patients: Awaited<ReturnType<typeof getPatientsFromDb>>,
	line: string,
	rowNumber: number,
	sourceKind: ImagingSourceKind,
	sourceName: string,
): ImagingImportPreviewRow {
	const rawPath = extractFilePath(line);
	const phone = extractPhone(line);
	const tooth = extractTooth(line);
	const kind = detectKind(rawPath ?? line);
	const detectedSource = detectSourceKind(rawPath ?? line, sourceKind);

	const withoutExt = (rawPath ?? line)
		.replace(/\.(?:dcm|dicom|ima|jpg|jpeg|png|tif|tiff|bmp|webp|zip|7z|rar)$/i, "")
		.replace(/[\\/]/g, " ")
		.replace(/[_\-;,|]/g, " ")
		.replace(/\s+/g, " ")
		.trim();

	const patientCandidate =
		withoutExt.length > 3 && !/^\d+$/.test(withoutExt) ? withoutExt : null;

	const { patient, ambiguous, weakMatch } = matchPatient(
		patients,
		patientCandidate,
		phone,
	);

	const warnings: string[] = [];
	if (ambiguous)
		warnings.push(
			"Найдено несколько пациентов с такими данными — выберите нужного вручную",
		);
	else if (!patient)
		warnings.push("Пациент не найден, нужно сопоставление");
	else if (weakMatch)
		warnings.push(
			"Пациент сопоставлен только по ФИО, телефон не указан — проверьте сопоставление",
		);

	if (!kind) warnings.push("Тип снимка не определен");
	if (!rawPath) warnings.push("Путь к файлу снимка не найден");

	const status =
		!rawPath || !kind || ambiguous
			? "blocked"
			: patient
				? "ready"
				: "warning";

	return {
		rowNumber,
		patientName: patient?.fullName ?? patientCandidate,
		phone: patient?.phone ?? phone,
		patientId: patient?.id ?? null,
		kind,
		toothCode: tooth,
		region: null,
		capturedAt: null,
		title: kind ? kindLabels[kind] : null,
		filePath: rawPath,
		sourceKind: detectedSource,
		sourceName,
		status,
		warnings,
	};
}

export async function parseImagingManifest(
	orgIdOrInput:
		| { sourceName?: string; sourceKind?: ImagingSourceKind; rawText?: string }
		| string,
	maybeInput?:
		| { sourceName?: string; sourceKind?: ImagingSourceKind; rawText?: string }
		| string,
) {
	const orgId =
		typeof orgIdOrInput === "string" && maybeInput ? orgIdOrInput : "default";
	const input =
		typeof orgIdOrInput === "object"
			? orgIdOrInput
			: (maybeInput ?? orgIdOrInput);
	const rawText = typeof input === "string" ? input : (input?.rawText ?? "");
	const sourceName =
		typeof input === "string" ? "Manifest" : (input?.sourceName ?? "Manifest");
	const sourceKind =
		typeof input === "string"
			? "folder_watch"
			: (input?.sourceKind ?? "folder_watch");
	const lines = rawText
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean);
	if (!lines.length) {
		return imagingImportPreviewResponseSchema.parse({
			sourceName,
			sourceKind,
			totalRows: 0,
			readyRows: 0,
			warningRows: 0,
			blockedRows: 0,
			rows: [],
			parserNotes: ["Нет строк для разбора."],
		});
	}

	const delimiter = detectDelimiter(lines[0] ?? "");
	const headers = splitLine(lines[0] ?? "", delimiter).map(
		(cell) => headerAliases[normalizeHeader(cell)] ?? null,
	);
	const patients = await getPatientsFromDb(orgId);
	const hasHeader = headers.some(Boolean);
	const rows: ImagingImportPreviewRow[] = await Promise.all(
		(hasHeader ? lines.slice(1) : lines).map(async (line, index) => {
			if (!hasHeader)
				return parseManifestLine(
					patients,
					line,
					index + 1,
					sourceKind,
					sourceName,
				);
			const cells = splitLine(line, delimiter);
			const draft: Partial<ImagingImportPreviewRow> = {
				rowNumber: index + 2,
				sourceKind: sourceKind,
				sourceName: sourceName,
				warnings: [],
			};
			headers.forEach((field, cellIndex) => {
				if (!field) return;
				const value = cells[cellIndex]?.trim() || null;
				if (field === "phone") draft.phone = normalizePhone(value);
				else if (field === "kind") draft.kind = detectKind(value);
				else if (field === "capturedAt")
					draft.capturedAt = normalizeDate(value);
				else draft[field as keyof ImagingImportPreviewRow] = value as never;
			});
			const { patient, ambiguous, weakMatch } = matchPatient(
				patients,
				draft.patientName ?? null,
				draft.phone ?? null,
			);
			const kind = draft.kind ?? detectKind(draft.filePath ?? "");
			const source = detectSourceKind(
				draft.filePath ?? draft.sourceName ?? "",
				sourceKind,
			);
			const warnings: string[] = [];
			if (ambiguous)
				warnings.push(
					"Найдено несколько пациентов с такими данными — выберите нужного вручную",
				);
			else if (!patient)
				warnings.push("Пациент не найден, нужно сопоставление");
			else if (weakMatch)
				warnings.push(
					"Пациент сопоставлен только по ФИО, телефон не указан — проверьте сопоставление",
				);
			if (!kind) warnings.push("Тип снимка не определен");
			if (!draft.filePath) warnings.push("Путь к файлу снимка не найден");

			const status =
				!draft.filePath || !kind || ambiguous
					? "blocked"
					: patient
						? "ready"
						: "warning";

			return {
				rowNumber: draft.rowNumber ?? index + 2,
				patientName: patient?.fullName ?? draft.patientName ?? null,
				phone: patient?.phone ?? draft.phone ?? null,
				patientId: patient?.id ?? null,
				kind,
				toothCode: draft.toothCode ?? null,
				region: draft.region ?? null,
				capturedAt: draft.capturedAt ?? null,
				title: draft.title ?? (kind ? kindLabels[kind] : null),
				filePath: draft.filePath ?? null,
				sourceKind: source,
				sourceName: draft.sourceName ?? sourceName,
				status,
				warnings,
			};
		}),
	);

	return imagingImportPreviewResponseSchema.parse({
		sourceName,
		sourceKind,
		totalRows: rows.length,
		readyRows: rows.filter((row) => row.status === "ready").length,
		warningRows: rows.filter((row) => row.status === "warning").length,
		blockedRows: rows.filter((row) => row.status === "blocked").length,
		rows,
		parserNotes: hasHeader
			? ["Использован заголовок таблицы манифеста."]
			: ["Заголовок не распознан, использован эвристический разбор строк."],
	});
}

export async function parseDicomSeriesManifest(
	orgId: string,
	input: { sourceName: string; sourceKind: ImagingSourceKind; rawText: string },
) {
	const sourceLines = input.rawText
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean);

	if (!sourceLines.length) {
		return dicomSeriesPreviewResponseSchema.parse({
			sourceName: input.sourceName,
			sourceKind: input.sourceKind,
			totalRows: 0,
			totalSeries: 0,
			readySeries: 0,
			warningSeries: 0,
			blockedSeries: 0,
			rows: [],
			series: [],
			parserNotes: ["Нет строк списка снимков для разбора."],
		});
	}

	const delimiter = detectDelimiter(sourceLines[0] ?? "");
	const headers = splitLine(sourceLines[0] ?? "", delimiter).map(
		(cell) => dicomHeaderAliases[normalizeHeader(cell)] ?? null,
	);
	const patients = await getPatientsFromDb(orgId);
	const hasHeader = headers.some(Boolean);

	const rows = (hasHeader ? sourceLines.slice(1) : sourceLines).map(
		(line, index) => {
			const base = parseManifestLine(
				patients,
				line,
				index + (hasHeader ? 2 : 1),
				input.sourceKind,
				input.sourceName,
			);
			return {
				...base,
				modality: normalizeModality(extractDicomFieldValue(line, ["modality", "модальность"])),
				studyInstanceUid: extractDicomUid(line, ["studyInstanceUid", "study", "studyuid"]),
				seriesInstanceUid: extractDicomUid(line, ["seriesInstanceUid", "series", "seriesuid"]),
				sopInstanceUid: extractDicomUid(line, ["sopInstanceUid", "sop", "sopuid"]),
				instanceNumber: parseInstanceNumber(extractDicomFieldValue(line, ["instanceNumber", "slice", "срез"])),
				studyDescription: null,
				seriesDescription: null,
				imageRows: null,
				imageColumns: null,
				bitsAllocated: null,
				samplesPerPixel: null,
				fileSizeBytes: null,
				estimatedPixelBytes: null,
			};
		},
	) as DicomSeriesPreviewRow[];

	return dicomSeriesPreviewResponseSchema.parse({
		sourceName: input.sourceName,
		sourceKind: input.sourceKind,
		totalRows: rows.length,
		totalSeries: rows.length,
		readySeries: rows.filter((r) => r.status === "ready").length,
		warningSeries: rows.filter((r) => r.status === "warning").length,
		blockedSeries: rows.filter((r) => r.status === "blocked").length,
		rows,
		series: [],
		parserNotes: hasHeader
			? ["Использован заголовок таблицы DICOM-манифеста."]
			: ["Заголовок не распознан, использован эвристический разбор строк."],
	});
}

export async function commitImagingImport(
	orgId: string,
	input: { sourceName: string; sourceKind: ImagingSourceKind; rawText: string },
) {
	const preview = await parseImagingManifest(orgId, input);
	const readyRows = preview.rows.filter(
		(row) =>
			row.status === "ready" && row.patientId && row.kind && row.filePath,
	);
	const createdStudyIds = await Promise.all(
		readyRows.map(async (row) => {
			const study = await createImagingStudyInDb(orgId, {
				// biome-ignore lint/style/noNonNullAssertion: guaranteed by filter
				patientId: row.patientId!,
				// biome-ignore lint/style/noNonNullAssertion: guaranteed by filter
				kind: row.kind!,
				// biome-ignore lint/style/noNonNullAssertion: guaranteed by filter
				title: row.title ?? kindLabels[row.kind!],
				toothCode: row.toothCode,
				region: row.region,
				sourceKind: row.sourceKind,
				sourceName: row.sourceName,
				storagePath: row.filePath,
				capturedAt: row.capturedAt ?? undefined,
			});
			return study.id;
		}),
	);

	return imagingImportCommitResponseSchema.parse({
		sourceName: input.sourceName,
		sourceKind: input.sourceKind,
		importedCount: createdStudyIds.length,
		skippedCount: preview.totalRows - createdStudyIds.length,
		createdStudyIds,
		preview,
	});
}

/**
 * Объектный интерфейс доменного сервиса DicomProcessorService.
 */
export class DicomProcessorService {
	static parseHeader = parseDicomHeader;
	static extractMetadata = extractDicomMetadata;
	static parseFirstFramePixel = parseDicomFirstFramePixel;
	static renderPreview = renderDicomPreviewImage;
	static parseManifest = parseImagingManifest;
	static parseSeriesManifest = parseDicomSeriesManifest;
	static commitImport = commitImagingImport;
	static isDicomPath = isDicomHeaderCandidatePath;
	static isDicomArchive = isDicomArchivePath;
	static normalizeUid = normalizeDicomUid;
	static normalizeModality = normalizeModality;
}
