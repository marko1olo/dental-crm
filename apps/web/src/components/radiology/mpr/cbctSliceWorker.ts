/**
 * DENTE CRM — CBCT CPU Slice Multi-Threaded Web Worker Engine (FEAT-010)
 * Standards: DICOM Part 3 PS 3.3, Planmeca Romexis 6.x, Vatech Ez3D-i
 *
 * Runs computationally intensive 3D sub-voxel trilinear MPR slice extraction
 * in a dedicated background Web Worker thread, eliminating main thread UI freezes.
 *
 * Capabilities:
 * 1. Zero-copy transferable ArrayBuffer pixel pipeline for 60 FPS responsiveness.
 * 2. In-worker voxel volume caching to eliminate redundant data transfer.
 * 3. Arbitrary oblique angle rotation and slab thickness (MIP/MinIP/Average).
 * 4. Exported pure message handler for deterministic testing in Node/SSR.
 */

import type {
	CbctVoxelVolume,
	MprPlane,
	MprSliceMetadata,
	Point3D,
	SlabProjectionMode,
} from "../cbctMprMath";
import type { ObliqueRotationAngles } from "../cbctObliqueMatrixMath";
import {
	extractObliqueMprSlice,
	type ObliqueSliceRenderOptions,
} from "../cbctObliqueSliceMath";
import {
	extractArchCrossSectionSeries,
	type CrossSectionSeriesOptions,
	type CrossSectionSliceData,
} from "../cbctCrossSectionResliceMath";
import type { DentalArchCurve } from "../cbctArchSplineMath";

// ─── MESSAGE PROTOCOL TYPES ──────────────────────────────────────────────────

export interface InitVolumePayload {
	volumeId: string;
	dimensions: { width: number; height: number; depth: number };
	spacingMm: { x: number; y: number; z: number };
	originMm: Point3D;
	physicalSizeMm?: { x: number; y: number; z: number } | undefined;
	data: Int16Array;
	minHU: number;
	maxHU: number;
	rescaleSlope?: number | undefined;
	rescaleIntercept?: number | undefined;
	defaultWindowWidth?: number | undefined;
	defaultWindowLevel?: number | undefined;
}

export interface RenderSlicePayload {
	requestId: number;
	volumeId: string;
	plane: MprPlane;
	crosshairMm: Point3D;
	angles: ObliqueRotationAngles;
	options: {
		windowWidth: number;
		windowLevel: number;
		invert?: boolean | undefined;
		slabMode?: SlabProjectionMode | undefined;
		slabThicknessMm?: number | undefined;
		interpolation?: "nearest" | "trilinear" | undefined;
	};
}

export interface RenderAllPlanesPayload {
	requestId: number;
	volumeId: string;
	crosshairMm: Point3D;
	angles: ObliqueRotationAngles;
	options: {
		windowWidth: number;
		windowLevel: number;
		invert?: boolean | undefined;
		slabMode?: SlabProjectionMode | undefined;
		slabThicknessMm?: number | undefined;
		interpolation?: "nearest" | "trilinear" | undefined;
	};
}

export interface DisposeVolumePayload {
	volumeId: string;
}

export interface RenderCrossSectionSeriesPayload {
	requestId: number;
	volumeId: string;
	archCurve: DentalArchCurve;
	options?: CrossSectionSeriesOptions | undefined;
}

export interface DecodeDicomSliceTask {
	sliceIndex: number;
	buffer: ArrayBuffer;
	pixelDataByteOffset: number;
	width: number;
	height: number;
	bitsStored: number;
	isSigned: boolean;
	rescaleSlope: number;
	rescaleIntercept: number;
	flipX?: boolean | undefined;
	flipY?: boolean | undefined;
}

export interface DecodeDicomSlicesPayload {
	requestId: number;
	tasks: DecodeDicomSliceTask[];
}

export interface GenerateProgressiveLodPayload {
	requestId: number;
	seriesId: string;
	width: number;
	height: number;
	depth: number;
	spacingMm: { x: number; y: number; z: number };
	originMm: Point3D;
	physicalSizeMm: { x: number; y: number; z: number };
	rescaleSlope: number;
	rescaleIntercept: number;
	defaultWindowWidth?: number | undefined;
	defaultWindowLevel?: number | undefined;
	bitsStored: number;
	isSigned: boolean;
	flipX?: boolean | undefined;
	flipY?: boolean | undefined;
	sampledSlices: Array<{
		lodZ: number;
		buffer: ArrayBuffer;
		pixelDataByteOffset: number;
	}>;
}

export interface AbortRequestPayload {
	requestId: number;
	plane?: MprPlane | undefined;
	volumeId?: string | undefined;
}

export type CbctWorkerInboundMessage =
	| ({ type: "INIT_VOLUME" } & InitVolumePayload)
	| ({ type: "RENDER_SLICE" } & RenderSlicePayload)
	| ({ type: "RENDER_ALL_PLANES" } & RenderAllPlanesPayload)
	| ({ type: "RENDER_CROSS_SECTION_SERIES" } & RenderCrossSectionSeriesPayload)
	| ({ type: "DECODE_DICOM_SLICES" } & DecodeDicomSlicesPayload)
	| ({ type: "GENERATE_PROGRESSIVE_LOD" } & GenerateProgressiveLodPayload)
	| ({ type: "DISPOSE_VOLUME" } & DisposeVolumePayload)
	| ({ type: "ABORT_REQUEST" } & AbortRequestPayload);

export type CbctWorkerOutboundMessage =
	| {
			type: "VOLUME_INITIALIZED";
			volumeId: string;
	  }
	| {
			type: "SLICE_RENDERED";
			requestId: number;
			volumeId: string;
			plane: MprPlane;
			metadata: MprSliceMetadata;
			pixelBuffer: ArrayBufferLike;
	  }
	| {
			type: "ALL_PLANES_RENDERED";
			requestId: number;
			volumeId: string;
			slices: {
				axial: { metadata: MprSliceMetadata; pixelBuffer: ArrayBufferLike };
				coronal: { metadata: MprSliceMetadata; pixelBuffer: ArrayBufferLike };
				sagittal: { metadata: MprSliceMetadata; pixelBuffer: ArrayBufferLike };
			};
	  }
	| {
			type: "REQUEST_ABORTED";
			requestId: number;
			plane?: MprPlane | undefined;
	  }
	| {
			type: "CROSS_SECTION_SERIES_RENDERED";
			requestId: number;
			volumeId: string;
			slices: CrossSectionSliceData[];
	  }
	| {
			type: "DICOM_SLICES_DECODED";
			requestId: number;
			results: Array<{
				sliceIndex: number;
				pixelBuffer: ArrayBufferLike;
				minHU: number;
				maxHU: number;
			}>;
	  }
	| {
			type: "PROGRESSIVE_LOD_GENERATED";
			requestId: number;
			volume: CbctVoxelVolume;
	  }
	| {
			type: "VOLUME_DISPOSED";
			volumeId: string;
	  }
	| {
			type: "ERROR";
			requestId?: number | undefined;
			volumeId?: string | undefined;
			error: string;
	  };

// ─── WORKER CACHE & MESSAGE HANDLER ──────────────────────────────────────────

export const workerVolumeCache = new Map<string, CbctVoxelVolume>();
export const cancelledRequestIds = new Set<number>();

export function clearCancelledRequests(): void {
	cancelledRequestIds.clear();
}

/**
 * Pure message processing function decoupled from worker globals.
 * Enables 100% deterministic test coverage in Node.js and headless environments.
 */
export function handleWorkerMessage(
	msg: CbctWorkerInboundMessage,
	postMessage: (response: CbctWorkerOutboundMessage, transfer?: Transferable[]) => void,
	cache: Map<string, CbctVoxelVolume> = workerVolumeCache,
): void {
	if (!msg || typeof msg !== "object" || !("type" in msg)) {
		postMessage({
			type: "ERROR",
			error: "Invalid worker message: missing type property.",
		});
		return;
	}

	switch (msg.type) {
		case "INIT_VOLUME": {
			try {
				const vol: CbctVoxelVolume = {
					id: msg.volumeId,
					dimensions: msg.dimensions,
					spacingMm: msg.spacingMm,
					originMm: msg.originMm,
					physicalSizeMm: msg.physicalSizeMm ?? {
						x: msg.dimensions.width * msg.spacingMm.x,
						y: msg.dimensions.height * msg.spacingMm.y,
						z: msg.dimensions.depth * msg.spacingMm.z,
					},
					data: msg.data,
					minHU: msg.minHU,
					maxHU: msg.maxHU,
					...(msg.rescaleSlope !== undefined ? { rescaleSlope: msg.rescaleSlope } : {}),
					...(msg.rescaleIntercept !== undefined ? { rescaleIntercept: msg.rescaleIntercept } : {}),
					...(msg.defaultWindowWidth !== undefined ? { defaultWindowWidth: msg.defaultWindowWidth } : {}),
					...(msg.defaultWindowLevel !== undefined ? { defaultWindowLevel: msg.defaultWindowLevel } : {}),
					isDisposed: false,
				};
				cache.set(msg.volumeId, vol);
				postMessage({
					type: "VOLUME_INITIALIZED",
					volumeId: msg.volumeId,
				});
			} catch (err) {
				postMessage({
					type: "ERROR",
					volumeId: msg.volumeId,
					error: `Failed to initialize volume: ${err instanceof Error ? err.message : String(err)}`,
				});
			}
			break;
		}

		case "ABORT_REQUEST": {
			cancelledRequestIds.add(msg.requestId);
			postMessage({
				type: "REQUEST_ABORTED",
				requestId: msg.requestId,
				...(msg.plane ? { plane: msg.plane } : {}),
			});
			break;
		}

		case "RENDER_SLICE": {
			// Pre-flight check: drop stale aborted request before touching 3D volume or interpolating
			if (cancelledRequestIds.has(msg.requestId)) {
				cancelledRequestIds.delete(msg.requestId);
				postMessage({
					type: "REQUEST_ABORTED",
					requestId: msg.requestId,
					plane: msg.plane,
				});
				return;
			}

			const vol = cache.get(msg.volumeId);
			if (!vol || !vol.data || vol.isDisposed) {
				postMessage({
					type: "ERROR",
					requestId: msg.requestId,
					volumeId: msg.volumeId,
					error: `Volume "${msg.volumeId}" is not cached or has been disposed.`,
				});
				return;
			}

			try {
				const renderOpts: ObliqueSliceRenderOptions = {
					windowWidth: msg.options.windowWidth,
					windowLevel: msg.options.windowLevel,
					...(msg.options.invert !== undefined ? { invert: msg.options.invert } : {}),
					...(msg.options.slabMode !== undefined ? { slabMode: msg.options.slabMode } : {}),
					...(msg.options.slabThicknessMm !== undefined ? { slabThicknessMm: msg.options.slabThicknessMm } : {}),
					...(msg.options.interpolation !== undefined ? { interpolation: msg.options.interpolation } : {}),
					isAborted: () => cancelledRequestIds.has(msg.requestId),
				};

				const result = extractObliqueMprSlice(
					vol,
					msg.plane,
					msg.crosshairMm,
					msg.angles,
					renderOpts,
				);

				const pixelBuffer = result.data.buffer;
				const transferList: Transferable[] =
					typeof ArrayBuffer !== "undefined" && pixelBuffer instanceof ArrayBuffer
						? [pixelBuffer]
						: [];

				postMessage(
					{
						type: "SLICE_RENDERED",
						requestId: msg.requestId,
						volumeId: msg.volumeId,
						plane: msg.plane,
						metadata: result.metadata,
						pixelBuffer,
					},
					transferList,
				);
			} catch (err) {
				if (err instanceof Error && err.message === "OPERATION_ABORTED") {
					cancelledRequestIds.delete(msg.requestId);
					postMessage({
						type: "REQUEST_ABORTED",
						requestId: msg.requestId,
						plane: msg.plane,
					});
					return;
				}
				postMessage({
					type: "ERROR",
					requestId: msg.requestId,
					volumeId: msg.volumeId,
					error: `Failed to render slice: ${err instanceof Error ? err.message : String(err)}`,
				});
			}
			break;
		}

		case "RENDER_ALL_PLANES": {
			// Pre-flight check: drop stale aborted multi-plane render before extracting 3 oblique planes
			if (cancelledRequestIds.has(msg.requestId)) {
				cancelledRequestIds.delete(msg.requestId);
				postMessage({
					type: "REQUEST_ABORTED",
					requestId: msg.requestId,
				});
				return;
			}

			const vol = cache.get(msg.volumeId);
			if (!vol || !vol.data || vol.isDisposed) {
				postMessage({
					type: "ERROR",
					requestId: msg.requestId,
					volumeId: msg.volumeId,
					error: `Volume "${msg.volumeId}" is not cached or has been disposed.`,
				});
				return;
			}

			try {
				const renderOpts: ObliqueSliceRenderOptions = {
					windowWidth: msg.options.windowWidth,
					windowLevel: msg.options.windowLevel,
					...(msg.options.invert !== undefined ? { invert: msg.options.invert } : {}),
					...(msg.options.slabMode !== undefined ? { slabMode: msg.options.slabMode } : {}),
					...(msg.options.slabThicknessMm !== undefined ? { slabThicknessMm: msg.options.slabThicknessMm } : {}),
					...(msg.options.interpolation !== undefined ? { interpolation: msg.options.interpolation } : {}),
					isAborted: () => cancelledRequestIds.has(msg.requestId),
				};

				const axialRes = extractObliqueMprSlice(vol, "axial", msg.crosshairMm, msg.angles, renderOpts);
				if (cancelledRequestIds.has(msg.requestId)) {
					cancelledRequestIds.delete(msg.requestId);
					postMessage({ type: "REQUEST_ABORTED", requestId: msg.requestId });
					return;
				}

				const coronalRes = extractObliqueMprSlice(vol, "coronal", msg.crosshairMm, msg.angles, renderOpts);
				if (cancelledRequestIds.has(msg.requestId)) {
					cancelledRequestIds.delete(msg.requestId);
					postMessage({ type: "REQUEST_ABORTED", requestId: msg.requestId });
					return;
				}

				const sagittalRes = extractObliqueMprSlice(vol, "sagittal", msg.crosshairMm, msg.angles, renderOpts);

				const axialBuf = axialRes.data.buffer;
				const coronalBuf = coronalRes.data.buffer;
				const sagittalBuf = sagittalRes.data.buffer;

				const transferList: Transferable[] = [];
				if (typeof ArrayBuffer !== "undefined") {
					if (axialBuf instanceof ArrayBuffer) transferList.push(axialBuf);
					if (coronalBuf instanceof ArrayBuffer) transferList.push(coronalBuf);
					if (sagittalBuf instanceof ArrayBuffer) transferList.push(sagittalBuf);
				}

				postMessage(
					{
						type: "ALL_PLANES_RENDERED",
						requestId: msg.requestId,
						volumeId: msg.volumeId,
						slices: {
							axial: { metadata: axialRes.metadata, pixelBuffer: axialBuf },
							coronal: { metadata: coronalRes.metadata, pixelBuffer: coronalBuf },
							sagittal: { metadata: sagittalRes.metadata, pixelBuffer: sagittalBuf },
						},
					},
					transferList,
				);
			} catch (err) {
				if (err instanceof Error && err.message === "OPERATION_ABORTED") {
					cancelledRequestIds.delete(msg.requestId);
					postMessage({
						type: "REQUEST_ABORTED",
						requestId: msg.requestId,
					});
					return;
				}
				postMessage({
					type: "ERROR",
					requestId: msg.requestId,
					volumeId: msg.volumeId,
					error: `Failed to render all planes: ${err instanceof Error ? err.message : String(err)}`,
				});
			}
			break;
		}

		case "RENDER_CROSS_SECTION_SERIES": {
			const vol = cache.get(msg.volumeId);
			if (!vol || !vol.data || vol.isDisposed) {
				postMessage({
					type: "ERROR",
					requestId: msg.requestId,
					volumeId: msg.volumeId,
					error: `Volume "${msg.volumeId}" is not cached or has been disposed.`,
				});
				return;
			}

			try {
				const slices = extractArchCrossSectionSeries(vol, msg.archCurve, msg.options);
				const transferList: Transferable[] = [];
				if (typeof ArrayBuffer !== "undefined") {
					for (const slice of slices) {
						if (slice.pixelData && slice.pixelData.buffer instanceof ArrayBuffer) {
							transferList.push(slice.pixelData.buffer);
						}
					}
				}

				postMessage(
					{
						type: "CROSS_SECTION_SERIES_RENDERED",
						requestId: msg.requestId,
						volumeId: msg.volumeId,
						slices,
					},
					transferList,
				);
			} catch (err) {
				postMessage({
					type: "ERROR",
					requestId: msg.requestId,
					volumeId: msg.volumeId,
					error: `Failed to render cross section series: ${err instanceof Error ? err.message : String(err)}`,
				});
			}
			break;
		}

		case "DECODE_DICOM_SLICES": {
			try {
				const results: Array<{
					sliceIndex: number;
					pixelBuffer: ArrayBufferLike;
					minHU: number;
					maxHU: number;
				}> = [];
				const transferList: Transferable[] = [];

				for (const task of msg.tasks) {
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
					const slope = Number.isFinite(rescaleSlope) && rescaleSlope > 0 ? rescaleSlope : 1.0;
					const intercept = Number.isFinite(rescaleIntercept) ? rescaleIntercept : 0.0;
					const isLinearInteger = slope === 1.0 && Math.floor(intercept) === intercept;
					const intIntercept = intercept | 0;
					const mask = bitsStored < 16 ? (1 << bitsStored) - 1 : 0xffff;
					const signBit = bitsStored < 16 ? 1 << (bitsStored - 1) : 0x8000;
					const signExt = bitsStored < 16 ? 1 << bitsStored : 0x10000;

					let rawSlice: Int16Array | Uint16Array;
					if (pixelDataByteOffset % 2 === 0 && buffer.byteLength >= pixelDataByteOffset + sliceVoxelCount * 2) {
						rawSlice = isSigned
							? new Int16Array(buffer, pixelDataByteOffset, sliceVoxelCount)
							: new Uint16Array(buffer, pixelDataByteOffset, sliceVoxelCount);
					} else {
						const sliceBuf = buffer.slice(pixelDataByteOffset, pixelDataByteOffset + sliceVoxelCount * 2);
						const validEvenLength = sliceBuf.byteLength - (sliceBuf.byteLength % 2);
						const safeBuf = validEvenLength === sliceBuf.byteLength ? sliceBuf : sliceBuf.slice(0, validEvenLength);
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
								const hu = isLinearInteger ? ((val + intIntercept) | 0) : Math.round(val * slope + intercept);
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
								const hu = isLinearInteger ? ((val + intIntercept) | 0) : Math.round(val * slope + intercept);
								const clamped = hu < -32768 ? -32768 : hu > 32767 ? 32767 : hu;
								sliceData[rowOffset + x] = clamped;
								if (clamped < localMin) localMin = clamped;
								if (clamped > localMax) localMax = clamped;
							}
						}
					}

					const buf = sliceData.buffer;
					if (typeof ArrayBuffer !== "undefined" && buf instanceof ArrayBuffer) {
						transferList.push(buf);
					}
					results.push({
						sliceIndex,
						pixelBuffer: buf,
						minHU: localMin === 32767 ? 0 : localMin,
						maxHU: localMax === -32768 ? 0 : localMax,
					});
				}

				postMessage(
					{
						type: "DICOM_SLICES_DECODED",
						requestId: msg.requestId,
						results,
					},
					transferList,
				);
			} catch (err) {
				postMessage({
					type: "ERROR",
					requestId: msg.requestId,
					error: `Failed to decode DICOM slices: ${err instanceof Error ? err.message : String(err)}`,
				});
			}
			break;
		}

		case "GENERATE_PROGRESSIVE_LOD": {
			try {
				const lodWidth = Math.max(1, Math.floor(msg.width / 2));
				const lodHeight = Math.max(1, Math.floor(msg.height / 2));
				const lodDepth = Math.max(1, msg.sampledSlices.length);
				const lodSpacingX = msg.spacingMm.x * 2;
				const lodSpacingY = msg.spacingMm.y * 2;
				const lodSpacingZ = (msg.depth * msg.spacingMm.z) / lodDepth;
				const totalLodVoxels = lodWidth * lodHeight * lodDepth;
				const lodData = new Int16Array(totalLodVoxels);

				const slope = Number.isFinite(msg.rescaleSlope) && msg.rescaleSlope > 0 ? msg.rescaleSlope : 1.0;
				const intercept = Number.isFinite(msg.rescaleIntercept) ? msg.rescaleIntercept : 0.0;
				const isLinearInteger = slope === 1.0 && Math.floor(intercept) === intercept;
				const intIntercept = intercept | 0;
				const bitsStored = msg.bitsStored > 0 && msg.bitsStored <= 16 ? msg.bitsStored : 16;
				const mask = bitsStored < 16 ? (1 << bitsStored) - 1 : 0xffff;
				const signBit = bitsStored < 16 ? 1 << (bitsStored - 1) : 0x8000;
				const signExt = bitsStored < 16 ? 1 << bitsStored : 0x10000;

				let minHU = 32767;
				let maxHU = -32768;

				for (let lz = 0; lz < lodDepth; lz++) {
					const sliceItem = msg.sampledSlices[lz]!;
					const buf = sliceItem.buffer;
					const off = sliceItem.pixelDataByteOffset;
					const srcSliceVoxelCount = msg.width * msg.height;

					let rawSlice: Int16Array | Uint16Array;
					if (off % 2 === 0 && buf.byteLength >= off + srcSliceVoxelCount * 2) {
						rawSlice = msg.isSigned
							? new Int16Array(buf, off, srcSliceVoxelCount)
							: new Uint16Array(buf, off, srcSliceVoxelCount);
					} else {
						const sliceBuf = buf.slice(off, off + srcSliceVoxelCount * 2);
						const validEven = sliceBuf.byteLength - (sliceBuf.byteLength % 2);
						const safeBuf = validEven === sliceBuf.byteLength ? sliceBuf : sliceBuf.slice(0, validEven);
						rawSlice = msg.isSigned ? new Int16Array(safeBuf) : new Uint16Array(safeBuf);
					}

					const dstSliceOffset = lz * (lodWidth * lodHeight);

					for (let ly = 0; ly < lodHeight; ly++) {
						const sy = ly * 2;
						const srcY = msg.flipY ? msg.height - 1 - sy : sy;
						const srcRow = srcY * msg.width;
						const dstRow = dstSliceOffset + ly * lodWidth;

						for (let lx = 0; lx < lodWidth; lx++) {
							const sx = lx * 2;
							const srcX = msg.flipX ? msg.width - 1 - sx : sx;
							const raw = rawSlice[srcRow + srcX]!;
							let val = bitsStored < 16 ? raw & mask : raw;
							if (msg.isSigned) {
								if (bitsStored < 16) {
									if ((val & signBit) !== 0) val -= signExt;
								} else {
									val = (val << 16) >> 16;
								}
							}
							const hu = isLinearInteger ? ((val + intIntercept) | 0) : Math.round(val * slope + intercept);
							const clamped = hu < -32768 ? -32768 : hu > 32767 ? 32767 : hu;
							lodData[dstRow + lx] = clamped;
							if (clamped < minHU) minHU = clamped;
							if (clamped > maxHU) maxHU = clamped;
						}
					}
				}

				const lodVolume: CbctVoxelVolume = {
					id: `lod0-${msg.seriesId}`,
					dimensions: { width: lodWidth, height: lodHeight, depth: lodDepth },
					spacingMm: { x: lodSpacingX, y: lodSpacingY, z: lodSpacingZ },
					originMm: msg.originMm,
					physicalSizeMm: msg.physicalSizeMm,
					data: lodData,
					minHU: minHU === 32767 ? 0 : minHU,
					maxHU: maxHU === -32768 ? 0 : maxHU,
					rescaleSlope: msg.rescaleSlope,
					rescaleIntercept: msg.rescaleIntercept,
					defaultWindowWidth: msg.defaultWindowWidth ?? 4400,
					defaultWindowLevel: msg.defaultWindowLevel ?? 1300,
					isDisposed: false,
				};

				const transferList: Transferable[] = [];
				if (typeof ArrayBuffer !== "undefined" && lodData.buffer instanceof ArrayBuffer) {
					transferList.push(lodData.buffer);
				}

				postMessage(
					{
						type: "PROGRESSIVE_LOD_GENERATED",
						requestId: msg.requestId,
						volume: lodVolume,
					},
					transferList,
				);
			} catch (err) {
				postMessage({
					type: "ERROR",
					requestId: msg.requestId,
					error: `Failed to generate progressive LOD volume: ${err instanceof Error ? err.message : String(err)}`,
				});
			}
			break;
		}

		case "DISPOSE_VOLUME": {
			cancelledRequestIds.clear();
			const vol = cache.get(msg.volumeId);
			if (vol) {
				vol.data = null;
				(vol as { isDisposed: boolean }).isDisposed = true;
				cache.delete(msg.volumeId);
			}
			postMessage({
				type: "VOLUME_DISPOSED",
				volumeId: msg.volumeId,
			});
			break;
		}

		default: {
			const unknownMsg = msg as { type?: string };
			postMessage({
				type: "ERROR",
				error: `Unrecognized message type: "${unknownMsg.type}"`,
			});
			break;
		}
	}
}

// ─── AUTOMATIC WORKER RUNTIME HOOK ───────────────────────────────────────────

const isDedicatedWorkerScope =
	typeof self !== "undefined" &&
	typeof (self as unknown as { postMessage?: unknown }).postMessage === "function" &&
	typeof (self as unknown as { document?: unknown }).document === "undefined";

if (isDedicatedWorkerScope) {
	self.onmessage = (event: MessageEvent<CbctWorkerInboundMessage>) => {
		handleWorkerMessage(
			event.data,
			(response, transfer) => {
				if (transfer && transfer.length > 0) {
					(self as unknown as { postMessage: (msg: unknown, transfer: Transferable[]) => void }).postMessage(
						response,
						transfer,
					);
				} else {
					(self as unknown as { postMessage: (msg: unknown) => void }).postMessage(response);
				}
			},
			workerVolumeCache,
		);
	};
}
