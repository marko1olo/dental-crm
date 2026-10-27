import {
	buildDicomPreviewRgba,
	createDicomPixelSampler,
	type DicomImageMetadata,
} from "../dicomParsing.js";
import { rgbaToPngDataUrl } from "./pngEncoder.js";

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
	let window = windowWidth && windowWidth > 1 ? windowWidth : Math.max(1, maxValue - minValue);

	let rendered = buildDicomPreviewRgba(width, height, r, c, invert, sampleValue, center, window);
	if (
		windowCenter &&
		windowWidth &&
		maxValue > minValue &&
		(rendered.grayMax - rendered.grayMin < 24 || rendered.grayMean < 8 || rendered.grayMean > 247)
	) {
		center = (minValue + maxValue) / 2;
		window = Math.max(1, maxValue - minValue);
		rendered = buildDicomPreviewRgba(width, height, r, c, invert, sampleValue, center, window);
		warnings.push("Окно снимка дало низкоконтрастный предпросмотр; использовано min/max окно по выборке.");
	}

	if (scale < 1) warnings.push(`Предпросмотр уменьшен с ${c}x${r} до ${width}x${height}.`);
	if (!windowCenter || !windowWidth) {
		warnings.push("Окно яркости/контраста отсутствовало; предпросмотр использовал min/max окно по выборке.");
	}

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
