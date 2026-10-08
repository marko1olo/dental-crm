/**
 * types.ts — Layer 0: Типы данных, интерфейсы и константы для обработки DICOM.
 */

import {
	type ImagingSourceKind,
	type ImagingStudyKind,
} from "@dental/shared";

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
	"00100020", // PatientID
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
	"00180050", // SliceThickness
]);

export interface DicomHeaderMetadata {
	patientName: string | null;
	patientId: string | null;
	studyDate: string | null;
	sliceThickness: number | null;
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

export interface DicomParseResult {
	success: boolean;
	metadata: DicomHeaderMetadata;
	errorCode?: 400 | 422;
	error?: string;
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
	patientid: "patientId",
	"patient id": "patientId",
	"id пациента": "patientId",
	slicethickness: "sliceThickness",
	"slice thickness": "sliceThickness",
	"толщина среза": "sliceThickness",
	studydate: "studyDate",
	"study date": "studyDate",
	"дата исследования": "studyDate",
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
