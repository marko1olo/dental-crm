/**
 * DENTE CRM — CBCT CPU Slice Multi-Threaded Web Worker Bridge (FEAT-010)
 * Standards: DICOM Part 3 PS 3.3, Planmeca Romexis 6.x, Vatech Ez3D-i
 *
 * Bridge managing Web Worker lifecycle, asynchronous message dispatching,
 * zero-copy transferable ArrayBuffers, volume memory caching, and seamless
 * fallback to synchronous extraction in Node/SSR/CSP-restricted environments.
 */

import type { CbctVoxelVolume, MprPlane, MprSliceExtractionResult, Point3D, SlabProjectionMode } from "../cbctMprMath";
import type { ObliqueRotationAngles } from "../cbctObliqueMatrixMath";
import { extractObliqueMprSlice, type ObliqueSliceRenderOptions } from "../cbctObliqueSliceMath";
import { extractArchCrossSectionSeries, type CrossSectionSeriesOptions, type CrossSectionSliceData } from "../cbctCrossSectionResliceMath";
import type { DentalArchCurve } from "../cbctArchSplineMath";
import type { CbctWorkerInboundMessage, CbctWorkerOutboundMessage, DecodeDicomSliceTask, GenerateProgressiveLodPayload } from "./cbctSliceWorker";

import type {
	DecodedSliceResult,
	WorkerRenderSliceOptions,
	WorkerRenderSliceParams,
	WorkerRenderAllPlanesParams,
	WorkerCrossSectionSeriesParams,
	CbctWorkerBridgeOptions,
	PendingSingleSlice,
	PendingMultiPlane,
	PendingSeriesRequest,
	PendingDecodeRequest,
	PendingLodRequest,
} from "./cbctWorkerBridgeTypes";

export type {
	DecodeDicomSliceTask,
	GenerateProgressiveLodPayload,
	DecodedSliceResult,
	WorkerRenderSliceOptions,
	WorkerRenderSliceParams,
	WorkerRenderAllPlanesParams,
	WorkerCrossSectionSeriesParams,
	CbctWorkerBridgeOptions,
};

export class CbctWorkerBridge {
	private worker: Worker | null = null;
	private forceFallback: boolean;
	private isWorkerActive = false;
	private initializedVolumeId: string | null = null;
	private activeVolume: CbctVoxelVolume | null = null;
	private nextRequestId = 0;
	private latestRequestedId = 0;

	private pendingSingleRequests = new Map<number, PendingSingleSlice>();
	private pendingMultiRequests = new Map<number, PendingMultiPlane>();
	private pendingSeriesRequests = new Map<number, PendingSeriesRequest>();
	private pendingDecodeRequests = new Map<number, PendingDecodeRequest>();
	private pendingLodRequests = new Map<number, PendingLodRequest>();

	constructor(options?: CbctWorkerBridgeOptions) {
		this.forceFallback = options?.forceFallback ?? false;

		if (!this.forceFallback) {
			this.initializeWorker(options?.workerFactory);
		}
	}

	private initializeWorker(customFactory?: () => Worker): void {
		try {
			if (customFactory) {
				this.worker = customFactory();
				this.isWorkerActive = true;
				this.setupListeners();
			} else if (typeof Worker !== "undefined") {
				// Vite native module worker URL resolution
				this.worker = new Worker(
					new URL("./cbctSliceWorker.ts", import.meta.url),
					{ type: "module" },
				);
				this.isWorkerActive = true;
				this.setupListeners();
			} else {
				this.isWorkerActive = false;
				this.worker = null;
			}
		} catch (err) {
			console.warn(
				"[CbctWorkerBridge] Web Worker instantiation unavailable, falling back to main-thread rendering:",
				err,
			);
			this.isWorkerActive = false;
			this.worker = null;
		}
	}

	private setupListeners(): void {
		if (!this.worker) return;

		this.worker.onmessage = (event: MessageEvent<CbctWorkerOutboundMessage>) => {
			this.handleWorkerMessage(event.data);
		};

		this.worker.onerror = (err: ErrorEvent) => {
			console.error("[CbctWorkerBridge] Worker error encountered:", err.message);
			// Fail all pending requests with error
			for (const [, req] of this.pendingSingleRequests) {
				req.reject(new Error(`Worker execution error: ${err.message}`));
			}
			for (const [, req] of this.pendingMultiRequests) {
				req.reject(new Error(`Worker execution error: ${err.message}`));
			}
			for (const [, req] of this.pendingSeriesRequests) {
				req.reject(new Error(`Worker execution error: ${err.message}`));
			}
			for (const [, req] of this.pendingDecodeRequests) {
				req.reject(new Error(`Worker execution error: ${err.message}`));
			}
			for (const [, req] of this.pendingLodRequests) {
				req.reject(new Error(`Worker execution error: ${err.message}`));
			}
			this.pendingSingleRequests.clear();
			this.pendingMultiRequests.clear();
			this.pendingSeriesRequests.clear();
			this.pendingDecodeRequests.clear();
			this.pendingLodRequests.clear();
		};
	}

	public handleWorkerMessage(msg: CbctWorkerOutboundMessage): void {
		if (!msg || typeof msg !== "object") return;

		switch (msg.type) {
			case "VOLUME_INITIALIZED": {
				// Volume registration acknowledged
				break;
			}

			case "SLICE_RENDERED": {
				const pending = this.pendingSingleRequests.get(msg.requestId);
				if (pending) {
					this.pendingSingleRequests.delete(msg.requestId);
					pending.resolve({
						data: new Uint8ClampedArray(msg.pixelBuffer as ArrayBuffer),
						metadata: msg.metadata,
					});
				}
				break;
			}

			case "ALL_PLANES_RENDERED": {
				const pending = this.pendingMultiRequests.get(msg.requestId);
				if (pending) {
					this.pendingMultiRequests.delete(msg.requestId);
					pending.resolve({
						axial: {
							data: new Uint8ClampedArray(msg.slices.axial.pixelBuffer as ArrayBuffer),
							metadata: msg.slices.axial.metadata,
						},
						coronal: {
							data: new Uint8ClampedArray(msg.slices.coronal.pixelBuffer as ArrayBuffer),
							metadata: msg.slices.coronal.metadata,
						},
						sagittal: {
							data: new Uint8ClampedArray(msg.slices.sagittal.pixelBuffer as ArrayBuffer),
							metadata: msg.slices.sagittal.metadata,
						},
					});
				}
				break;
			}

			case "CROSS_SECTION_SERIES_RENDERED": {
				const pending = this.pendingSeriesRequests.get(msg.requestId);
				if (pending) {
					this.pendingSeriesRequests.delete(msg.requestId);
					pending.resolve(msg.slices);
				}
				break;
			}

			case "DICOM_SLICES_DECODED": {
				const pending = this.pendingDecodeRequests.get(msg.requestId);
				if (pending) {
					this.pendingDecodeRequests.delete(msg.requestId);
					pending.resolve(
						msg.results.map((r) => ({
							sliceIndex: r.sliceIndex,
							data: new Int16Array(r.pixelBuffer as ArrayBuffer),
							minHU: r.minHU,
							maxHU: r.maxHU,
						})),
					);
				}
				break;
			}

			case "PROGRESSIVE_LOD_GENERATED": {
				const pending = this.pendingLodRequests.get(msg.requestId);
				if (pending) {
					this.pendingLodRequests.delete(msg.requestId);
					pending.resolve(msg.volume);
				}
				break;
			}

			case "VOLUME_DISPOSED": {
				if (this.initializedVolumeId === msg.volumeId) {
					this.initializedVolumeId = null;
				}
				break;
			}

			case "ERROR": {
				if (msg.requestId !== undefined) {
					const pendingSingle = this.pendingSingleRequests.get(msg.requestId);
					if (pendingSingle) {
						this.pendingSingleRequests.delete(msg.requestId);
						pendingSingle.reject(new Error(msg.error));
					}
					const pendingMulti = this.pendingMultiRequests.get(msg.requestId);
					if (pendingMulti) {
						this.pendingMultiRequests.delete(msg.requestId);
						pendingMulti.reject(new Error(msg.error));
					}
					const pendingSeries = this.pendingSeriesRequests.get(msg.requestId);
					if (pendingSeries) {
						this.pendingSeriesRequests.delete(msg.requestId);
						pendingSeries.reject(new Error(msg.error));
					}
					const pendingDecode = this.pendingDecodeRequests.get(msg.requestId);
					if (pendingDecode) {
						this.pendingDecodeRequests.delete(msg.requestId);
						pendingDecode.reject(new Error(msg.error));
					}
					const pendingLod = this.pendingLodRequests.get(msg.requestId);
					if (pendingLod) {
						this.pendingLodRequests.delete(msg.requestId);
						pendingLod.reject(new Error(msg.error));
					}
				}
				break;
			}
		}
	}

	public isFallbackMode(): boolean {
		return this.forceFallback || !this.isWorkerActive || !this.worker;
	}

	public getActiveVolumeId(): string | null {
		return this.activeVolume?.id ?? null;
	}

	/**
	 * Registers a CBCT volume with the worker. If already initialized, skips redundant transfer.
	 */
	public initVolume(volume: CbctVoxelVolume): void {
		this.activeVolume = volume;

		if (this.isFallbackMode()) {
			this.initializedVolumeId = volume.id;
			return;
		}

		if (this.initializedVolumeId === volume.id) {
			return; // Volume already cached in worker memory
		}

		if (!volume.data || volume.isDisposed) {
			return;
		}

		const initMsg: CbctWorkerInboundMessage = {
			type: "INIT_VOLUME",
			volumeId: volume.id,
			dimensions: volume.dimensions,
			spacingMm: volume.spacingMm,
			originMm: volume.originMm,
			...(volume.physicalSizeMm ? { physicalSizeMm: volume.physicalSizeMm } : {}),
			minHU: volume.minHU,
			maxHU: volume.maxHU,
			...(volume.rescaleSlope !== undefined ? { rescaleSlope: volume.rescaleSlope } : {}),
			...(volume.rescaleIntercept !== undefined ? { rescaleIntercept: volume.rescaleIntercept } : {}),
			...(volume.defaultWindowWidth !== undefined ? { defaultWindowWidth: volume.defaultWindowWidth } : {}),
			...(volume.defaultWindowLevel !== undefined ? { defaultWindowLevel: volume.defaultWindowLevel } : {}),
			data: volume.data,
		};

		this.worker!.postMessage(initMsg);
		this.initializedVolumeId = volume.id;
	}

	/**
	 * Extracts an oblique slice asynchronously in the background worker, or synchronously in fallback mode.
	 */
	public renderSlice(params: WorkerRenderSliceParams): Promise<MprSliceExtractionResult> {
		const reqId = params.requestId ?? ++this.nextRequestId;
		this.latestRequestedId = Math.max(this.latestRequestedId, reqId);

		if (this.isFallbackMode()) {
			const renderOpts: ObliqueSliceRenderOptions = {
				windowWidth: params.options.windowWidth,
				windowLevel: params.options.windowLevel,
				...(params.options.invert !== undefined ? { invert: params.options.invert } : {}),
				...(params.options.slabMode !== undefined ? { slabMode: params.options.slabMode } : {}),
				...(params.options.slabThicknessMm !== undefined ? { slabThicknessMm: params.options.slabThicknessMm } : {}),
				...(params.options.interpolation !== undefined ? { interpolation: params.options.interpolation } : {}),
			};
			return Promise.resolve(
				extractObliqueMprSlice(
					params.volume,
					params.plane,
					params.crosshairMm,
					params.obliqueAngles,
					renderOpts,
				),
			);
		}

		if (this.initializedVolumeId !== params.volume.id) {
			this.initVolume(params.volume);
		}

		return new Promise<MprSliceExtractionResult>((resolve, reject) => {
			this.pendingSingleRequests.set(reqId, {
				resolve,
				reject,
				volumeId: params.volume.id,
				plane: params.plane,
			});

			const msg: CbctWorkerInboundMessage = {
				type: "RENDER_SLICE",
				requestId: reqId,
				volumeId: params.volume.id,
				plane: params.plane,
				crosshairMm: params.crosshairMm,
				angles: params.obliqueAngles,
				options: {
					windowWidth: params.options.windowWidth,
					windowLevel: params.options.windowLevel,
					...(params.options.invert !== undefined ? { invert: params.options.invert } : {}),
					...(params.options.slabMode !== undefined ? { slabMode: params.options.slabMode } : {}),
					...(params.options.slabThicknessMm !== undefined ? { slabThicknessMm: params.options.slabThicknessMm } : {}),
					...(params.options.interpolation !== undefined ? { interpolation: params.options.interpolation } : {}),
				},
			};

			this.worker!.postMessage(msg);
		});
	}

	/**
	 * Extracts all 3 orthogonal/oblique MPR planes (Axial, Coronal, Sagittal) synchronously or in background worker.
	 */
	public renderAllPlanes(
		params: WorkerRenderAllPlanesParams,
	): Promise<Record<MprPlane, MprSliceExtractionResult>> {
		const reqId = params.requestId ?? ++this.nextRequestId;
		this.latestRequestedId = Math.max(this.latestRequestedId, reqId);

		if (this.isFallbackMode()) {
			const renderOpts: ObliqueSliceRenderOptions = {
				windowWidth: params.options.windowWidth,
				windowLevel: params.options.windowLevel,
				...(params.options.invert !== undefined ? { invert: params.options.invert } : {}),
				...(params.options.slabMode !== undefined ? { slabMode: params.options.slabMode } : {}),
				...(params.options.slabThicknessMm !== undefined ? { slabThicknessMm: params.options.slabThicknessMm } : {}),
				...(params.options.interpolation !== undefined ? { interpolation: params.options.interpolation } : {}),
			};
			return Promise.resolve({
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
			});
		}

		if (this.initializedVolumeId !== params.volume.id) {
			this.initVolume(params.volume);
		}

		return new Promise<Record<MprPlane, MprSliceExtractionResult>>((resolve, reject) => {
			this.pendingMultiRequests.set(reqId, {
				resolve,
				reject,
				volumeId: params.volume.id,
			});

			const msg: CbctWorkerInboundMessage = {
				type: "RENDER_ALL_PLANES",
				requestId: reqId,
				volumeId: params.volume.id,
				crosshairMm: params.crosshairMm,
				angles: params.obliqueAngles,
				options: {
					windowWidth: params.options.windowWidth,
					windowLevel: params.options.windowLevel,
					...(params.options.invert !== undefined ? { invert: params.options.invert } : {}),
					...(params.options.slabMode !== undefined ? { slabMode: params.options.slabMode } : {}),
					...(params.options.slabThicknessMm !== undefined ? { slabThicknessMm: params.options.slabThicknessMm } : {}),
					...(params.options.interpolation !== undefined ? { interpolation: params.options.interpolation } : {}),
				},
			};

			this.worker!.postMessage(msg);
		});
	}

	/**
	 * Extracts a series of cross-sections along dental arch in background Web Worker with Transferable buffers.
	 * Returns 60 FPS responsive result without blocking main UI thread.
	 */
	public requestCrossSectionSeries(
		params: WorkerCrossSectionSeriesParams,
	): Promise<CrossSectionSliceData[]> {
		const reqId = params.requestId ?? ++this.nextRequestId;
		this.latestRequestedId = Math.max(this.latestRequestedId, reqId);

		if (this.isFallbackMode()) {
			return Promise.resolve(
				extractArchCrossSectionSeries(
					params.volume,
					params.archCurve,
					params.options ?? 2.0,
				),
			);
		}

		if (this.initializedVolumeId !== params.volume.id) {
			this.initVolume(params.volume);
		}

		return new Promise<CrossSectionSliceData[]>((resolve, reject) => {
			this.pendingSeriesRequests.set(reqId, {
				resolve,
				reject,
				volumeId: params.volume.id,
			});

			const msg: CbctWorkerInboundMessage = {
				type: "RENDER_CROSS_SECTION_SERIES",
				requestId: reqId,
				volumeId: params.volume.id,
				archCurve: params.archCurve,
				options: params.options,
			};

			this.worker!.postMessage(msg);
		});
	}

	/**
	 * Decompresses and calibrates a batch of DICOM slices in background worker with zero-copy Transferable ArrayBuffers,
	 * or synchronously in fallback mode without UI freeze.
	 */
	public decodeDicomSlices(
		tasks: DecodeDicomSliceTask[],
		transferInputBuffers = false,
	): Promise<DecodedSliceResult[]> {
		if (!tasks || tasks.length === 0) {
			return Promise.resolve([]);
		}

		if (this.isFallbackMode()) {
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
					const validEven = sliceBuf.byteLength - (sliceBuf.byteLength % 2);
					const safeBuf = validEven === sliceBuf.byteLength ? sliceBuf : sliceBuf.slice(0, validEven);
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

				results.push({
					sliceIndex,
					data: sliceData,
					minHU: localMin === 32767 ? 0 : localMin,
					maxHU: localMax === -32768 ? 0 : localMax,
				});
			}

			return Promise.resolve(results);
		}

		const reqId = ++this.nextRequestId;
		this.latestRequestedId = Math.max(this.latestRequestedId, reqId);

		return new Promise<DecodedSliceResult[]>((resolve, reject) => {
			this.pendingDecodeRequests.set(reqId, { resolve, reject });

			const transferList: Transferable[] = [];
			if (transferInputBuffers && typeof ArrayBuffer !== "undefined") {
				for (const t of tasks) {
					if (t.buffer instanceof ArrayBuffer) {
						transferList.push(t.buffer);
					}
				}
			}

			const msg: CbctWorkerInboundMessage = {
				type: "DECODE_DICOM_SLICES",
				requestId: reqId,
				tasks,
			};

			this.worker!.postMessage(msg, transferList);
		});
	}

	/**
	 * Generates a 2x downsampled preview volume (LOD 0) in worker thread or synchronous fallback.
	 */
	public generateProgressiveLod(
		payload: Omit<GenerateProgressiveLodPayload, "requestId">,
		transferInputBuffers = false,
	): Promise<CbctVoxelVolume> {
		if (this.isFallbackMode()) {
			const lodWidth = Math.max(1, Math.floor(payload.width / 2));
			const lodHeight = Math.max(1, Math.floor(payload.height / 2));
			const lodDepth = Math.max(1, payload.sampledSlices.length);
			const lodSpacingX = payload.spacingMm.x * 2;
			const lodSpacingY = payload.spacingMm.y * 2;
			const lodSpacingZ = (payload.depth * payload.spacingMm.z) / lodDepth;
			const totalLodVoxels = lodWidth * lodHeight * lodDepth;
			const lodData = new Int16Array(totalLodVoxels);

			const slope = Number.isFinite(payload.rescaleSlope) && payload.rescaleSlope > 0 ? payload.rescaleSlope : 1.0;
			const intercept = Number.isFinite(payload.rescaleIntercept) ? payload.rescaleIntercept : 0.0;
			const isLinearInteger = slope === 1.0 && Math.floor(intercept) === intercept;
			const intIntercept = intercept | 0;
			const bitsStored = payload.bitsStored > 0 && payload.bitsStored <= 16 ? payload.bitsStored : 16;
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
					const safeBuf = validEven === sliceBuf.byteLength ? sliceBuf : sliceBuf.slice(0, validEven);
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
						const hu = isLinearInteger ? ((val + intIntercept) | 0) : Math.round(val * slope + intercept);
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

			return Promise.resolve(lodVolume);
		}

		const reqId = ++this.nextRequestId;
		this.latestRequestedId = Math.max(this.latestRequestedId, reqId);

		return new Promise<CbctVoxelVolume>((resolve, reject) => {
			this.pendingLodRequests.set(reqId, { resolve, reject });

			const transferList: Transferable[] = [];
			if (transferInputBuffers && typeof ArrayBuffer !== "undefined") {
				for (const s of payload.sampledSlices) {
					if (s.buffer instanceof ArrayBuffer) {
						transferList.push(s.buffer);
					}
				}
			}

			const msg: CbctWorkerInboundMessage = {
				type: "GENERATE_PROGRESSIVE_LOD",
				requestId: reqId,
				...payload,
			};

			this.worker!.postMessage(msg, transferList);
		});
	}

	/**
	 * Disposes worker thread, clears memory caches and terminates pending promises.
	 */
	public dispose(): void {
		if (this.worker) {
			if (this.initializedVolumeId) {
				try {
					this.worker.postMessage({
						type: "DISPOSE_VOLUME",
						volumeId: this.initializedVolumeId,
					});
				} catch {
					// Ignore postMessage failure on closing worker
				}
			}
			this.worker.terminate();
			this.worker = null;
		}

		this.isWorkerActive = false;
		this.initializedVolumeId = null;
		this.activeVolume = null;

		for (const [, req] of this.pendingSingleRequests) {
			req.reject(new Error("CbctWorkerBridge disposed."));
		}
		for (const [, req] of this.pendingMultiRequests) {
			req.reject(new Error("CbctWorkerBridge disposed."));
		}
		for (const [, req] of this.pendingSeriesRequests) {
			req.reject(new Error("CbctWorkerBridge disposed."));
		}
		for (const [, req] of this.pendingDecodeRequests) {
			req.reject(new Error("CbctWorkerBridge disposed."));
		}
		for (const [, req] of this.pendingLodRequests) {
			req.reject(new Error("CbctWorkerBridge disposed."));
		}
		this.pendingSingleRequests.clear();
		this.pendingMultiRequests.clear();
		this.pendingSeriesRequests.clear();
		this.pendingDecodeRequests.clear();
		this.pendingLodRequests.clear();
	}

	public terminate(): void {
		this.dispose();
	}
}

// ─── OPTIONAL SHARED SINGLETON ───────────────────────────────────────────────

let sharedBridgeInstance: CbctWorkerBridge | null = null;

export function getSharedCbctWorkerBridge(): CbctWorkerBridge {
	if (!sharedBridgeInstance) {
		sharedBridgeInstance = new CbctWorkerBridge();
	}
	return sharedBridgeInstance;
}
