/**
 * DENTE CRM — CBCT CPU Slice Multi-Threaded Web Worker Bridge (FEAT-010)
 * Standards: DICOM Part 3 PS 3.3, Planmeca Romexis 6.x, Vatech Ez3D-i
 *
 * Bridge managing Web Worker lifecycle, asynchronous message dispatching,
 * zero-copy transferable ArrayBuffers, volume memory caching, and seamless
 * fallback to synchronous extraction in Node/SSR/CSP-restricted environments.
 */

import type {
	CbctVoxelVolume,
	MprPlane,
	MprSliceExtractionResult,
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
import type {
	CbctWorkerInboundMessage,
	CbctWorkerOutboundMessage,
} from "./cbctSliceWorker";

export interface WorkerRenderSliceOptions {
	windowWidth: number;
	windowLevel: number;
	invert?: boolean | undefined;
	slabMode?: SlabProjectionMode | undefined;
	slabThicknessMm?: number | undefined;
	interpolation?: "nearest" | "trilinear" | undefined;
}

export interface WorkerRenderSliceParams {
	volume: CbctVoxelVolume;
	plane: MprPlane;
	crosshairMm: Point3D;
	obliqueAngles: ObliqueRotationAngles;
	options: WorkerRenderSliceOptions;
	requestId?: number | undefined;
}

export interface WorkerRenderAllPlanesParams {
	volume: CbctVoxelVolume;
	crosshairMm: Point3D;
	obliqueAngles: ObliqueRotationAngles;
	options: WorkerRenderSliceOptions;
	requestId?: number | undefined;
}

export interface WorkerCrossSectionSeriesParams {
	volume: CbctVoxelVolume;
	archCurve: DentalArchCurve;
	options?: CrossSectionSeriesOptions | undefined;
	requestId?: number | undefined;
}

export interface CbctWorkerBridgeOptions {
	forceFallback?: boolean | undefined;
	workerFactory?: (() => Worker) | undefined;
}

interface PendingSingleSlice {
	resolve: (value: MprSliceExtractionResult) => void;
	reject: (reason: Error) => void;
	volumeId: string;
	plane: MprPlane;
}

interface PendingMultiPlane {
	resolve: (value: Record<MprPlane, MprSliceExtractionResult>) => void;
	reject: (reason: Error) => void;
	volumeId: string;
}

interface PendingSeriesRequest {
	resolve: (value: CrossSectionSliceData[]) => void;
	reject: (reason: Error) => void;
	volumeId: string;
}

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
			this.pendingSingleRequests.clear();
			this.pendingMultiRequests.clear();
			this.pendingSeriesRequests.clear();
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
		this.pendingSingleRequests.clear();
		this.pendingMultiRequests.clear();
		this.pendingSeriesRequests.clear();
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
