import { dicomMetadataTags, type DicomHeaderMetadata } from "../imagingConstants.js";
import {
	normalizeDicomUid,
	normalizeModality,
	parseInstanceNumber,
} from "../manifestParser.js";
import {
	cleanDicomText,
	normalizeDicomDate,
	parseDicomPixelSpacing,
	parseDicomUnsignedInt,
	readDicomDsNumber,
	readDicomUs,
	walkDicomTags,
} from "./dicomTagCoreReader.js";

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
		pixelSpacing: null,
		sliceThickness: null,
		warnings,
	};
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
	else if (tagKey === "00280030") {
		const spacing = parseDicomPixelSpacing(valueBuffer);
		if (spacing) metadata.pixelSpacing = spacing;
	} else if (tagKey === "00180050") {
		const text = cleanDicomText(valueBuffer);
		if (text) {
			const num = Number.parseFloat(text.split(/[\\/]/)[0]?.trim() ?? "");
			if (Number.isFinite(num)) {
				metadata.sliceThickness = num;
			}
		}
	} else if (value) {
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
	walkDicomTags(
		buffer,
		{
			maxIterations: 4096,
			onIndefiniteLength: "break_with_warning",
			onIndefiniteWarning: (tagKey) => {
				metadata.warnings.push(
					`Элемент метаданных снимка ${tagKey} с неопределенной длиной пропущен.`,
				);
			},
			onTransferSyntax: ({ transferSyntaxUid, bigEndian }) => {
				metadata.transferSyntaxUid = transferSyntaxUid;
				if (bigEndian) {
					metadata.warnings.push(
						"Обнаружен big-endian transfer syntax; предпросмотр метаданных выполнен в best-effort режиме.",
					);
				}
			},
		},
		({ tagKey, value }) => {
			if (dicomMetadataTags.has(tagKey)) {
				assignDicomHeaderValue(metadata, tagKey, value);
				metadata.tagsRead += 1;
			}
		},
	);

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
	pixelSpacing?: [number, number] | null | undefined;
	sliceThickness?: number | null | undefined;
	imageDataUrl: string | null;
	width: number | null;
	height: number | null;
	previewGrayRange?: number;
	previewGrayMean?: number;
	warnings: string[];
	nextAction: string;
};

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
	pixelSpacing?: [number, number] | null | undefined;
	sliceThickness?: number | null | undefined;
	pixelDataOffset: number;
	pixelDataLength: number;
	warnings: string[];
	isCompressed?: boolean;
}

export function extractDicomMetadata(
	buffer: Buffer,
	warnings: string[],
): DicomImageMetadata | null {
	let photometricInterpretation: string | null = null;
	let rows: number | null = null;
	let columns: number | null = null;
	let bitsAllocated: number | null = null;
	let bitsStored: number | null = null;
	let pixelRepresentation: number | null = null;
	let samplesPerPixel: number | null = null;
	let windowCenter: number | null = null;
	let windowWidth: number | null = null;
	let pixelSpacing: [number, number] | null = null;
	let sliceThickness: number | null = null;
	let rescaleIntercept = 0;
	let rescaleSlope = 1;
	let pixelDataOffset = -1;
	let pixelDataLength = 0;
	let isCompressed = false;

	const syntaxState = walkDicomTags(
		buffer,
		{
			maxIterations: 100_000,
			onIndefiniteLength: "break_with_warning",
			onIndefiniteWarning: (tagKey) => {
				warnings.push(
					`Элемент метаданных снимка ${tagKey} с неопределенной длиной пропущен.`,
				);
			},
			onPixelData: (pixel) => {
				if (pixel.indefinite) {
					isCompressed = true;
				} else {
					pixelDataOffset = pixel.valueOffset;
					pixelDataLength = pixel.valueLength;
				}
			},
		},
		({ tagKey, value, bigEndian }) => {
			if (tagKey === "00280002") samplesPerPixel = readDicomUs(value, bigEndian);
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
			else if (tagKey === "00280030") {
				const spacing = parseDicomPixelSpacing(value);
				if (spacing) pixelSpacing = spacing;
			} else if (tagKey === "00180050") {
				sliceThickness = readDicomDsNumber(value);
			}
		},
	);

	return {
		explicitVr: syntaxState.explicitVr,
		bigEndian: syntaxState.bigEndian,
		transferSyntaxUid: syntaxState.transferSyntaxUid,
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
		pixelSpacing,
		sliceThickness,
		pixelDataOffset: isCompressed ? -1 : pixelDataOffset,
		pixelDataLength: isCompressed ? 0 : pixelDataLength,
		warnings,
		...(isCompressed ? { isCompressed: true } : {}),
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
		pixelSpacing: metadata.pixelSpacing ?? null,
		sliceThickness: metadata.sliceThickness ?? null,
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
		const uval =
			bitsAllocated === 16
				? buffer.readUInt16LE(offset)
				: buffer.readUInt8(offset);
		const masked = uval & mask;
		const raw =
			pixelRepresentation === 1 && masked & signBit
				? masked - (1 << stored)
				: masked;
		return raw * rescaleSlope + rescaleIntercept;
	};
}
