/**
 * realDicomVoxelIngestion.ts — Построение воксельного 3D-объема из буферов DICOM (Мандат 8b <= 120 строк).
 */

import type { CbctVoxelVolume } from "../cbctMprMath";
import { buildVolumeFromMultiFrameDicom, isMultiFrameDicom } from "../dicomMultiFrameLoader";
import { decodeSliceVoxels, parseDicomSliceHeader, isEncapsulatedTransferSyntax, type DicomSliceEntry } from "../dicomSliceHeaderParser";
import { decodeJpegLosslessSliceBuffer } from "./realDicomJpegDecoder";
import { organizeAndFilterDicomSlices } from "./realDicomSliceOrganizer";
import { uploadSliceTo3dTexture, yieldToEventLoop, type DicomVolumeIngestionOptions } from "./realDicomTypes";

function extractRawSlice(buf: ArrayBuffer, offset: number, count: number, isSigned: boolean, uid?: string): Int16Array | Uint16Array {
	if ((uid && isEncapsulatedTransferSyntax(uid)) || buf.byteLength < offset + count * 2) {
		const dec = decodeJpegLosslessSliceBuffer(buf);
		return dec && dec.length === count ? dec : new Uint16Array(count);
	}
	if (offset % 2 === 0 && buf.byteLength >= offset + count * 2) {
		return isSigned ? new Int16Array(buf, offset, count) : new Uint16Array(buf, offset, count);
	}
	const copy = buf.slice(offset, offset + count * 2);
	return isSigned ? new Int16Array(copy) : new Uint16Array(copy);
}

export async function buildVolumeFromDicomBuffers(
	items: Array<{ buffer: ArrayBuffer; fileName?: string | undefined }>,
	options?: ((percent: number, message: string) => void) | DicomVolumeIngestionOptions,
): Promise<CbctVoxelVolume> {
	if (!items || items.length === 0) throw new Error("Не передано ни одного буфера DICOM");
	const onProgress = typeof options === "function" ? options : options?.onProgress;
	const onSliceDecoded = typeof options === "object" ? options?.onSliceDecoded : undefined;
	const gpuTarget = typeof options === "object" ? options?.gpuUploadTarget : undefined;
	if (items.length === 1 && isMultiFrameDicom(items[0]!.buffer)) return buildVolumeFromMultiFrameDicom(items[0]!.buffer, options);

	onProgress?.(5, `Чтение заголовков ${items.length} срезов КЛКТ...`);
	const rawEntries: DicomSliceEntry[] = [];
	for (let i = 0; i < items.length; i++) {
		const buf = items[i]!.buffer;
		rawEntries.push({ header: parseDicomSliceHeader(buf), buffer: buf, fileName: items[i]!.fileName || `slice_${i}.dcm` });
		if (i % 15 === 0 || i === items.length - 1) {
			onProgress?.(5 + Math.round((i / items.length) * 35), `Прочитано ${i + 1} из ${items.length}...`);
			await yieldToEventLoop();
		}
	}

	const { validSlices, computedSpacingZ } = organizeAndFilterDicomSlices(rawEntries);
	const ref = validSlices[0]!.header;
	const width = ref.cols; const height = ref.rows; const depth = validSlices.length;
	const sliceVoxelCount = width * height; const voxelData = new Int16Array(sliceVoxelCount * depth);
	let minVoxelHU = Infinity; let maxVoxelHU = -Infinity;
	const flipX = ref.imageOrientationPatient?.[0] ? ref.imageOrientationPatient[0] < 0 : false;
	const flipY = ref.imageOrientationPatient?.[4] ? ref.imageOrientationPatient[4] > 0 : false;
	const slope = ref.rescaleSlope || 1.0; const intercept = ref.rescaleIntercept || 0.0;
	const isLinearInteger = slope === 1.0 && Number.isInteger(intercept);
	const intIntercept = intercept | 0; const isSigned = ref.pixelRepresentation === 1;
	const bitsStored = ref.bitsStored || 16; const mask = bitsStored < 16 ? (1 << bitsStored) - 1 : 0xffff;
	const signBit = bitsStored < 16 ? 1 << (bitsStored - 1) : 0x8000;
	const signExt = bitsStored < 16 ? 1 << bitsStored : 0x10000;

	for (let z = 0; z < depth; z++) {
		const entry = validSlices[z]!; const baseIdx = z * sliceVoxelCount;
		const rawSlice = extractRawSlice(entry.buffer!, entry.header.pixelDataByteOffset, sliceVoxelCount, isSigned, entry.header.transferSyntaxUid);
		const { minHU: localMin, maxHU: localMax } = decodeSliceVoxels({
			rawSlice, voxelData, baseIdx, sliceVoxelCount, width, height, bitsStored, isSigned,
			isLinearInteger, intIntercept, slope, intercept, mask, signBit, signExt, flipX, flipY,
		});
		if (localMin < minVoxelHU) minVoxelHU = localMin;
		if (localMax > maxVoxelHU) maxVoxelHU = localMax;
		if (gpuTarget?.gl && gpuTarget.texture) uploadSliceTo3dTexture(gpuTarget.gl, z, width, height, voxelData.subarray(baseIdx, baseIdx + sliceVoxelCount));
		onSliceDecoded?.(z, depth, voxelData.subarray(baseIdx, baseIdx + sliceVoxelCount));
		entry.buffer = null;
		if (z % 15 === 0 || z === depth - 1) {
			onProgress?.(45 + Math.round((z / depth) * 50), `Копирование слоя ${z + 1}/${depth} в VRAM...`);
			await yieldToEventLoop();
		}
	}

	onProgress?.(100, "КЛКТ исследование готово к 3D MPR просмотру");
	const pw = width * ref.pixelSpacing.x; const ph = height * ref.pixelSpacing.y; const pd = depth * computedSpacingZ;
	return {
		id: `dicom-series-${Date.now()}`, dimensions: { width, height, depth },
		spacingMm: { x: ref.pixelSpacing.x, y: ref.pixelSpacing.y, z: computedSpacingZ },
		originMm: { x: -pw * 0.5, y: -ph * 0.5, z: -pd * 0.5 },
		physicalSizeMm: { x: pw, y: ph, z: pd },
		data: voxelData, minHU: minVoxelHU, maxHU: maxVoxelHU,
		rescaleSlope: ref.rescaleSlope, rescaleIntercept: ref.rescaleIntercept,
		defaultWindowWidth: ref.windowWidth > 0 ? ref.windowWidth : 4400,
		defaultWindowLevel: ref.windowCenter !== 0 ? ref.windowCenter : 1300,
		imageOrientationPatient: ref.imageOrientationPatient,
		isFlippedX: flipX, isFlippedY: flipY, patientName: ref.patientName, isDisposed: false,
	};
}
