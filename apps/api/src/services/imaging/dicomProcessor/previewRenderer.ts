/**
 * previewRenderer.ts — Layer 1: Генерация превью DICOM (RGBA буфер, дискретизация пикселей, расчет CRC32 и упаковка в PNG DataURL).
 */

import { deflateSync } from "node:zlib";
import {
	dicomTransferSyntaxIsSupported,
	extractDicomMetadata,
} from "./headerParser.js";
import type {
	DicomFirstFramePixelParse,
	DicomImageMetadata,
} from "./types.js";

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

export function buildPngChunk(type: string, data: Buffer) {
	const typeBuffer = Buffer.from(type, "ascii");
	const length = Buffer.alloc(4);
	length.writeUInt32BE(data.length, 0);
	const crc = Buffer.alloc(4);
	crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
	return Buffer.concat([length, typeBuffer, data, crc]);
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
		const needed = bitsAllocated === 16 ? 2 : 1;
		if (offset < 0 || offset + needed > buffer.length) {
			return 0;
		}
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
