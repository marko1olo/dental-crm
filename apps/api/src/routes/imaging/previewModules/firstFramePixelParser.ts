import { type DicomFirstFramePreviewResponse, dicomFirstFramePreviewResponseSchema } from "@dental/shared";
import {
	buildUnsupportedDicomResponse,
	dicomTransferSyntaxIsSupported,
	extractDicomMetadata,
	redactDicomPreviewWarnings,
	type DicomFirstFramePixelParse,
} from "../dicomParsing.js";
import { renderDicomPreviewImage } from "./previewImageRenderer.js";

export function parseDicomFirstFramePixel(
	buffer: Buffer,
	maxPreviewEdge: number,
): DicomFirstFramePixelParse {
	const metadata = extractDicomMetadata(buffer, []);
	if (!metadata) {
		return {
			status: "unsupported", transferSyntaxUid: null, photometricInterpretation: null,
			sourceWidth: null, sourceHeight: null, bitsAllocated: null, bitsStored: null,
			pixelRepresentation: null, windowCenter: null, windowWidth: null, imageDataUrl: null,
			width: null, height: null, warnings: ["Кадр снимка не найден в быстром предпросмотре."],
			nextAction: "Оставьте список серии или используйте отдельный КТ-просмотрщик.",
		};
	}

	if (metadata.isCompressed) {
		return buildUnsupportedDicomResponse(metadata, "Сжатый формат снимка не поддерживается быстрым предпросмотром.", "Откройте снимок через внешний КТ-модуль или локальный обработчик.");
	}
	if (!metadata.pixelDataOffset || metadata.pixelDataOffset < 0 || metadata.pixelDataLength <= 0) {
		return buildUnsupportedDicomResponse(metadata, "Кадр снимка не найден в быстром предпросмотре.", "Оставьте список серии или используйте отдельный КТ-просмотрщик.");
	}
	if (!dicomTransferSyntaxIsSupported(metadata.transferSyntaxUid) || metadata.bigEndian) {
		return buildUnsupportedDicomResponse(metadata, "Формат файла снимка не поддерживается быстрым предпросмотром.", "Откройте снимок через внешний КТ-модуль или локальный обработчик для этого формата.");
	}

	const normalizedPhotometric = metadata.photometricInterpretation ?? "MONOCHROME2";
	metadata.photometricInterpretation = normalizedPhotometric;

	if (!metadata.rows || !metadata.columns || metadata.rows <= 0 || metadata.columns <= 0 || metadata.rows > 8192 || metadata.columns > 8192) {
		return buildUnsupportedDicomResponse(metadata, "Размер кадра не указан или слишком велик для быстрого предпросмотра.", "Откройте отдельный КТ-просмотрщик для такого размера изображения.");
	}
	if ((metadata.samplesPerPixel ?? 1) !== 1 || !["MONOCHROME1", "MONOCHROME2"].includes(normalizedPhotometric)) {
		return buildUnsupportedDicomResponse(metadata, "Быстрый предпросмотр открывает только серые стоматологические снимки.", "Откройте этот файл в полном просмотрщике: формат нестандартный для быстрого предпросмотра.");
	}
	if (metadata.bitsAllocated !== 8 && metadata.bitsAllocated !== 16) {
		return buildUnsupportedDicomResponse(metadata, "Глубина изображения не поддерживается быстрым предпросмотром.", "Откройте этот файл в полном просмотрщике снимков.");
	}

	const bytesPerPixel = metadata.bitsAllocated / 8;
	const expectedBytes = metadata.rows * metadata.columns * bytesPerPixel;
	if (metadata.pixelDataLength < expectedBytes || metadata.pixelDataOffset + expectedBytes > buffer.length) {
		return buildUnsupportedDicomResponse(metadata, "Данные первого кадра короче ожидаемого размера.", "Откройте полный КТ-просмотрщик: быстрый предпросмотр не может открыть этот кадр.");
	}

	const result = renderDicomPreviewImage(buffer, metadata, maxPreviewEdge);
	return {
		status: "ready", transferSyntaxUid: metadata.transferSyntaxUid, photometricInterpretation: normalizedPhotometric,
		sourceWidth: metadata.columns, sourceHeight: metadata.rows, bitsAllocated: metadata.bitsAllocated, bitsStored: metadata.bitsStored,
		pixelRepresentation: metadata.pixelRepresentation, windowCenter: result.finalCenter, windowWidth: result.finalWindow,
		imageDataUrl: result.imageDataUrl, width: result.width, height: result.height, previewGrayRange: result.grayRange,
		previewGrayMean: result.grayMean, warnings: result.finalWarnings,
		nextAction: "Используйте это только как быстрый ориентировочный предпросмотр; для диагностики нужен просмотрщик КТ-срезов.",
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
