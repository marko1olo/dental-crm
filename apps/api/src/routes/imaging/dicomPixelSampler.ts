import {
	dicomFirstFramePreviewResponseSchema,
	type DicomFirstFramePreviewResponse,
} from "@dental/shared";
import type { DicomImageMetadata } from "./dicomHeaderParser.js";

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
	bitsStored?: number | null,
): (index: number) => number {
	const requiredBytes = bitsAllocated === 16 ? 2 : 1;
	const bufLen = buffer.length;
	const stored =
		bitsStored && bitsStored > 0 && bitsStored <= bitsAllocated
			? bitsStored
			: bitsAllocated;
	const mask = (1 << stored) - 1;
	const signBit = 1 << (stored - 1);

	return (index: number) => {
		const offset = pixelDataOffset + index * bytesPerPixel;
		if (offset < 0 || offset + requiredBytes > bufLen) {
			return rescaleIntercept;
		}
		let raw: number;
		if (bitsAllocated === 16) {
			const uval = buffer.readUInt16LE(offset);
			if (pixelRepresentation === 1) {
				const masked = uval & mask;
				raw = masked & signBit ? masked - (1 << stored) : masked;
			} else {
				raw = uval & mask;
			}
		} else {
			const uval = buffer.readUInt8(offset);
			if (pixelRepresentation === 1) {
				const masked = uval & mask;
				raw = masked & signBit ? masked - (1 << stored) : masked;
			} else {
				raw = uval & mask;
			}
		}
		return raw * rescaleSlope + rescaleIntercept;
	};
}
