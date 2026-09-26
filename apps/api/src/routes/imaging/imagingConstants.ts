import type { FileHandle } from "node:fs/promises";
import type { ImagingStudyKind } from "@dental/shared";

export const kindLabels = {
	periapical: "Прицельный",
	bitewing: "Интерпроксимальный снимок",
	opg: "ОПТГ",
	ceph: "ТРГ / цефалометрия",
	cbct: "КЛКТ / КТ",
	photo: "Фото",
	other: "Снимок",
} as const;

export const dicomArchiveExtensions = new Set([".zip", ".7z", ".rar"]);

export const imagingFileExtensions = new Set([
	".dcm",
	".dicom",
	".ima",
	".jpg",
	".jpeg",
	".png",
	".tif",
	".tiff",
	".bmp",
	".webp",
	...dicomArchiveExtensions,
]);

export const dicomPixelFileExtensions = new Set([".dcm", ".dicom", ".ima"]);

export const dentalModelFileExtensions = new Set([
	".stl",
	".obj",
	".ply",
	".glb",
	".gltf",
	".3mf",
]);

export const zipEntryPreviewLimit = 1500;

export const dicomZipMetadataEntryLimit = 500;

export const zipEntryMetadataCompressedReadLimit = 8 * 1024 * 1024;

export const zipEntryMetadataChunkBytes = 64 * 1024;

export const zipEocdSearchWindowBytes = 65_557;

export const zipCentralDirectoryReadLimit = 8 * 1024 * 1024;

export const dicomFirstFrameHeaderReadLimit = 8 * 1024 * 1024;

export const dicomFirstFramePixelReadLimit = 32 * 1024 * 1024;

export const dicomDiscoverySkipDirectoryNames = new Set([
	".cache",
	".codex",
	".edge-debug",
	".git",
	".next",
	".nuxt",
	".venv",
	"__pycache__",
	"build",
	"coverage",
	"dist",
	"node_modules",
	"site-packages",
	"target",
	"venv",
]);

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
