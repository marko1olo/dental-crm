import { once } from "node:events";
import { closeSync, openSync, readSync, type Stats, statSync } from "node:fs";
import { type FileHandle, open, opendir, stat } from "node:fs/promises";
import path from "node:path";
import { setImmediate as yieldImmediate } from "node:timers/promises";
import { createInflateRaw, deflateSync } from "node:zlib";
import {
	type DicomFirstFramePreviewResponse,
	type DicomSeriesPreviewGroup,
	type DicomSeriesPreviewRow,
	type DicomSeriesViewer,
	dicomFirstFramePreviewResponseSchema,
	dicomSeriesPreviewResponseSchema,
	type ImagingImportPreviewRow,
	type ImagingSourceKind,
	type ImagingStudyKind,
	normalizeDate,
	splitLine,
} from "@dental/shared";
import { getPatientsFromDb } from "../../db/patientsQuery.js";
import {
	buildMprReadiness,
	dicomPixelFileExtensions,
	isDicomArchivePath,
	isDicomPixelPath,
} from "../../modules/imaging/hardwarePlanner.js";

export const kindLabels = {
	periapical: "Прицельный",
	bitewing: "Интерпроксимальный снимок",
	opg: "ОПТГ",
	ceph: "ТРГ / цефалометрия",
	cbct: "КЛКТ / КТ",
	photo: "Фото",
	other: "Снимок",
} as const;
export type ApiDicomScanOptions = {
	signal?: AbortSignal;
};
export type ApiDicomFolderTraversalLimits = {
	maxFolders?: number;
	maxEntriesPerFolder?: number;
};
export type ApiDicomScanYieldState = {
	units: number;
	lastYieldAtMs: number;
};
export const apiDicomScanYieldEveryUnits = 64;
export const apiDicomScanYieldEveryMs = 20;
export const apiDicomDefaultMaxFolders = 900;
export const apiDicomDefaultMaxEntriesPerFolder = 2000;
export const apiDicomScanAbortErrorName = "AbortError";
export const apiDicomScanAbortMessage =
	"Сканирование локальных снимков остановлено: клиент закрыл запрос или отменил действие.";
export function createApiDicomScanYieldState(): ApiDicomScanYieldState {
	return { units: 0, lastYieldAtMs: Date.now() };
}
export function throwIfApiDicomScanAborted(signal?: AbortSignal) {
	if (!signal?.aborted) return;
	const error = new Error(apiDicomScanAbortMessage);
	error.name = apiDicomScanAbortErrorName;
	throw error;
}
export function isApiDicomScanAbortError(error: unknown) {
	if (error instanceof Error && error.name === apiDicomScanAbortErrorName)
		return true;
	if (error instanceof DOMException && error.name === "TimeoutError")
		return true;
	return false;
}
export async function maybeYieldApiDicomScan(
	state: ApiDicomScanYieldState,
	signal?: AbortSignal,
) {
	throwIfApiDicomScanAborted(signal);
	state.units += 1;
	const now = Date.now();
	if (
		state.units % apiDicomScanYieldEveryUnits !== 0 &&
		now - state.lastYieldAtMs < apiDicomScanYieldEveryMs
	)
		return;
	state.lastYieldAtMs = now;
	await yieldImmediate(undefined, { signal });
	throwIfApiDicomScanAborted(signal);
}
export const kindSynonyms: Array<[RegExp, ImagingStudyKind]> = [
	[/ceph|cephal|trg|teleradi|трг|телерентг|цеф/i, "ceph"],
	[/cbct|кт|ккт|dicom|3d/i, "cbct"],
	[/opg|ортопан|ортопантом|оптг|pan/i, "opg"],
	[/bite/i, "bitewing"],
	[/rvg|rvg|прицел|прицель|periap/i, "periapical"],
	[/photo|фото|camera/i, "photo"],
];
export const zipEntryPreviewLimit = 1500;
export const dicomZipMetadataEntryLimit = 500;
export const zipEntryMetadataCompressedReadLimit = 8 * 1024 * 1024;
export const zipEntryMetadataChunkBytes = 64 * 1024;
export const zipEocdSearchWindowBytes = 65_557;
export const zipCentralDirectoryReadLimit = 8 * 1024 * 1024;
export const dicomFirstFrameHeaderReadLimit = 8 * 1024 * 1024;
export const dicomFirstFramePixelReadLimit = 32 * 1024 * 1024;
export const dicomMetadataTags = new Set([
	"00080018",
	"00080020",
	"00080022",
	"00080060",
	"00081030",
	"0008103e",
	"00100010",
	"0020000d",
	"0020000e",
	"00200013",
	"00280002",
	"00280010",
	"00280011",
	"00280100",
]);
export type DicomHeaderMetadata = {
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
	isCompressed?: boolean;
};
export type ZipCentralDirectoryEntry = {
	name: string;
	compressionMethod: number;
	compressedSize: number;
	uncompressedSize: number;
	localHeaderOffset: number;
	encrypted: boolean;
};
export type ZipCentralDirectoryDetailedResult = {
	entries: ZipCentralDirectoryEntry[];
	warnings: string[];
	fileHandle: FileHandle | null;
};
export type DicomManifestField =
	| "patientName"
	| "phone"
	| "kind"
	| "modality"
	| "studyInstanceUid"
	| "seriesInstanceUid"
	| "sopInstanceUid"
	| "studyDescription"
	| "seriesDescription"
	| "instanceNumber"
	| "imageRows"
	| "imageColumns"
	| "bitsAllocated"
	| "samplesPerPixel"
	| "estimatedPixelBytes"
	| "capturedAt"
	| "filePath"
	| "sourceName";
export const dicomHeaderAliases: Record<string, DicomManifestField> = {
	fio: "patientName",
	fullname: "patientName",
	name: "patientName",
	patient: "patientName",
	"patient name": "patientName",
	patientname: "patientName",
	"0010 0010": "patientName",
	"(0010,0010)": "patientName",
	фио: "patientName",
	"фио пациента": "patientName",
	"имя пациента": "patientName",
	пациент: "patientName",
	phone: "phone",
	tel: "phone",
	telephone: "phone",
	телефон: "phone",
	"номер телефона": "phone",
	modality: "modality",
	модальность: "modality",
	"0008 0060": "modality",
	"(0008,0060)": "modality",
	type: "kind",
	kind: "kind",
	тип: "kind",
	"тип исследования": "kind",
	вид: "kind",
	"вид исследования": "kind",
	studyuid: "studyInstanceUid",
	"study uid": "studyInstanceUid",
	studyinstanceuid: "studyInstanceUid",
	"study instance uid": "studyInstanceUid",
	"uid исследования": "studyInstanceUid",
	"ид исследования": "studyInstanceUid",
	"идентификатор исследования": "studyInstanceUid",
	"код исследования": "studyInstanceUid",
	кодисследования: "studyInstanceUid",
	"0020 000d": "studyInstanceUid",
	"(0020,000d)": "studyInstanceUid",
	seriesuid: "seriesInstanceUid",
	"series uid": "seriesInstanceUid",
	seriesinstanceuid: "seriesInstanceUid",
	"series instance uid": "seriesInstanceUid",
	"uid серии": "seriesInstanceUid",
	"ид серии": "seriesInstanceUid",
	"идентификатор серии": "seriesInstanceUid",
	"код серии": "seriesInstanceUid",
	кодсерии: "seriesInstanceUid",
	"0020 000e": "seriesInstanceUid",
	"(0020,000e)": "seriesInstanceUid",
	sopuid: "sopInstanceUid",
	sopinstanceuid: "sopInstanceUid",
	"sop instance uid": "sopInstanceUid",
	"код снимка": "sopInstanceUid",
	кодснимка: "sopInstanceUid",
	"0008 0018": "sopInstanceUid",
	"(0008,0018)": "sopInstanceUid",
	study: "studyDescription",
	studydescription: "studyDescription",
	"study description": "studyDescription",
	исследование: "studyDescription",
	"описание исследования": "studyDescription",
	"название исследования": "studyDescription",
	"0008 1030": "studyDescription",
	"(0008,1030)": "studyDescription",
	series: "seriesDescription",
	seriesdescription: "seriesDescription",
	"series description": "seriesDescription",
	серия: "seriesDescription",
	"описание серии": "seriesDescription",
	"название серии": "seriesDescription",
	описаниесерии: "seriesDescription",
	"0008 103e": "seriesDescription",
	"(0008,103e)": "seriesDescription",
	instance: "instanceNumber",
	instancenumber: "instanceNumber",
	"instance number": "instanceNumber",
	"номер среза": "instanceNumber",
	номерсреза: "instanceNumber",
	"номер изображения": "instanceNumber",
	"номер экземпляра": "instanceNumber",
	"0020 0013": "instanceNumber",
	"(0020,0013)": "instanceNumber",
	slice: "instanceNumber",
	rows: "imageRows",
	row: "imageRows",
	imagerows: "imageRows",
	"image rows": "imageRows",
	"0028 0010": "imageRows",
	"(0028,0010)": "imageRows",
	columns: "imageColumns",
	column: "imageColumns",
	cols: "imageColumns",
	imagecolumns: "imageColumns",
	"image columns": "imageColumns",
	"0028 0011": "imageColumns",
	"(0028,0011)": "imageColumns",
	bitsallocated: "bitsAllocated",
	"bits allocated": "bitsAllocated",
	bitdepth: "bitsAllocated",
	"bit depth": "bitsAllocated",
	"0028 0100": "bitsAllocated",
	"(0028,0100)": "bitsAllocated",
	samplesperpixel: "samplesPerPixel",
	"samples per pixel": "samplesPerPixel",
	samples: "samplesPerPixel",
	"0028 0002": "samplesPerPixel",
	"(0028,0002)": "samplesPerPixel",
	estimatedpixelbytes: "estimatedPixelBytes",
	"estimated pixel bytes": "estimatedPixelBytes",
	pixelbytes: "estimatedPixelBytes",
	"pixel bytes": "estimatedPixelBytes",
	срез: "instanceNumber",
	date: "capturedAt",
	captured: "capturedAt",
	studydate: "capturedAt",
	"study date": "capturedAt",
	"0008 0020": "capturedAt",
	"(0008,0020)": "capturedAt",
	дата: "capturedAt",
	"дата исследования": "capturedAt",
	"дата снимка": "capturedAt",
	file: "filePath",
	path: "filePath",
	filepath: "filePath",
	"file path": "filePath",
	файл: "filePath",
	путь: "filePath",
	"путь к файлу": "filePath",
	"локальный путь": "filePath",
	"dicom файл": "filePath",
	source: "sourceName",
	источник: "sourceName",
	"название источника": "sourceName",
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
export const dicomUidPatternCache = new Map<string, RegExp>();
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
export const dicomFieldValuePatternCache = new Map<string, RegExp>();
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
	patient: Awaited<ReturnType<typeof getPatientsFromDb>>[number] | undefined;
	ambiguous: boolean;
	weakMatch: boolean;
} {
	const normalizedName = patientName?.trim().toLowerCase();

	const phoneMatches = phone
		? patients.filter((patient) => normalizePhone(patient.phone) === phone)
		: [];
	if (phoneMatches.length === 1) {
		return { patient: phoneMatches[0], ambiguous: false, weakMatch: false };
	}
	if (phoneMatches.length > 1) {
		return { patient: undefined, ambiguous: true, weakMatch: false };
	}

	const nameMatches = normalizedName
		? patients.filter(
				(patient) => patient.fullName.trim().toLowerCase() === normalizedName,
			)
		: [];
	if (nameMatches.length === 1) {
		// Совпадение только по ФИО — слабое: однофамильцы с одинаковым именем
		// встречаются, поэтому автоматически такую строку не импортируем.
		return { patient: nameMatches[0], ambiguous: false, weakMatch: true };
	}
	if (nameMatches.length > 1) {
		return { patient: undefined, ambiguous: true, weakMatch: false };
	}

	return { patient: undefined, ambiguous: false, weakMatch: false };
}
export function parseManifestLine(
	patients: Awaited<ReturnType<typeof getPatientsFromDb>>,
	line: string,
	rowNumber: number,
	sourceKind: ImagingSourceKind,
	sourceName: string,
): ImagingImportPreviewRow {
	const phone = extractPhone(line);
	const filePath = extractFilePath(line);
	const date = normalizeDate(
		line.match(/\b\d{1,2}[./-]\d{1,2}[./-]\d{4}\b/)?.[0] ?? null,
	);
	const kind = detectKind(line) ?? detectKind(filePath);
	const toothCode = extractTooth(line);
	const patientName =
		line
			.replace(filePath ?? "", "")
			.replace(phone ?? "", "")
			.replace(/\b\d{1,2}[./-]\d{1,2}[./-]\d{4}\b/g, "")
			.replace(
				/cbct|кт|ккт|dicom|ceph|trg|трг|телерентг|цеф|opg|оптг|прицельный|прицел|rvg|bitewing|фото/gi,
				"",
			)
			.replace(/\b(?:1[1-8]|2[1-8]|3[1-8]|4[1-8])\b/g, "")
			.split(/\s+/)
			.filter((part) => /^[A-Za-zА-Яа-яЁё-]{2,}$/.test(part))
			.slice(0, 4)
			.join(" ") || null;
	const { patient, ambiguous, weakMatch } = matchPatient(
		patients,
		patientName,
		phone,
	);
	const warnings: string[] = [];
	if (ambiguous) {
		warnings.push(
			"Найдено несколько пациентов с такими данными — выберите нужного вручную, иначе снимок попадёт в чужую карту",
		);
	} else if (!patient) {
		warnings.push("Пациент не найден, нужно сопоставление");
	} else if (weakMatch) {
		warnings.push(
			"Пациент найден только по ФИО (без телефона) — подтвердите совпадение вручную",
		);
	}
	if (!kind) warnings.push("Тип снимка не распознан");
	if (!filePath) warnings.push("Нет пути к файлу снимка");
	const blocked = !filePath || !kind;
	return {
		rowNumber,
		patientId: patient?.id ?? null,
		patientName: patient?.fullName ?? patientName,
		phone,
		kind,
		title: kind
			? `${kindLabels[kind]}${toothCode ? ` ${toothCode}` : ""}`
			: null,
		toothCode,
		region: toothCode ? null : "не указано",
		capturedAt: date,
		filePath,
		sourceKind: detectSourceKind(filePath ?? line, sourceKind),
		sourceName,
		// Автоматический импорт (status "ready") только при надёжном совпадении:
		// слабое совпадение по одному ФИО и неоднозначность требуют человека.
		status: blocked ? "blocked" : patient && !weakMatch ? "ready" : "warning",
		warnings,
	};
}
export function quoteManifestCell(value: string | null) {
	if (!value) return "";
	if (!/[;"\n]/.test(value)) return value;
	return `"${value.replaceAll('"', '""')}"`;
}
export function inferManifestFieldsFromPath(filePath: string) {
	const parsed = path.parse(filePath);
	const originalName = parsed.name;
	const spacedName = originalName.replace(/[_()[\]{}.-]+/g, " ");
	const date =
		originalName
			.match(/\b\d{1,2}[.-]\d{1,2}[.-]\d{4}\b/)?.[0]
			?.replaceAll("-", ".") ?? null;
	const toothCode =
		spacedName.match(/\b(?:1[1-8]|2[1-8]|3[1-8]|4[1-8])\b/)?.[0] ?? null;
	const kind = detectKind(originalName) ?? detectKind(spacedName);
	const patientName =
		spacedName
			.replace(/\b\d{1,2}[ .-]\d{1,2}[ .-]\d{4}\b/g, " ")
			.replace(/\b(?:1[1-8]|2[1-8]|3[1-8]|4[1-8])\b/g, " ")
			.replace(
				/cbct|кт|ккт|dicom|ceph|trg|трг|телерентг|цеф|opg|оптг|ортопан|панорам|прицельный|прицел|rvg|bitewing|фото/gi,
				" ",
			)
			.split(/\s+/)
			.filter((part) => /^[A-Za-zА-Яа-яЁё-]{2,}$/.test(part))
			.slice(0, 4)
			.join(" ") || null;

	return {
		patientName,
		kind: kind ?? null,
		toothCode,
		date,
		filePath,
	};
}
export async function collectDicomHeaderFiles(
	root: string,
	recursive: boolean,
	maxFiles: number,
	options: ApiDicomScanOptions = {},
	limits: ApiDicomFolderTraversalLimits = {},
) {
	const files: string[] = [];
	const warnings: string[] = [];
	const queue = [path.resolve(root)];
	const maxFolders = Math.max(
		1,
		Math.floor(limits.maxFolders ?? apiDicomDefaultMaxFolders),
	);
	const maxEntriesPerFolder = Math.max(
		1,
		Math.floor(
			limits.maxEntriesPerFolder ?? apiDicomDefaultMaxEntriesPerFolder,
		),
	);
	const yieldState = createApiDicomScanYieldState();
	let queueIndex = 0;
	let foldersScanned = 0;
	let folderQueueLimitHit = false;

	while (
		queueIndex < queue.length &&
		files.length < maxFiles &&
		foldersScanned < maxFolders
	) {
		await maybeYieldApiDicomScan(yieldState, options.signal);
		const current = queue[queueIndex];
		queueIndex += 1;
		if (!current) break;
		foldersScanned += 1;
		try {
			let entriesInspected = 0;
			const directory = await opendir(current);
			for await (const entry of directory) {
				await maybeYieldApiDicomScan(yieldState, options.signal);
				entriesInspected += 1;
				if (entriesInspected > maxEntriesPerFolder) {
					warnings.push(
						`Проверка папки снимков ограничена ${maxEntriesPerFolder} элементами: ${current}`,
					);
					break;
				}
				const entryName = entry.name.toString();
				const fullPath = path.join(current, entryName);
				if (entry.isDirectory()) {
					if (recursive) {
						const queuedFolders = queue.length - queueIndex;
						if (foldersScanned + queuedFolders < maxFolders)
							queue.push(fullPath);
						else folderQueueLimitHit = true;
					}
					continue;
				}
				if (!entry.isFile()) continue;
				if (!isDicomHeaderCandidatePath(fullPath)) continue;
				files.push(fullPath);
				if (files.length >= maxFiles) {
					warnings.push(
						`Сканирование метаданных снимков остановлено на лимите ${maxFiles} файлов.`,
					);
					break;
				}
			}
		} catch (error) {
			if (isApiDicomScanAbortError(error)) throw error;
			warnings.push(`Не удалось прочитать папку снимков: ${current}`);
		}
	}
	if (
		foldersScanned >= maxFolders ||
		folderQueueLimitHit ||
		queueIndex < queue.length
	) {
		warnings.push(
			`Сканирование папок снимков остановлено на лимите ${maxFolders}.`,
		);
	}

	return { files, warnings };
}
export async function buildDicomHeaderManifest(
	input: { files: string[]; sourceName: string; maxHeaderBytes: number },
	options: ApiDicomScanOptions = {},
) {
	const rows: string[] = [];
	const warnings: string[] = [];
	let filesParsed = 0;
	const yieldState = createApiDicomScanYieldState();

	for (const filePath of input.files) {
		await maybeYieldApiDicomScan(yieldState, options.signal);
		if (isZipArchivePath(filePath)) {
			const zip = await readZipCentralDirectoryDetailed(filePath);
			warnings.push(
				...zip.warnings.map((warning) => `${filePath}: ${warning}`),
			);
			if (zip.fileHandle === null) continue;
			const dicomEntries = zip.entries.filter((entry) =>
				isDicomLikeEntry(entry.name),
			);
			try {
				if (!dicomEntries.length) {
					warnings.push(
						`${filePath}: в ZIP не найдены записи снимков для чтения метаданных.`,
					);
					continue;
				}
				if (dicomEntries.length > dicomZipMetadataEntryLimit) {
					warnings.push(
						`${filePath}: сканирование метаданных читает только первые ${dicomZipMetadataEntryLimit}/${dicomEntries.length} записей снимков.`,
					);
				}

				const entriesToProcess = dicomEntries.slice(
					0,
					dicomZipMetadataEntryLimit,
				);
				const chunkSize = 25;
				for (let i = 0; i < entriesToProcess.length; i += chunkSize) {
					const chunk = entriesToProcess.slice(i, i + chunkSize);
					await maybeYieldApiDicomScan(yieldState, options.signal);
					const chunkResults = await Promise.all(
						chunk.map(async (entry) => {
							const prefix = await zipEntryPrefix(
								zip.fileHandle as FileHandle,
								entry,
								input.maxHeaderBytes,
							);
							return { entry, prefix };
						}),
					);

					for (const { entry, prefix } of chunkResults) {
						if (!prefix.buffer) {
							if (prefix.warning)
								warnings.push(`${filePath}: ${prefix.warning}`);
							continue;
						}
						const virtualPath = `${filePath}::${entry.name}`;
						const metadata = parseDicomHeader(prefix.buffer);
						filesParsed += 1;
						warnings.push(
							...metadata.warnings.map(
								(warning) => `${virtualPath}: ${warning}`,
							),
						);
						rows.push(
							dicomMetadataManifestRow(virtualPath, metadata, input.sourceName),
						);
					}
				}
			} finally {
				await zip.fileHandle.close();
			}
			continue;
		}

		if (!isDicomPixelPath(filePath)) continue;
		try {
			const metadata = parseDicomHeader(
				readFilePrefix(filePath, input.maxHeaderBytes),
			);
			filesParsed += 1;
			warnings.push(
				...metadata.warnings.map((warning) => `${filePath}: ${warning}`),
			);
			rows.push(dicomMetadataManifestRow(filePath, metadata, input.sourceName));
		} catch (error) {
			if (isApiDicomScanAbortError(error)) throw error;
			warnings.push(`${filePath}: не удалось прочитать метаданные снимка.`);
		}
	}

	return {
		rawText: [dicomMetadataManifestHeader(), ...rows].join("\n"),
		metadataRows: rows.length,
		filesParsed,
		warnings,
	};
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
export let pngCrcTable: Uint32Array | null = null;
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
export function rgbaToPngDataUrl(width: number, height: number, rgba: Buffer) {
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

	// We know rows and columns are non-null and > 0 here
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
		return buildUnsupportedDicomResponse(
			metadata,
			"Сжатый формат снимка не поддерживается быстрым предпросмотром.",
			"Откройте снимок через внешний КТ-модуль или локальный обработчик.",
		);
	}
	if (
		!metadata.pixelDataOffset ||
		metadata.pixelDataOffset < 0 ||
		metadata.pixelDataLength <= 0
	) {
		return buildUnsupportedDicomResponse(
			metadata,
			"Кадр снимка не найден в быстром предпросмотре.",
			"Оставьте список серии или используйте отдельный КТ-просмотрщик.",
		);
	}

	if (
		!dicomTransferSyntaxIsSupported(metadata.transferSyntaxUid) ||
		metadata.bigEndian
	) {
		return buildUnsupportedDicomResponse(
			metadata,
			"Формат файла снимка не поддерживается быстрым предпросмотром.",
			"Откройте снимок через внешний КТ-модуль или локальный обработчик для этого формата.",
		);
	}

	const normalizedPhotometric =
		metadata.photometricInterpretation ?? "MONOCHROME2";
	metadata.photometricInterpretation = normalizedPhotometric; // update for render

	if (
		!metadata.rows ||
		!metadata.columns ||
		metadata.rows <= 0 ||
		metadata.columns <= 0 ||
		metadata.rows > 8192 ||
		metadata.columns > 8192
	) {
		return buildUnsupportedDicomResponse(
			metadata,
			"Размер кадра не указан или слишком велик для быстрого предпросмотра.",
			"Откройте отдельный КТ-просмотрщик для такого размера изображения.",
		);
	}

	if (
		(metadata.samplesPerPixel ?? 1) !== 1 ||
		!["MONOCHROME1", "MONOCHROME2"].includes(normalizedPhotometric)
	) {
		return buildUnsupportedDicomResponse(
			metadata,
			"Быстрый предпросмотр открывает только серые стоматологические снимки.",
			"Откройте этот файл в полном просмотрщике: формат нестандартный для быстрого предпросмотра.",
		);
	}

	if (metadata.bitsAllocated !== 8 && metadata.bitsAllocated !== 16) {
		return buildUnsupportedDicomResponse(
			metadata,
			"Глубина изображения не поддерживается быстрым предпросмотром.",
			"Откройте этот файл в полном просмотрщике снимков.",
		);
	}

	const bytesPerPixel = metadata.bitsAllocated / 8;
	const expectedBytes = metadata.rows * metadata.columns * bytesPerPixel;
	if (
		metadata.pixelDataLength < expectedBytes ||
		metadata.pixelDataOffset + expectedBytes > buffer.length
	) {
		return buildUnsupportedDicomResponse(
			metadata,
			"Данные первого кадра короче ожидаемого размера.",
			"Откройте полный КТ-просмотрщик: быстрый предпросмотр не может открыть этот кадр.",
		);
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
		/*
		 * Отсутствующий тег (0028,0103) — это «неизвестно», а НЕ «0».
		 *
		 * БЫЛО: `metadata.pixelRepresentation ?? 0`. Ноль в этом теге DICOM —
		 * содержательное значение «беззнаковые значения пикселей», а не пустое место,
		 * поэтому подстановка превращала отсутствие атрибута в измеренный факт: ответ
		 * предпросмотра утверждал, что снимок размечен как беззнаковый, хотя разбор
		 * тега (0028,0103) его в файле не нашёл вовсе. Та же ветка «unsupported» на
		 * тот же самый отсутствующий тег отвечает null — то есть один разбор давал два
		 * разных ответа про одно и то же неизвестное.
		 *
		 * Контракт это допускает: pixelRepresentation объявлен
		 * `z.number().int().min(0).max(1).nullable()` в packages/shared/src/index.ts.
		 * Решение отрисовщика при этом НЕ МЕНЯЕТСЯ: renderDicomPreviewImage читает
		 * metadata.pixelRepresentation напрямую и трактует «не 1» как беззнаковый —
		 * это его собственный выбор по умолчанию, и он остаётся там, где стоял. Здесь
		 * же печатается разобранный атрибут, и печатать в нём выдуманный ноль нельзя.
		 */
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
export function dicomFirstFrameReadyResponse(input: {
	sourceFileIndex: number;
	parsed: DicomFirstFramePixelParse;
	warnings: string[];
	requestedFileIndex?: number | null;
	selectableFileCount: number;
}): DicomFirstFramePreviewResponse {
	return dicomFirstFramePreviewResponseSchema.parse({
		version: "dental-crm-dicom-first-frame-preview-v1",
		generatedAt: new Date().toISOString(),
		folderPath: "redacted-local-dicom-folder",
		status: "ready",
		sourceFileName: `dicom-frame-candidate-${input.sourceFileIndex + 1}`,
		sourceFileIndex: input.sourceFileIndex,
		requestedFileIndex: input.requestedFileIndex ?? null,
		selectableFileCount: input.selectableFileCount,
		transferSyntaxUid: input.parsed.transferSyntaxUid,
		photometricInterpretation: input.parsed.photometricInterpretation,
		width: input.parsed.width,
		height: input.parsed.height,
		sourceWidth: input.parsed.sourceWidth,
		sourceHeight: input.parsed.sourceHeight,
		bitsAllocated: input.parsed.bitsAllocated,
		bitsStored: input.parsed.bitsStored,
		pixelRepresentation: input.parsed.pixelRepresentation,
		windowCenter: input.parsed.windowCenter,
		windowWidth: input.parsed.windowWidth,
		imageDataUrl: input.parsed.imageDataUrl,
		warnings: redactDicomPreviewWarnings(input.warnings),
		nextAction: input.parsed.nextAction,
	});
}
export function locateLittleEndianPixelData(
	buffer: Buffer,
): { valueOffset: number; valueLength: number } | null {
	const pixelTag = Buffer.from([0xe0, 0x7f, 0x10, 0x00]);
	const cursor = buffer.indexOf(pixelTag);
	while (cursor >= 0 && cursor + 8 <= buffer.length) {
		const vr = buffer.subarray(cursor + 4, cursor + 6).toString("latin1");
		const explicitLongVr = [
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
		if (explicitLongVr && cursor + 12 <= buffer.length) {
			const valueLength = buffer.readUInt32LE(cursor + 8);
			if (valueLength !== 0xffffffff)
				return { valueOffset: cursor + 12, valueLength };
			return null;
		}
		const explicitShortVr = /^[A-Z]{2}$/.test(vr);
		if (explicitShortVr && cursor + 8 <= buffer.length) {
			const valueLength = buffer.readUInt16LE(cursor + 6);
			return { valueOffset: cursor + 8, valueLength };
		}
		const valueLength = buffer.readUInt32LE(cursor + 4);
		if (valueLength !== 0xffffffff)
			return { valueOffset: cursor + 8, valueLength };
		return null;
	}
	return null;
}
export async function readDicomFirstFramePreviewBuffer(
	filePath: string,
	maxFileBytes: number,
): Promise<{ buffer: Buffer | null; warnings: string[] }> {
	const warnings: string[] = [];
	const stats = await stat(filePath);
	const fileHandle = await open(filePath, "r");
	try {
		const prefixLength = Math.min(
			stats.size,
			maxFileBytes,
			dicomFirstFrameHeaderReadLimit,
		);
		const prefix = await readExactFileRange(fileHandle, 0, prefixLength);
		if (!prefix.buffer) {
			return {
				buffer: null,
				warnings: [
					`first_frame_header_read_failed:${prefix.warning ?? "unknown"}`,
				],
			};
		}
		const pixelData = locateLittleEndianPixelData(prefix.buffer);
		if (!pixelData) {
			warnings.push(
				"Pixel Data was not found inside the bounded first-frame header window.",
			);
			return { buffer: prefix.buffer, warnings };
		}
		const metadata = parseDicomHeader(prefix.buffer);
		const estimatedFrameBytes =
			metadata.imageRows && metadata.imageColumns && metadata.bitsAllocated
				? metadata.imageRows *
					metadata.imageColumns *
					(metadata.samplesPerPixel ?? 1) *
					Math.max(1, Math.ceil(metadata.bitsAllocated / 8))
				: Math.min(pixelData.valueLength, dicomFirstFramePixelReadLimit);
		const frameBytes = Math.min(
			pixelData.valueLength,
			estimatedFrameBytes,
			dicomFirstFramePixelReadLimit,
		);
		const requiredBytes = pixelData.valueOffset + frameBytes;
		if (requiredBytes > maxFileBytes) {
			return {
				buffer: null,
				warnings: ["first_frame_preview_byte_limit_exceeded"],
			};
		}
		if (requiredBytes > stats.size) {
			return {
				buffer: null,
				warnings: ["first_frame_pixel_range_out_of_bounds"],
			};
		}
		if (requiredBytes <= prefix.buffer.length)
			return { buffer: prefix.buffer.subarray(0, requiredBytes), warnings };
		const boundedFrame = await readExactFileRange(fileHandle, 0, requiredBytes);
		if (!boundedFrame.buffer) {
			return {
				buffer: null,
				warnings: [
					`first_frame_range_read_failed:${boundedFrame.warning ?? "unknown"}`,
				],
			};
		}
		return { buffer: boundedFrame.buffer, warnings };
	} finally {
		await fileHandle.close();
	}
}
export async function buildDicomFirstFramePreview(
	input: {
		folderPath: string;
		recursive: boolean;
		maxFiles: number;
		maxFolders: number;
		maxEntriesPerFolder: number;
		maxFileBytes: number;
		maxPreviewEdge: number;
		preferredFileIndex?: number | undefined;
	},
	options: ApiDicomScanOptions = {},
): Promise<DicomFirstFramePreviewResponse> {
	const scan = await collectDicomHeaderFiles(
		input.folderPath,
		input.recursive,
		input.maxFiles,
		options,
		{
			maxFolders: input.maxFolders,
			maxEntriesPerFolder: input.maxEntriesPerFolder,
		},
	);
	const files = scan.files.filter(
		(filePath) => !isZipArchivePath(filePath) && isDicomPixelPath(filePath),
	);
	const warnings = [...scan.warnings];
	const requestedFileIndex = input.preferredFileIndex ?? null;
	const yieldState = createApiDicomScanYieldState();
	let bestReady: {
		sourceFileIndex: number;
		parsed: DicomFirstFramePixelParse;
		score: number;
	} | null = null;

	if (!files.length) {
		return emptyDicomFirstFramePreview({
			folderPath: input.folderPath,
			status: "not_found",
			warnings: [
				...warnings,
				"Для предпросмотра первого кадра не найдены прямые файлы снимков.",
			],
			nextAction:
				"Запустите разбор снимков или распакуйте архивы перед запросом быстрого предпросмотра.",
			requestedFileIndex,
		});
	}

	const preferredTargetIndex =
		typeof input.preferredFileIndex === "number"
			? Math.min(files.length - 1, input.preferredFileIndex)
			: null;
	const candidateIndexes =
		preferredTargetIndex === null
			? files.map((_, index) => index)
			: files
					.map((_, index) => index)
					.sort(
						(left, right) =>
							Math.abs(left - preferredTargetIndex) -
								Math.abs(right - preferredTargetIndex) || left - right,
					);
	if (
		preferredTargetIndex !== null &&
		requestedFileIndex !== null &&
		preferredTargetIndex !== requestedFileIndex
	) {
		warnings.push(
			`Запрошенный срез снимков ${requestedFileIndex + 1} выше доступного диапазона; выбран ближайший доступный кандидат.`,
		);
	}

	for (const index of candidateIndexes) {
		await maybeYieldApiDicomScan(yieldState, options.signal);
		const filePath = files[index];
		if (!filePath) continue;
		const stats = await stat(filePath);
		if (stats.size > input.maxFileBytes) {
			warnings.push(
				"Файл снимка выше байтового лимита легкого предпросмотра пропущен.",
			);
			continue;
		}
		try {
			const previewBuffer = await readDicomFirstFramePreviewBuffer(
				filePath,
				input.maxFileBytes,
			);
			warnings.push(...previewBuffer.warnings);
			if (!previewBuffer.buffer) continue;
			const parsed = parseDicomFirstFramePixel(
				previewBuffer.buffer,
				input.maxPreviewEdge,
			);
			if (parsed.status !== "ready") {
				warnings.push(...parsed.warnings);
				continue;
			}
			const grayRange = parsed.previewGrayRange ?? 0;
			const grayMean = parsed.previewGrayMean ?? 0;
			const meanBalance = Math.min(grayMean, 255 - grayMean);
			const score = grayRange + meanBalance * 0.1;
			if (!bestReady || score > bestReady.score) {
				bestReady = { sourceFileIndex: index, parsed, score };
			}
			if (preferredTargetIndex !== null) {
				return dicomFirstFrameReadyResponse({
					sourceFileIndex: index,
					parsed,
					warnings: [
						...warnings,
						...parsed.warnings,
						...(index === preferredTargetIndex
							? []
							: [
									`Запрошенный срез снимков ${preferredTargetIndex + 1} не декодирован; показан ближайший читаемый срез ${index + 1}.`,
								]),
					],
					requestedFileIndex,
					selectableFileCount: files.length,
				});
			}
			if (grayRange >= 32 && meanBalance >= 4) {
				return dicomFirstFrameReadyResponse({
					sourceFileIndex: index,
					parsed,
					warnings: [...warnings, ...parsed.warnings],
					requestedFileIndex,
					selectableFileCount: files.length,
				});
			}
			warnings.push(
				"Технически читаемый, но визуально пустой кандидат предпросмотра снимка пропущен.",
			);
		} catch (error) {
			if (isApiDicomScanAbortError(error)) throw error;
			warnings.push(
				"Файл снимка не удалось декодировать легким парсером предпросмотра.",
			);
		}
	}

	if (bestReady) {
		return dicomFirstFrameReadyResponse({
			sourceFileIndex: bestReady.sourceFileIndex,
			parsed: bestReady.parsed,
			warnings: [
				...warnings,
				...bestReady.parsed.warnings,
				"В ограниченном сканировании найдены только низкоконтрастные кандидаты предпросмотра снимка.",
			],
			requestedFileIndex,
			selectableFileCount: files.length,
		});
	}

	return emptyDicomFirstFramePreview({
		folderPath: input.folderPath,
		status: "unsupported",
		warnings,
		nextAction:
			"Не удалось показать ни один читаемый первый срез; используйте внешний КТ-модуль или локальный обработчик.",
		requestedFileIndex,
		selectableFileCount: files.length,
	});
}
export function dicomMetadataManifestRow(
	filePath: string,
	metadata: DicomHeaderMetadata,
	sourceName: string,
) {
	const fallback = inferManifestFieldsFromPath(filePath);
	const kind =
		modalityToKind(
			metadata.modality,
			`${metadata.studyDescription ?? ""} ${metadata.seriesDescription ?? ""}`,
		) ??
		fallback.kind ??
		null;
	return [
		metadata.patientName ?? fallback.patientName,
		kind,
		metadata.modality,
		metadata.studyInstanceUid,
		metadata.seriesInstanceUid,
		metadata.sopInstanceUid,
		metadata.studyDescription,
		metadata.seriesDescription,
		metadata.instanceNumber === null ? null : String(metadata.instanceNumber),
		metadata.imageRows === null ? null : String(metadata.imageRows),
		metadata.imageColumns === null ? null : String(metadata.imageColumns),
		metadata.bitsAllocated === null ? null : String(metadata.bitsAllocated),
		metadata.samplesPerPixel === null ? null : String(metadata.samplesPerPixel),
		metadata.estimatedPixelBytes === null
			? null
			: String(metadata.estimatedPixelBytes),
		metadata.capturedAt ?? fallback.date,
		filePath,
		sourceName,
	]
		.map(quoteManifestCell)
		.join(";");
}
export function dicomMetadataManifestHeader() {
	return [
		"patient",
		"kind",
		"modality",
		"StudyInstanceUID",
		"SeriesInstanceUID",
		"SOPInstanceUID",
		"StudyDescription",
		"SeriesDescription",
		"InstanceNumber",
		"Rows",
		"Columns",
		"BitDepth",
		"SamplesPerPixel",
		"EstimatedPixelBytes",
		"date",
		"file",
		"source",
	].join(";");
}
export async function readExactFileRange(
	fileHandle: FileHandle,
	position: number,
	length: number,
): Promise<{ buffer: Buffer | null; warning: string | null }> {
	if (
		!Number.isSafeInteger(position) ||
		!Number.isSafeInteger(length) ||
		position < 0 ||
		length < 0
	) {
		return { buffer: null, warning: "invalid_file_range" };
	}
	const buffer = Buffer.alloc(length);
	let bytesRead = 0;
	while (bytesRead < length) {
		const { bytesRead: chunk } = await fileHandle.read(
			buffer,
			bytesRead,
			length - bytesRead,
			position + bytesRead,
		);
		if (chunk <= 0) break;
		bytesRead += chunk;
	}
	if (bytesRead !== length)
		return { buffer: null, warning: "file_range_truncated" };
	return { buffer, warning: null };
}
export async function readZipCentralDirectoryDetailed(
	filePath: string,
): Promise<ZipCentralDirectoryDetailedResult> {
	const warnings: string[] = [];
	let stats: Stats;
	try {
		stats = await stat(filePath);
	} catch (err) {
		console.error("[Dente] Failed to stat ZIP file:", err);
		return {
			entries: [],
			warnings: [
				"ZIP-архив не найден на этом сервере; предпросмотр использует только путь к архиву.",
			],
			fileHandle: null,
		};
	}

	const fileHandle = await open(filePath, "r");
	const tailLength = Math.min(stats.size, zipEocdSearchWindowBytes);
	const tail = await readExactFileRange(
		fileHandle,
		stats.size - tailLength,
		tailLength,
	);
	if (!tail.buffer) {
		await fileHandle.close();
		return {
			entries: [],
			warnings: [`ZIP-tail read failed:${tail.warning ?? "unknown"}`],
			fileHandle: null,
		};
	}

	const buffer = tail.buffer;
	const searchStart = 0;
	let eocdOffset = -1;
	for (let offset = buffer.length - 22; offset >= searchStart; offset -= 1) {
		if (buffer.readUInt32LE(offset) === 0x06054b50) {
			eocdOffset = offset;
			break;
		}
	}
	if (eocdOffset < 0) {
		await fileHandle.close();
		return {
			entries: [],
			warnings: [
				"Центральный каталог ZIP не найден; архив может быть зашифрован, разделен на части или не поддерживаться.",
			],
			fileHandle: null,
		};
	}

	const totalEntries = buffer.readUInt16LE(eocdOffset + 10);
	const diskNumber = buffer.readUInt16LE(eocdOffset + 4);
	const centralDirectoryDisk = buffer.readUInt16LE(eocdOffset + 6);
	const diskEntries = buffer.readUInt16LE(eocdOffset + 8);
	const centralDirectorySize = buffer.readUInt32LE(eocdOffset + 12);
	const centralDirectoryOffset = buffer.readUInt32LE(eocdOffset + 16);
	if (
		diskNumber !== 0 ||
		centralDirectoryDisk !== 0 ||
		diskEntries !== totalEntries
	) {
		await fileHandle.close();
		return {
			entries: [],
			warnings: [
				"Обнаружен split/multi-disk ZIP-архив; предпросмотр метаданных работает только с цельным локальным ZIP.",
			],
			fileHandle: null,
		};
	}
	if (
		totalEntries === 0xffff ||
		centralDirectorySize === 0xffffffff ||
		centralDirectoryOffset === 0xffffffff
	) {
		await fileHandle.close();
		return {
			entries: [],
			warnings: [
				"Обнаружен ZIP64-архив; этот предпросмотр пропускает раскрытие центрального каталога ZIP64.",
			],
			fileHandle: null,
		};
	}
	if (centralDirectorySize > zipCentralDirectoryReadLimit) {
		await fileHandle.close();
		return {
			entries: [],
			warnings: [
				`Центральный каталог ZIP занимает ${Math.round(centralDirectorySize / 1024 / 1024)} МБ; предпросмотр метаданных ограничен.`,
			],
			fileHandle: null,
		};
	}
	if (centralDirectoryOffset + centralDirectorySize > stats.size) {
		await fileHandle.close();
		return {
			entries: [],
			warnings: [
				"Центральный каталог ZIP выходит за границы архива; архив не раскрыт.",
			],
			fileHandle: null,
		};
	}
	const centralDirectory = await readExactFileRange(
		fileHandle,
		centralDirectoryOffset,
		centralDirectorySize,
	);
	if (!centralDirectory.buffer) {
		await fileHandle.close();
		return {
			entries: [],
			warnings: [
				`ZIP central-directory read failed:${centralDirectory.warning ?? "unknown"}`,
			],
			fileHandle: null,
		};
	}

	const entries: ZipCentralDirectoryEntry[] = [];
	let cursor = 0;
	const directoryBuffer = centralDirectory.buffer;
	while (
		cursor + 46 <= directoryBuffer.length &&
		entries.length < Math.min(totalEntries, zipEntryPreviewLimit)
	) {
		if (directoryBuffer.readUInt32LE(cursor) !== 0x02014b50) break;
		const flags = directoryBuffer.readUInt16LE(cursor + 8);
		const compressionMethod = directoryBuffer.readUInt16LE(cursor + 10);
		const compressedSize = directoryBuffer.readUInt32LE(cursor + 20);
		const uncompressedSize = directoryBuffer.readUInt32LE(cursor + 24);
		const fileNameLength = directoryBuffer.readUInt16LE(cursor + 28);
		const extraLength = directoryBuffer.readUInt16LE(cursor + 30);
		const commentLength = directoryBuffer.readUInt16LE(cursor + 32);
		const localHeaderOffset = directoryBuffer.readUInt32LE(cursor + 42);
		const fileNameStart = cursor + 46;
		const fileNameEnd = fileNameStart + fileNameLength;
		if (fileNameEnd > directoryBuffer.length) break;
		const name = directoryBuffer.toString("utf8", fileNameStart, fileNameEnd);
		if (
			compressedSize === 0xffffffff ||
			uncompressedSize === 0xffffffff ||
			localHeaderOffset === 0xffffffff
		) {
			warnings.push(`zip64_entry_skipped:${name}`);
		} else if (
			localHeaderOffset + 30 > stats.size ||
			localHeaderOffset + compressedSize > stats.size
		) {
			warnings.push(`zip_entry_out_of_bounds:${name}`);
		} else {
			entries.push({
				name,
				compressionMethod,
				compressedSize,
				uncompressedSize,
				localHeaderOffset,
				encrypted: Boolean(flags & 1),
			});
		}
		cursor = fileNameEnd + extraLength + commentLength;
	}

	if (totalEntries > entries.length)
		warnings.push(
			`ZIP-предпросмотр вернул ${entries.length}/${totalEntries} записей центрального каталога.`,
		);
	return { entries, warnings, fileHandle };
}
export async function inflateZipEntryPrefix(
	fileHandle: FileHandle,
	entry: ZipCentralDirectoryEntry,
	dataStart: number,
	maxHeaderBytes: number,
): Promise<{ buffer: Buffer | null; warning: string | null }> {
	return new Promise((resolve) => {
		const inflater = createInflateRaw();
		const chunks: Buffer[] = [];
		let outputBytes = 0;
		let settled = false;
		const finish = (result: {
			buffer: Buffer | null;
			warning: string | null;
		}) => {
			if (settled) return;
			settled = true;
			inflater.removeAllListeners();
			inflater.destroy();
			resolve(result);
		};

		inflater.on("data", (chunk: Buffer) => {
			if (settled) return;
			const remainingOutput = maxHeaderBytes - outputBytes;
			if (remainingOutput > 0) {
				const slice =
					chunk.length > remainingOutput
						? chunk.subarray(0, remainingOutput)
						: chunk;
				chunks.push(slice);
				outputBytes += slice.length;
			}
			if (outputBytes >= maxHeaderBytes) {
				finish({ buffer: Buffer.concat(chunks, outputBytes), warning: null });
			}
		});
		inflater.on("error", () =>
			finish({
				buffer: null,
				warning: `zip_entry_inflate_failed:${entry.name}`,
			}),
		);
		inflater.on("end", () =>
			finish({ buffer: Buffer.concat(chunks, outputBytes), warning: null }),
		);

		void (async () => {
			let position = dataStart;
			let compressedRemaining = entry.compressedSize;
			let budgetRemaining = Math.min(
				entry.compressedSize,
				zipEntryMetadataCompressedReadLimit,
			);
			while (!settled && compressedRemaining > 0 && budgetRemaining > 0) {
				const chunkLength = Math.min(
					zipEntryMetadataChunkBytes,
					compressedRemaining,
					budgetRemaining,
				);
				const chunk = await readExactFileRange(
					fileHandle,
					position,
					chunkLength,
				);
				if (!chunk.buffer) {
					finish({
						buffer: null,
						warning: `zip_entry_truncated:${entry.name}:${chunk.warning ?? "unknown"}`,
					});
					return;
				}
				position += chunkLength;
				compressedRemaining -= chunkLength;
				budgetRemaining -= chunkLength;
				try {
					if (!inflater.write(chunk.buffer)) await once(inflater, "drain");
				} catch (err) {
					console.error("[Dente] Failed to write to inflater:", err);
					if (!settled)
						finish({
							buffer: null,
							warning: `zip_entry_inflate_failed:${entry.name}`,
						});
					return;
				}
			}
			if (settled) return;
			if (compressedRemaining > 0 && budgetRemaining <= 0) {
				finish({
					buffer: null,
					warning: `zip_entry_header_inflate_budget_exceeded:${entry.name}`,
				});
				return;
			}
			inflater.end();
		})();
	});
}
export async function zipEntryPrefix(
	fileHandle: FileHandle,
	entry: ZipCentralDirectoryEntry,
	maxHeaderBytes: number,
): Promise<{ buffer: Buffer | null; warning: string | null }> {
	if (entry.encrypted)
		return {
			buffer: null,
			warning: `zip_encrypted_entry_skipped:${entry.name}`,
		};
	const offset = entry.localHeaderOffset;
	const header = await readExactFileRange(fileHandle, offset, 30);
	if (!header.buffer)
		return {
			buffer: null,
			warning: `zip_local_header_read_failed:${entry.name}:${header.warning ?? "unknown"}`,
		};
	if (header.buffer.readUInt32LE(0) !== 0x04034b50) {
		return { buffer: null, warning: `zip_local_header_missing:${entry.name}` };
	}

	const fileNameLength = header.buffer.readUInt16LE(26);
	const extraLength = header.buffer.readUInt16LE(28);
	const dataStart = offset + 30 + fileNameLength + extraLength;
	if (entry.compressionMethod === 0) {
		const prefixLength = Math.min(entry.uncompressedSize, maxHeaderBytes);
		return await readExactFileRange(fileHandle, dataStart, prefixLength);
	}
	if (entry.compressionMethod === 8) {
		return inflateZipEntryPrefix(fileHandle, entry, dataStart, maxHeaderBytes);
	}

	return {
		buffer: null,
		warning: `zip_unsupported_compression:${entry.name}:${entry.compressionMethod}`,
	};
}
export async function readZipCentralDirectory(
	filePath: string,
): Promise<{ entries: string[]; warnings: string[] }> {
	const detailed = await readZipCentralDirectoryDetailed(filePath);
	if (detailed.fileHandle !== null) await detailed.fileHandle.close();
	return {
		entries: detailed.entries.map((entry) => entry.name),
		warnings: detailed.warnings,
	};
}
export async function expandDicomArchiveManifestLines(
	lines: string[],
): Promise<{ lines: string[]; notes: string[] }> {
	const expandedLines: string[] = [];
	const notes: string[] = [];

	for (const line of lines) {
		const filePath = extractFilePath(line);
		if (!isDicomArchivePath(filePath)) {
			expandedLines.push(line);
			continue;
		}

		const archivePath = filePath?.split("::")[0] ?? filePath;
		if (!archivePath || !isZipArchivePath(archivePath)) {
			expandedLines.push(line);
			notes.push(
				`${archivePath ?? "Архив"} обнаружен; ZIP можно раскрыть для предпросмотра, 7z/RAR сначала нужно распаковать внешним инструментом.`,
			);
			continue;
		}

		const zip = await readZipCentralDirectory(archivePath);
		notes.push(...zip.warnings.map((warning) => `${archivePath}: ${warning}`));
		const dicomEntries = zip.entries.filter(isDicomLikeEntry);
		if (!dicomEntries.length) {
			expandedLines.push(line);
			notes.push(
				`${archivePath}: в центральном каталоге ZIP не найдены записи снимков.`,
			);
			continue;
		}

		notes.push(
			`${archivePath}: раскрыто ${Math.min(dicomEntries.length, zipEntryPreviewLimit)} записей снимков для предпросмотра серии.`,
		);
		for (const entry of dicomEntries.slice(0, zipEntryPreviewLimit)) {
			const virtualPath = `${archivePath}::${entry}`;
			expandedLines.push(
				filePath && line.includes(filePath)
					? line.replace(filePath, virtualPath)
					: `${line};${virtualPath}`,
			);
		}
	}

	return { lines: expandedLines, notes };
}
export function dicomFallbackSeriesKey(
	filePath: string | null,
	row: Pick<DicomSeriesPreviewRow, "patientId" | "patientName" | "kind">,
) {
	const parsed = filePath ? path.parse(filePath) : null;
	const parent = parsed?.dir ? path.basename(parsed.dir) : "no-folder";
	const studyParent = parsed?.dir
		? path.basename(path.dirname(parsed.dir))
		: "no-study-folder";
	return [
		row.patientId ?? row.patientName ?? "unknown-patient",
		row.kind ?? "unknown-kind",
		studyParent,
		parent,
	].join("|");
}
export function recommendedViewerFor(input: {
	kind: ImagingStudyKind | null;
	modality: string | null;
	fileCount: number;
}): DicomSeriesViewer {
	if (!input.kind) return "none";
	if (
		input.kind === "cbct" ||
		input.modality === "CT" ||
		input.modality === "CBCT" ||
		input.modality === "MR"
	)
		return "cbct_mpr";
	if (input.fileCount > 1) return "two_d_stack";
	return "two_d_stack";
}
export function buildDicomSeriesGroups(rows: DicomSeriesPreviewRow[]) {
	const buckets = new Map<string, DicomSeriesPreviewRow[]>();
	rows.forEach((row) => {
		const key =
			row.seriesInstanceUid ??
			`${row.studyInstanceUid ?? "no-study"}|${row.seriesDescription ?? dicomFallbackSeriesKey(row.filePath, row)}`;
		const existing = buckets.get(key);
		if (existing) existing.push(row);
		else buckets.set(key, [row]);
	});

	return Array.from(buckets.values()).map(
		(seriesRows, index): DicomSeriesPreviewGroup => {
			const first = seriesRows[0];

			let kind: string | null | undefined;
			let modality: string | null | undefined;
			let patientId: string | null | undefined;
			let patientName: string | null | undefined;
			let studyInstanceUid: string | null | undefined;
			let seriesInstanceUid: string | null | undefined;
			let studyDescription: string | null | undefined;
			let seriesDescription: string | null | undefined;
			let capturedAt: string | null | undefined;
			let firstFilePath: string | null | undefined;
			let imageRows: number | null | undefined;
			let imageColumns: number | null | undefined;
			let bitsAllocated: number | null | undefined;
			let samplesPerPixel: number | null | undefined;

			let rowPixelBytes = 0;
			const warnings = new Set<string>();

			for (const row of seriesRows) {
				if (kind === undefined && row.kind) kind = row.kind;
				if (modality === undefined && row.modality) modality = row.modality;
				if (patientId === undefined && row.patientId) patientId = row.patientId;
				if (patientName === undefined && row.patientName)
					patientName = row.patientName;
				if (studyInstanceUid === undefined && row.studyInstanceUid)
					studyInstanceUid = row.studyInstanceUid;
				if (seriesInstanceUid === undefined && row.seriesInstanceUid)
					seriesInstanceUid = row.seriesInstanceUid;
				if (studyDescription === undefined && row.studyDescription)
					studyDescription = row.studyDescription;
				if (seriesDescription === undefined && row.seriesDescription)
					seriesDescription = row.seriesDescription;
				if (capturedAt === undefined && row.capturedAt)
					capturedAt = row.capturedAt;
				if (firstFilePath === undefined && row.filePath)
					firstFilePath = row.filePath;
				if (imageRows === undefined && row.imageRows) imageRows = row.imageRows;
				if (imageColumns === undefined && row.imageColumns)
					imageColumns = row.imageColumns;
				if (bitsAllocated === undefined && row.bitsAllocated)
					bitsAllocated = row.bitsAllocated;
				if (samplesPerPixel === undefined && row.samplesPerPixel)
					samplesPerPixel = row.samplesPerPixel;

				rowPixelBytes += row.estimatedPixelBytes ?? 0;

				if (row.warnings?.length) {
					for (const w of row.warnings) warnings.add(w);
				}
			}

			const kindNull = (kind ?? null) as DicomSeriesPreviewGroup["kind"];
			const modalityNull = modality ?? null;
			const patientIdNull = patientId ?? null;
			const patientNameNull = patientName ?? null;
			const studyInstanceUidNull = studyInstanceUid ?? null;
			const seriesInstanceUidNull = seriesInstanceUid ?? null;
			const studyDescriptionNull = studyDescription ?? null;
			const seriesDescriptionNull = seriesDescription ?? null;
			const capturedAtNull = capturedAt ?? null;
			const firstFilePathNull = firstFilePath ?? null;
			const imageRowsNull = imageRows ?? null;
			const imageColumnsNull = imageColumns ?? null;
			const bitsAllocatedNull = bitsAllocated ?? null;
			const samplesPerPixelNull = samplesPerPixel ?? null;

			const sourceKind = first?.sourceKind ?? "dicom_file";
			const sourceName = first?.sourceName ?? "dicom_series";
			const estimatedPixelBytes =
				rowPixelBytes > 0
					? rowPixelBytes
					: imageRowsNull && imageColumnsNull && bitsAllocatedNull
						? imageRowsNull *
							imageColumnsNull *
							(samplesPerPixelNull ?? 1) *
							Math.max(1, Math.ceil(bitsAllocatedNull / 8)) *
							seriesRows.length
						: null;
			if (!studyInstanceUidNull || !seriesInstanceUidNull)
				warnings.add(
					"Нет кодов исследования/серии: серия сгруппирована по папке или описанию",
				);
			if (!patientIdNull)
				warnings.add(
					"Пациент не сопоставлен: перед записью нужен ручной матчинг",
				);
			if (!kindNull) warnings.add("Тип исследования не распознан");
			if (kindNull === "cbct" && seriesRows.length < 8)
				warnings.add(
					"Для КЛКТ/КТ-срезов мало срезов: проверьте полный экспорт серии",
				);
			const blocked = !kindNull || !firstFilePathNull;
			const mprReadiness = buildMprReadiness({
				kind: kindNull,
				modality: modalityNull,
				fileCount: seriesRows.length,
				estimatedPixelBytes,
				firstFilePath: firstFilePathNull,
				sourceKind,
				hasStudySeriesUid: Boolean(
					studyInstanceUidNull && seriesInstanceUidNull,
				),
			});
			mprReadiness.blockers.forEach((blocker) => {
				warnings.add(blocker);
			});
			mprReadiness.warnings.forEach((warning) => {
				warnings.add(warning);
			});
			const status = blocked
				? "blocked"
				: patientIdNull && warnings.size === 0
					? "ready"
					: "warning";
			const recommendedViewer: DicomSeriesViewer = blocked
				? "none"
				: mprReadiness.volumeCandidate
					? mprReadiness.canOpenMpr
						? "cbct_mpr"
						: "external_dicom"
					: recommendedViewerFor({
							kind: kindNull,
							modality: modalityNull,
							fileCount: seriesRows.length,
						});
			return {
				id: `dicom-series-${index + 1}`,
				patientId: patientIdNull,
				patientName: patientNameNull,
				kind: kindNull,
				modality: modalityNull,
				studyInstanceUid: studyInstanceUidNull,
				seriesInstanceUid: seriesInstanceUidNull,
				studyDescription: studyDescriptionNull,
				seriesDescription: seriesDescriptionNull,
				capturedAt: capturedAtNull,
				fileCount: seriesRows.length,
				imageRows: imageRowsNull,
				imageColumns: imageColumnsNull,
				bitsAllocated: bitsAllocatedNull,
				samplesPerPixel: samplesPerPixelNull,
				estimatedPixelBytes,
				firstFilePath: firstFilePathNull,
				sourceKind,
				sourceName,
				recommendedViewer,
				mprReadiness,
				status,
				warnings: Array.from(warnings),
			};
		},
	);
}
export async function parseDicomManifestLine(
	patients: Awaited<ReturnType<typeof getPatientsFromDb>>,
	line: string,
	rowNumber: number,
	sourceKind: ImagingSourceKind,
	sourceName: string,
): Promise<DicomSeriesPreviewRow> {
	const base = parseManifestLine(
		patients,
		line,
		rowNumber,
		sourceKind,
		sourceName,
	);
	const modality = normalizeModality(
		extractDicomFieldValue(line, ["modality", "0008,0060", "\\(0008,0060\\)"]),
	);
	const studyInstanceUid = extractDicomUid(line, [
		"StudyInstanceUID",
		"Study UID",
		"StudyUID",
		"0020,000D",
		"\\(0020,000D\\)",
	]);
	const seriesInstanceUid = extractDicomUid(line, [
		"SeriesInstanceUID",
		"Series UID",
		"SeriesUID",
		"0020,000E",
		"\\(0020,000E\\)",
	]);
	const sopInstanceUid = extractDicomUid(line, [
		"SOPInstanceUID",
		"SOP UID",
		"SOPInstance",
		"0008,0018",
		"\\(0008,0018\\)",
	]);
	const studyDescription = extractDicomFieldValue(line, [
		"StudyDescription",
		"Study Description",
		"Study",
		"0008,1030",
		"\\(0008,1030\\)",
	]);
	const seriesDescription = extractDicomFieldValue(line, [
		"SeriesDescription",
		"Series Description",
		"Series",
		"0008,103E",
		"\\(0008,103E\\)",
	]);
	const instanceNumber = parseInstanceNumber(
		extractDicomFieldValue(line, [
			"InstanceNumber",
			"Instance Number",
			"Instance",
			"Slice",
			"0020,0013",
			"\\(0020,0013\\)",
		]) ?? base.filePath,
	);
	const imageRows = parsePositiveInteger(
		extractDicomFieldValue(line, [
			"Rows",
			"ImageRows",
			"Image Rows",
			"0028,0010",
			"\\(0028,0010\\)",
		]),
	);
	const imageColumns = parsePositiveInteger(
		extractDicomFieldValue(line, [
			"Columns",
			"ImageColumns",
			"Image Columns",
			"Cols",
			"0028,0011",
			"\\(0028,0011\\)",
		]),
	);
	const bitsAllocated = parsePositiveInteger(
		extractDicomFieldValue(line, [
			"Bits Allocated",
			"BitDepth",
			"0028,0100",
			"\\(0028,0100\\)",
		]),
	);
	const samplesPerPixel = parsePositiveInteger(
		extractDicomFieldValue(line, [
			"SamplesPerPixel",
			"Samples Per Pixel",
			"Samples",
			"0028,0002",
			"\\(0028,0002\\)",
		]),
	);
	const estimatedPixelBytes =
		parsePositiveInteger(
			extractDicomFieldValue(line, [
				"EstimatedPixelBytes",
				"Estimated Pixel Bytes",
				"PixelBytes",
			]),
		) ??
		(imageRows && imageColumns && bitsAllocated
			? imageRows *
				imageColumns *
				(samplesPerPixel ?? 1) *
				Math.max(1, Math.ceil(bitsAllocated / 8))
			: null);
	const kind =
		base.kind ??
		modalityToKind(
			modality,
			`${line} ${studyDescription ?? ""} ${seriesDescription ?? ""}`,
		);
	const warnings = [...base.warnings];
	if (!studyInstanceUid || !seriesInstanceUid)
		warnings.push(
			"Коды исследования/серии не найдены, используем папку как временную группу",
		);
	const blocked = !base.filePath || !kind;
	return {
		rowNumber,
		patientId: base.patientId,
		patientName: base.patientName,
		phone: base.phone,
		kind,
		modality,
		studyInstanceUid,
		seriesInstanceUid,
		sopInstanceUid,
		studyDescription,
		seriesDescription,
		instanceNumber,
		imageRows,
		imageColumns,
		bitsAllocated,
		samplesPerPixel,
		estimatedPixelBytes,
		capturedAt: base.capturedAt,
		filePath: base.filePath,
		sourceKind: detectSourceKind(base.filePath ?? line, sourceKind),
		sourceName,
		status: blocked ? "blocked" : base.patientId ? "ready" : "warning",
		warnings,
	};
}
export async function parseDicomSeriesManifest(
	orgId: string,
	input: { sourceName: string; sourceKind: ImagingSourceKind; rawText: string },
) {
	const sourceLines = input.rawText
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean);
	const archiveExpansion = await expandDicomArchiveManifestLines(sourceLines);
	const lines = archiveExpansion.lines;
	if (!lines.length) {
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

	const delimiter = detectDelimiter(lines[0] ?? "");
	const headers = splitLine(lines[0] ?? "", delimiter).map(
		(cell) => dicomHeaderAliases[normalizeHeader(cell)] ?? null,
	);
	const patients = await getPatientsFromDb(orgId);
	const hasHeader = headers.some(Boolean);
	const rows: DicomSeriesPreviewRow[] = await Promise.all(
		(hasHeader ? lines.slice(1) : lines).map(async (line, index) => {
			if (!hasHeader)
				return await parseDicomManifestLine(
					patients,
					line,
					index + 1,
					input.sourceKind,
					input.sourceName,
				);
			const cells = splitLine(line, delimiter);
			const draft: Partial<DicomSeriesPreviewRow> = {
				rowNumber: index + 2,
				sourceKind: input.sourceKind,
				sourceName: input.sourceName,
				warnings: [],
			};
			headers.forEach((field, cellIndex) => {
				if (!field) return;
				const value = cells[cellIndex]?.trim() || null;
				if (field === "phone") draft.phone = normalizePhone(value);
				else if (field === "kind") draft.kind = detectKind(value);
				else if (field === "modality")
					draft.modality = normalizeModality(value);
				else if (field === "capturedAt")
					draft.capturedAt = normalizeDate(value);
				else if (field === "instanceNumber")
					draft.instanceNumber = parseInstanceNumber(value);
				else if (
					field === "imageRows" ||
					field === "imageColumns" ||
					field === "bitsAllocated" ||
					field === "samplesPerPixel" ||
					field === "estimatedPixelBytes"
				) {
					draft[field] = parsePositiveInteger(value);
				} else if (
					field === "studyInstanceUid" ||
					field === "seriesInstanceUid" ||
					field === "sopInstanceUid"
				) {
					draft[field] = normalizeDicomUid(value);
				} else draft[field] = value as never;
			});
			const lineFallback = await parseDicomManifestLine(
				patients,
				line,
				index + 2,
				input.sourceKind,
				input.sourceName,
			);
			const {
				patient,
				ambiguous: patientAmbiguous,
				weakMatch: patientWeakMatch,
			} = matchPatient(
				patients,
				draft.patientName ?? lineFallback.patientName,
				draft.phone ?? lineFallback.phone,
			);
			const modality = draft.modality ?? lineFallback.modality;
			const kind =
				draft.kind ??
				modalityToKind(
					modality,
					`${draft.studyDescription ?? ""} ${draft.seriesDescription ?? ""}`,
				) ??
				lineFallback.kind;
			const filePath = draft.filePath ?? lineFallback.filePath;
			const warnings: string[] = [];
			if (patientAmbiguous)
				warnings.push(
					"Найдено несколько пациентов с такими данными — выберите нужного вручную",
				);
			else if (!patient)
				warnings.push("Пациент не найден, нужно сопоставление");
			else if (patientWeakMatch)
				warnings.push(
					"Пациент найден только по ФИО (без телефона) — подтвердите совпадение",
				);
			if (!kind) warnings.push("Тип исследования не распознан");
			if (!filePath) warnings.push("Нет пути к снимку");
			if (!draft.studyInstanceUid || !draft.seriesInstanceUid)
				warnings.push(
					"Коды исследования/серии не найдены, используем папку как временную группу",
				);
			const blocked = !filePath || !kind;
			return {
				rowNumber: draft.rowNumber ?? index + 2,
				patientId: patient?.id ?? null,
				patientName:
					patient?.fullName ?? draft.patientName ?? lineFallback.patientName,
				phone: draft.phone ?? lineFallback.phone,
				kind,
				modality,
				studyInstanceUid:
					draft.studyInstanceUid ?? lineFallback.studyInstanceUid,
				seriesInstanceUid:
					draft.seriesInstanceUid ?? lineFallback.seriesInstanceUid,
				sopInstanceUid: draft.sopInstanceUid ?? lineFallback.sopInstanceUid,
				studyDescription:
					draft.studyDescription ?? lineFallback.studyDescription,
				seriesDescription:
					draft.seriesDescription ?? lineFallback.seriesDescription,
				instanceNumber: draft.instanceNumber ?? lineFallback.instanceNumber,
				imageRows: draft.imageRows ?? lineFallback.imageRows,
				imageColumns: draft.imageColumns ?? lineFallback.imageColumns,
				bitsAllocated: draft.bitsAllocated ?? lineFallback.bitsAllocated,
				samplesPerPixel: draft.samplesPerPixel ?? lineFallback.samplesPerPixel,
				estimatedPixelBytes:
					draft.estimatedPixelBytes ??
					lineFallback.estimatedPixelBytes ??
					(draft.imageRows && draft.imageColumns && draft.bitsAllocated
						? draft.imageRows *
							draft.imageColumns *
							(draft.samplesPerPixel ?? 1) *
							Math.max(1, Math.ceil(draft.bitsAllocated / 8))
						: null),
				capturedAt: draft.capturedAt ?? lineFallback.capturedAt,
				filePath,
				sourceKind: detectSourceKind(
					filePath ?? draft.sourceName ?? "",
					input.sourceKind,
				),
				sourceName: draft.sourceName ?? input.sourceName,
				// Автоматический импорт (status "ready") только при надёжном совпадении:
				// слабое совпадение по одному ФИО и неоднозначность требуют человека.
				status: blocked
					? "blocked"
					: patient && !patientWeakMatch
						? "ready"
						: "warning",
				warnings,
			};
		}),
	);
	const series = buildDicomSeriesGroups(rows);

	return dicomSeriesPreviewResponseSchema.parse({
		sourceName: input.sourceName,
		sourceKind: input.sourceKind,
		totalRows: rows.length,
		totalSeries: series.length,
		readySeries: series.filter((row) => row.status === "ready").length,
		warningSeries: series.filter((row) => row.status === "warning").length,
		blockedSeries: series.filter((row) => row.status === "blocked").length,
		rows,
		series,
		parserNotes: [
			...archiveExpansion.notes,
			"Предпросмотр серий снимков группирует по кодам исследования/серии, если они есть, иначе использует группировку по папкам.",
			"Тяжелые данные снимков здесь не хранятся; для КЛКТ/КТ-срезов нужен отдельный локальный обработчик или внешний просмотр.",
			"Строки без совпадения пациента остаются предупреждениями и не блокируют работу клиники.",
		],
	});
}
