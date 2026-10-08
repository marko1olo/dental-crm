/**
 * service.ts — Layer 3: Доменный сервис DicomProcessorService, объединяющий все операции обработки DICOM в канонический класс.
 */

import {
	extractDicomMetadata,
	parseDicomBufferSafe,
	parseDicomHeader,
} from "./headerParser.js";
import {
	commitImagingImport,
	parseDicomSeriesManifest,
	parseImagingManifest,
} from "./manifestParser.js";
import {
	normalizeDicomUid,
	normalizeModality,
} from "./normalization.js";
import {
	isDicomArchivePath,
	isDicomHeaderCandidatePath,
} from "./pathGuards.js";
import {
	parseDicomFirstFramePixel,
	renderDicomPreviewImage,
} from "./previewRenderer.js";

/**
 * Объектный интерфейс доменного сервиса DicomProcessorService.
 */
export class DicomProcessorService {
	static parseHeader = parseDicomHeader;
	static parseBufferSafe = parseDicomBufferSafe;
	static parseSafe = parseDicomBufferSafe;
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
