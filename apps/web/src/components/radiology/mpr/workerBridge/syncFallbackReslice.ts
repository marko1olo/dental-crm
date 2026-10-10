/**
 * DENTE CRM — CBCT CPU Synchronous Reslice & Decode Fallbacks (FEAT-010)
 * Standards: DICOM Part 3 PS 3.3, Planmeca Romexis 6.x, Vatech Ez3D-i
 *
 * Deterministic CPU fallback algorithms executing in Node/SSR/CSP-restricted environments
 * or when Web Worker instantiation is unavailable.
 */

import type {
	CbctVoxelVolume,
	MprPlane,
	MprSliceExtractionResult,
} from "../../cbctMprMath";
import {
	extractObliqueMprSlice,
	type ObliqueSliceRenderOptions,
} from "../../cbctObliqueSliceMath";
import {
	extractArchCrossSectionSeries,
	type CrossSectionSliceData,
} from "../../cbctCrossSectionResliceMath";
import type {
	DecodeDicomSliceTask,
	DecodedSliceResult,
	GenerateProgressiveLodPayload,
	WorkerCrossSectionSeriesParams,
	WorkerRenderAllPlanesParams,
	WorkerRenderSliceParams,
} from "./types";

/**
 * Extracts a single oblique MPR slice synchronously on the main thread.
 */
export function syncExtractSingleSlice(
	params: WorkerRenderSliceParams,
): MprSliceExtractionResult {
	const renderOpts: ObliqueSliceRenderOptions = {
		windowWidth: params.options.windowWidth,
		windowLevel: params.options.windowLevel,
		...(params.options.invert !== undefined ? { invert: params.options.invert } : {}),
		...(params.options.slabMode !== undefined ? { slabMode: params.options.slabMode } : {}),
		...(params.options.slabThicknessMm !== undefined
			? { slabThicknessMm: params.options.slabThicknessMm }
			: {}),
		...(params.options.interpolation !== undefined
			? { interpolation: params.options.interpolation }
			: {}),
	};
	return extractObliqueMprSlice(
		params.volume,
		params.plane,
		params.crosshairMm,
		params.obliqueAngles,
		renderOpts,
	);
}

/**
 * Extracts all 3 orthogonal/oblique MPR planes (Axial, Coronal, Sagittal) synchronously.
 */
export function syncExtractAllPlanes(
	params: WorkerRenderAllPlanesParams,
): Record<MprPlane, MprSliceExtractionResult> {
	const renderOpts: ObliqueSliceRenderOptions = {
		windowWidth: params.options.windowWidth,
		windowLevel: params.options.windowLevel,
		...(params.options.invert !== undefined ? { invert: params.options.invert } : {}),
		...(params.options.slabMode !== undefined ? { slabMode: params.options.slabMode } : {}),
		...(params.options.slabThicknessMm !== undefined
			? { slabThicknessMm: params.options.slabThicknessMm }
			: {}),
		...(params.options.interpolation !== undefined
			? { interpolation: params.options.interpolation }
			: {}),
	};
	return {
		axial: extractObliqueMprSlice(
			params.volume,
			"axial",
			params.crosshairMm,
			params.obliqueAngles,
			renderOpts,
		),
		coronal: extractObliqueMprSlice(
			params.volume,
			"coronal",
			params.crosshairMm,
			params.obliqueAngles,
			renderOpts,
		),
		sagittal: extractObliqueMprSlice(
			params.volume,
			"sagittal",
			params.crosshairMm,
			params.obliqueAngles,
			renderOpts,
		),
	};
}

/**
 * Extracts dental arch cross-sections synchronously on the main thread.
 */
export function syncExtractCrossSectionSeries(
	params: WorkerCrossSectionSeriesParams,
): CrossSectionSliceData[] {
	return extractArchCrossSectionSeries(
		params.volume,
		params.archCurve,
		params.options ?? 2.0,
	);
}

/**
 * Decompresses and calibrates a batch of DICOM slices synchronously on the main thread.
 */
export function syncDecodeDicomSlices(
	tasks: DecodeDicomSliceTask[],
): DecodedSliceResult[] {
	if (!tasks || tasks.length === 0) {
		return [];
	}

	const results: DecodedSliceResult[] = [];
	for (const task of tasks) {
		const {
			sliceIndex,
			buffer,
			pixelDataByteOffset,
			width,
			height,
			bitsStored,
			isSigned,
			rescaleSlope,
			rescaleIntercept,
			flipX,
			flipY,
		} = task;

		const sliceVoxelCount = width * height;
		const slope =
			Number.isFinite(rescaleSlope) && rescaleSlope > 0 ? rescaleSlope : 1.0;
		const intercept = Number.isFinite(rescaleIntercept) ? rescaleIntercept : 0.0;
		const isLinearInteger = slope === 1.0 && Math.floor(intercept) === intercept;
		const intIntercept = intercept | 0;
		const mask = bitsStored < 16 ? (1 << bitsStored) - 1 : 0xffff;
		const signBit = bitsStored < 16 ? 1 << (bitsStored - 1) : 0x8000;
		const signExt = bitsStored < 16 ? 1 << bitsStored : 0x10000;

		let rawSlice: Int16Array | Uint16Array;
		if (
			pixelDataByteOffset % 2 === 0 &&
			buffer.byteLength >= pixelDataByteOffset + sliceVoxelCount * 2
		) {
			rawSlice = isSigned
				? new Int16Array(buffer, pixelDataByteOffset, sliceVoxelCount)
				: new Uint16Array(buffer, pixelDataByteOffset, sliceVoxelCount);
		} else {
			const sliceBuf = buffer.slice(
				pixelDataByteOffset,
				pixelDataByteOffset + sliceVoxelCount * 2,
			);
			const validEven = sliceBuf.byteLength - (sliceBuf.byteLength % 2);
			const safeBuf =
				validEven === sliceBuf.byteLength ? sliceBuf : sliceBuf.slice(0, validEven);
			rawSlice = isSigned ? new Int16Array(safeBuf) : new Uint16Array(safeBuf);
		}

		const sliceData = new Int16Array(sliceVoxelCount);
		let localMin = 32767;
		let localMax = -32768;

		if (!flipX && !flipY) {
			if (bitsStored >= 16) {
				if (isLinearInteger) {
					for (let i = 0; i < sliceVoxelCount; i++) {
						const val = (rawSlice[i]! + intIntercept) | 0;
						const hu = val < -32768 ? -32768 : val > 32767 ? 32767 : val;
						sliceData[i] = hu;
						if (hu < localMin) localMin = hu;
						if (hu > localMax) localMax = hu;
					}
				} else {
					for (let i = 0; i < sliceVoxelCount; i++) {
						let val = rawSlice[i]!;
						if (isSigned) val = (val << 16) >> 16;
						const hu = Math.round(val * slope + intercept);
						const clamped = hu < -32768 ? -32768 : hu > 32767 ? 32767 : hu;
						sliceData[i] = clamped;
						if (clamped < localMin) localMin = clamped;
						if (clamped > localMax) localMax = clamped;
					}
				}
			} else {
				for (let i = 0; i < sliceVoxelCount; i++) {
					let val = rawSlice[i]! & mask;
					if (isSigned && (val & signBit) !== 0) val -= signExt;
					const hu = isLinearInteger
						? ((val + intIntercept) | 0)
						: Math.round(val * slope + intercept);
					const clamped = hu < -32768 ? -32768 : hu > 32767 ? 32767 : hu;
					sliceData[i] = clamped;
					if (clamped < localMin) localMin = clamped;
					if (clamped > localMax) localMax = clamped;
				}
			}
		} else {
			for (let y = 0; y < height; y++) {
				const srcY = flipY ? height - 1 - y : y;
				const rowOffset = y * width;
				const srcRowOffset = srcY * width;
				for (let x = 0; x < width; x++) {
					const srcX = flipX ? width - 1 - x : x;
					const raw = rawSlice[srcRowOffset + srcX]!;
					let val = bitsStored < 16 ? raw & mask : raw;
					if (isSigned) {
						if (bitsStored < 16) {
							if ((val & signBit) !== 0) val -= signExt;
						} else {
							val = (val << 16) >> 16;
						}
					}
					const hu = isLinearInteger
						? ((val + intIntercept) | 0)
						: Math.round(val * slope + intercept);
					const clamped = hu < -32768 ? -32768 : hu > 32767 ? 32767 : hu;
					sliceData[rowOffset + x] = clamped;
					if (clamped < localMin) localMin = clamped;
					if (clamped > localMax) localMax = clamped;
				}
			}
		}

		results.push({
			sliceIndex,
			data: sliceData,
			minHU: localMin === 32767 ? 0 : localMin,
			maxHU: localMax === -32768 ? 0 : localMax,
		});
	}

	return results;
}

/**
 * Generates a 2x downsampled preview volume (LOD 0) synchronously on the main thread.
 */
export function syncGenerateProgressiveLod(
	payload: Omit<GenerateProgressiveLodPayload, "requestId">,
): CbctVoxelVolume {
	const lodWidth = Math.max(1, Math.floor(payload.width / 2));
	const lodHeight = Math.max(1, Math.floor(payload.height / 2));
	const lodDepth = Math.max(1, payload.sampledSlices.length);
	const lodSpacingX = payload.spacingMm.x * 2;
	const lodSpacingY = payload.spacingMm.y * 2;
	const lodSpacingZ = (payload.depth * payload.spacingMm.z) / lodDepth;
	const totalLodVoxels = lodWidth * lodHeight * lodDepth;
	const lodData = new Int16Array(totalLodVoxels);

	const slope =
		Number.isFinite(payload.rescaleSlope) && payload.rescaleSlope > 0
			? payload.rescaleSlope
			: 1.0;
	const intercept = Number.isFinite(payload.rescaleIntercept)
		? payload.rescaleIntercept
		: 0.0;
	const isLinearInteger = slope === 1.0 && Math.floor(intercept) === intercept;
	const intIntercept = intercept | 0;
	const bitsStored =
		payload.bitsStored > 0 && payload.bitsStored <= 16 ? payload.bitsStored : 16;
	const mask = bitsStored < 16 ? (1 << bitsStored) - 1 : 0xffff;
	const signBit = bitsStored < 16 ? 1 << (bitsStored - 1) : 0x8000;
	const signExt = bitsStored < 16 ? 1 << bitsStored : 0x10000;

	let minHU = 32767;
	let maxHU = -32768;

	for (let lz = 0; lz < lodDepth; lz++) {
		const sliceItem = payload.sampledSlices[lz]!;
		const buf = sliceItem.buffer;
		const off = sliceItem.pixelDataByteOffset;
		const srcSliceVoxelCount = payload.width * payload.height;

		let rawSlice: Int16Array | Uint16Array;
		if (off % 2 === 0 && buf.byteLength >= off + srcSliceVoxelCount * 2) {
			rawSlice = payload.isSigned
				? new Int16Array(buf, off, srcSliceVoxelCount)
				: new Uint16Array(buf, off, srcSliceVoxelCount);
		} else {
			const sliceBuf = buf.slice(off, off + srcSliceVoxelCount * 2);
			const validEven = sliceBuf.byteLength - (sliceBuf.byteLength % 2);
			const safeBuf =
				validEven === sliceBuf.byteLength ? sliceBuf : sliceBuf.slice(0, validEven);
			rawSlice = payload.isSigned ? new Int16Array(safeBuf) : new Uint16Array(safeBuf);
		}

		const dstSliceOffset = lz * (lodWidth * lodHeight);

		for (let ly = 0; ly < lodHeight; ly++) {
			const sy = ly * 2;
			const srcY = payload.flipY ? payload.height - 1 - sy : sy;
			const srcRow = srcY * payload.width;
			const dstRow = dstSliceOffset + ly * lodWidth;

			for (let lx = 0; lx < lodWidth; lx++) {
				const sx = lx * 2;
				const srcX = payload.flipX ? payload.width - 1 - sx : sx;
				const raw = rawSlice[srcRow + srcX]!;
				let val = bitsStored < 16 ? raw & mask : raw;
				if (payload.isSigned) {
					if (bitsStored < 16) {
						if ((val & signBit) !== 0) val -= signExt;
					} else {
						val = (val << 16) >> 16;
					}
				}
				const hu = isLinearInteger
					? ((val + intIntercept) | 0)
					: Math.round(val * slope + intercept);
				const clamped = hu < -32768 ? -32768 : hu > 32767 ? 32767 : hu;
				lodData[dstRow + lx] = clamped;
				if (clamped < minHU) minHU = clamped;
				if (clamped > maxHU) maxHU = clamped;
			}
		}
	}

	const lodVolume: CbctVoxelVolume = {
		id: `lod0-${payload.seriesId}`,
		dimensions: { width: lodWidth, height: lodHeight, depth: lodDepth },
		spacingMm: { x: lodSpacingX, y: lodSpacingY, z: lodSpacingZ },
		originMm: payload.originMm,
		physicalSizeMm: payload.physicalSizeMm,
		data: lodData,
		minHU: minHU === 32767 ? 0 : minHU,
		maxHU: maxHU === -32768 ? 0 : maxHU,
		rescaleSlope: payload.rescaleSlope,
		rescaleIntercept: payload.rescaleIntercept,
		defaultWindowWidth: payload.defaultWindowWidth ?? 4400,
		defaultWindowLevel: payload.defaultWindowLevel ?? 1300,
		isDisposed: false,
	};

	return lodVolume;
}
