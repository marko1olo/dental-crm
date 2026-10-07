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
import { calculateDynamicWorkerPoolSize } from "@dental/shared";
import type { CbctWorkerInboundMessage, CbctWorkerOutboundMessage, DecodeDicomSliceTask, GenerateProgressiveLodPayload } from "./cbctSliceWorker";

import {
	type DecodedSliceResult,
	type WorkerRenderSliceOptions,
	type WorkerRenderSliceParams,
	type WorkerRenderAllPlanesParams,
	type WorkerCrossSectionSeriesParams,
	type CbctWorkerBridgeOptions,
	type PendingSingleSlice,
	type PendingMultiPlane,
	type PendingSeriesRequest,
	type PendingDecodeRequest,
	type PendingLodRequest,
	type QueuedSingleSlice,
	type QueuedMultiPlane,
	StaleSliceRequestError,
	isStaleSliceRequestError,
} from "./cbctWorkerBridgeTypes";

export { StaleSliceRequestError, isStaleSliceRequestError };

export type {
	DecodeDicomSliceTask,
	GenerateProgressiveLodPayload,
	DecodedSliceResult,
	WorkerRenderSliceOptions,
	WorkerRenderSliceParams,
	WorkerRenderAllPlanesParams,
	WorkerCrossSectionSeriesParams,
	CbctWorkerBridgeOptions,
	QueuedSingleSlice,
	QueuedMultiPlane,
};

export class CbctWorkerBridge {
	private workers: Worker[] = [];
	private workerPoolSize = 1;
	private roundRobinIndex = 0;
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

	// ─── MPR QUEUE & IN-FLIGHT SCRUBBING OPTIMIZER ─────────────────────────────
	private inFlightSingleByPlane = new Map<MprPlane, { requestId: number; worker: Worker; abortNotified?: boolean }>();
	private queuedSingleByPlane = new Map<MprPlane, QueuedSingleSlice>();

	private inFlightMulti: { requestId: number; worker: Worker; abortNotified?: boolean } | null = null;
	private queuedMulti: QueuedMultiPlane | null = null;

	constructor(options?: CbctWorkerBridgeOptions) {
		this.forceFallback = options?.forceFallback ?? false;

		const concurrency =
			typeof navigator !== "undefined" && typeof navigator.hardwareConcurrency === "number"
				? navigator.hardwareConcurrency
				: 4;
		const defaultPool = options?.workerFactory
			? (options?.poolSize ?? 1)
			: calculateDynamicWorkerPoolSize(concurrency);
		this.workerPoolSize = Math.max(1, options?.poolSize ?? defaultPool);

		if (!this.forceFallback) {
			this.initializeWorkers(options?.workerFactory);
		}
	}

	private initializeWorkers(customFactory?: () => Worker): void {
		try {
			this.workers = [];
			for (let i = 0; i < this.workerPoolSize; i++) {
				let w: Worker | null = null;
				if (customFactory) {
					w = customFactory();
				} else if (typeof Worker !== "undefined") {
					// Vite native module worker URL resolution
					w = new Worker(
						new URL("./cbctSliceWorker.ts", import.meta.url),
						{ type: "module" },
					);
				}
				if (w) {
					this.setupWorkerListeners(w);
					this.workers.push(w);
				}
			}
			this.isWorkerActive = this.workers.length > 0;
		} catch (err) {
			console.warn(
				"[CbctWorkerBridge] Web Worker instantiation unavailable, falling back to main-thread rendering:",
				err,
			);
			this.isWorkerActive = false;
			this.workers = [];
		}
	}

	private setupWorkerListeners(worker: Worker): void {
		worker.onmessage = (event: MessageEvent<CbctWorkerOutboundMessage>) => {
			this.handleWorkerMessage(event.data);
		};

		worker.onerror = (err: ErrorEvent) => {
			console.error("[CbctWorkerBridge] Worker error encountered:", err.message);
			// Fail all pending requests with error
			for (const [, req] of this.pendingSingleRequests) {
				req.onAbortCleanup?.();
				req.reject(new Error(`Worker execution error: ${err.message}`));
			}
			for (const [, req] of this.pendingMultiRequests) {
				req.onAbortCleanup?.();
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
			for (const [, q] of this.queuedSingleByPlane) {
				q.onAbortCleanup?.();
				q.reject(new Error(`Worker execution error: ${err.message}`));
			}
			if (this.queuedMulti) {
				this.queuedMulti.onAbortCleanup?.();
				this.queuedMulti.reject(new Error(`Worker execution error: ${err.message}`));
				this.queuedMulti = null;
			}
			this.pendingSingleRequests.clear();
			this.pendingMultiRequests.clear();
			this.pendingSeriesRequests.clear();
			this.pendingDecodeRequests.clear();
			this.pendingLodRequests.clear();
			this.queuedSingleByPlane.clear();
			this.inFlightSingleByPlane.clear();
			this.inFlightMulti = null;
		};
	}

	public getNextWorker(): Worker {
		if (this.workers.length === 0) {
			throw new Error("CbctWorkerBridge: No active workers in pool.");
		}
		const w = this.workers[this.roundRobinIndex % this.workers.length]!;
		this.roundRobinIndex = (this.roundRobinIndex + 1) % this.workers.length;
		return w;
	}

	public getPoolSize(): number {
		return this.workers.length;
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
					pending.onAbortCleanup?.();
					this.pendingSingleRequests.delete(msg.requestId);
					pending.resolve({
						data: new Uint8ClampedArray(msg.pixelBuffer as ArrayBuffer),
						metadata: msg.metadata,
					});
				}
				const plane = msg.metadata?.plane ?? msg.plane;
				if (plane) {
					const inFlight = this.inFlightSingleByPlane.get(plane);
					if (inFlight && inFlight.requestId === msg.requestId) {
						this.inFlightSingleByPlane.delete(plane);
						(this as any).drainNextQueuedSlice(plane);
					}
				}
				break;
			}

			case "ALL_PLANES_RENDERED": {
				const pending = this.pendingMultiRequests.get(msg.requestId);
				if (pending) {
					pending.onAbortCleanup?.();
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
				if (this.inFlightMulti && this.inFlightMulti.requestId === msg.requestId) {
					this.inFlightMulti = null;
					(this as any).drainNextQueuedMulti();
				}
				break;
			}

			case "REQUEST_ABORTED": {
				const pendingSingle = this.pendingSingleRequests.get(msg.requestId);
				if (pendingSingle) {
					pendingSingle.onAbortCleanup?.();
					this.pendingSingleRequests.delete(msg.requestId);
					pendingSingle.reject(new StaleSliceRequestError(msg.requestId, pendingSingle.plane));
				}
				const plane = msg.plane ?? pendingSingle?.plane;
				if (plane) {
					const inFlight = this.inFlightSingleByPlane.get(plane);
					if (inFlight && inFlight.requestId === msg.requestId) {
						this.inFlightSingleByPlane.delete(plane);
						(this as any).drainNextQueuedSlice(plane);
					}
				}
				const pendingMulti = this.pendingMultiRequests.get(msg.requestId);
				if (pendingMulti) {
					pendingMulti.onAbortCleanup?.();
					this.pendingMultiRequests.delete(msg.requestId);
					pendingMulti.reject(new StaleSliceRequestError(msg.requestId));
				}
				if (this.inFlightMulti && this.inFlightMulti.requestId === msg.requestId) {
					this.inFlightMulti = null;
					(this as any).drainNextQueuedMulti();
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
						pendingSingle.onAbortCleanup?.();
						this.pendingSingleRequests.delete(msg.requestId);
						pendingSingle.reject(new Error(msg.error));
						const inFlight = this.inFlightSingleByPlane.get(pendingSingle.plane);
						if (inFlight && inFlight.requestId === msg.requestId) {
							this.inFlightSingleByPlane.delete(pendingSingle.plane);
							(this as any).drainNextQueuedSlice(pendingSingle.plane);
						}
					}
					const pendingMulti = this.pendingMultiRequests.get(msg.requestId);
					if (pendingMulti) {
						pendingMulti.onAbortCleanup?.();
						this.pendingMultiRequests.delete(msg.requestId);
						pendingMulti.reject(new Error(msg.error));
						if (this.inFlightMulti && this.inFlightMulti.requestId === msg.requestId) {
							this.inFlightMulti = null;
							(this as any).drainNextQueuedMulti();
						}
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
		return this.forceFallback || !this.isWorkerActive || this.workers.length === 0;
	}

	public getActiveVolumeId(): string | null {
		return this.activeVolume?.id ?? null;
	}

	/**
	 * Registers a CBCT volume with the worker pool. Broadcasts to all workers so each has volume cached in memory.
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

		for (const w of this.workers) {
			w.postMessage(initMsg);
		}
		this.initializedVolumeId = volume.id;
	}

	/**
	 * Cancels all pending single-slice requests for the given plane whose requestId < currentRequestId.
	 */
	public supersedePendingSingleSlice(plane: MprPlane, currentRequestId: number): void {
		const queued = this.queuedSingleByPlane.get(plane);
		if (queued && queued.requestId < currentRequestId) {
			this.queuedSingleByPlane.delete(plane);
			queued.onAbortCleanup?.();
			queued.reject(new StaleSliceRequestError(queued.requestId, plane));
		}

		for (const [id, req] of this.pendingSingleRequests) {
			if (id < currentRequestId && req.plane === plane) {
				req.onAbortCleanup?.();
				this.pendingSingleRequests.delete(id);
				this.notifyWorkersAbort(id, plane);
				req.reject(new StaleSliceRequestError(id, plane));
			}
		}

		const inFlight = this.inFlightSingleByPlane.get(plane);
		if (inFlight && inFlight.requestId < currentRequestId) {
			this.notifyWorkersAbort(inFlight.requestId, plane);
		}
	}

	/**
	 * Cancels all pending multi-plane requests whose requestId < currentRequestId.
	 */
	public supersedePendingAllPlanes(currentRequestId: number): void {
		if (this.queuedMulti && this.queuedMulti.requestId < currentRequestId) {
			const q = this.queuedMulti;
			this.queuedMulti = null;
			q.onAbortCleanup?.();
			q.reject(new StaleSliceRequestError(q.requestId));
		}

		for (const [id, req] of this.pendingMultiRequests) {
			if (id < currentRequestId) {
				req.onAbortCleanup?.();
				this.pendingMultiRequests.delete(id);
				this.notifyWorkersAbort(id);
				req.reject(new StaleSliceRequestError(id));
			}
		}

		if (this.inFlightMulti && this.inFlightMulti.requestId < currentRequestId) {
			this.notifyWorkersAbort(this.inFlightMulti.requestId);
		}
	}

	/**
	 * Manually abort a specific in-flight or queued request.
	 */
	public abortRequest(requestId: number, plane?: MprPlane): void {
		if (plane) {
			const queued = this.queuedSingleByPlane.get(plane);
			if (queued && queued.requestId === requestId) {
				this.queuedSingleByPlane.delete(plane);
				queued.onAbortCleanup?.();
				queued.reject(new StaleSliceRequestError(requestId, plane));
			}
		} else {
			for (const [p, queued] of this.queuedSingleByPlane) {
				if (queued.requestId === requestId) {
					this.queuedSingleByPlane.delete(p);
					queued.onAbortCleanup?.();
					queued.reject(new StaleSliceRequestError(requestId, p));
				}
			}
		}

		if (this.queuedMulti && this.queuedMulti.requestId === requestId) {
			const q = this.queuedMulti;
			this.queuedMulti = null;
			q.onAbortCleanup?.();
			q.reject(new StaleSliceRequestError(requestId));
		}

		const pendingSingle = this.pendingSingleRequests.get(requestId);
		if (pendingSingle) {
			const targetPlane = plane ?? pendingSingle.plane;
			pendingSingle.onAbortCleanup?.();
			this.pendingSingleRequests.delete(requestId);
			this.notifyWorkersAbort(requestId, targetPlane);
			pendingSingle.reject(new StaleSliceRequestError(requestId, targetPlane));

			const inFlight = this.inFlightSingleByPlane.get(targetPlane);
			if (inFlight && inFlight.requestId === requestId) {
				this.inFlightSingleByPlane.delete(targetPlane);
				this.drainNextQueuedSlice(targetPlane);
			}
		}

		const pendingMulti = this.pendingMultiRequests.get(requestId);
		if (pendingMulti) {
			pendingMulti.onAbortCleanup?.();
			this.pendingMultiRequests.delete(requestId);
			this.notifyWorkersAbort(requestId);
			pendingMulti.reject(new StaleSliceRequestError(requestId));

			if (this.inFlightMulti && this.inFlightMulti.requestId === requestId) {
				this.inFlightMulti = null;
				this.drainNextQueuedMulti();
			}
		}
	}

	/**
	 * Sends an ABORT_REQUEST notification to all active workers so they drop the request pre-flight.
	 */
	public notifyWorkersAbort(requestId: number, plane?: MprPlane): void {
		if (this.isFallbackMode()) return;
		const abortMsg: CbctWorkerInboundMessage = {
			type: "ABORT_REQUEST",
			requestId,
			...(plane ? { plane } : {}),
		};
		for (const w of this.workers) {
			try {
				w.postMessage(abortMsg);
			} catch {
				// Ignore if worker is closed or unreachable
			}
		}
	}

	private dispatchSingleSlice(
		reqId: number,
		params: WorkerRenderSliceParams,
		existingPromise?: {
			resolve: (val: MprSliceExtractionResult) => void;
			reject: (err: Error) => void;
			onAbortCleanup?: () => void;
		},
	): Promise<MprSliceExtractionResult> {
		const worker = this.getNextWorker();
		this.inFlightSingleByPlane.set(params.plane, { requestId: reqId, worker, abortNotified: false });

		const setupPendingAndPost = (
			resolve: (val: MprSliceExtractionResult) => void,
			reject: (err: Error) => void,
		) => {
			const pendingEntry: PendingSingleSlice = {
				requestId: reqId,
				resolve,
				reject,
				volumeId: params.volume.id,
				plane: params.plane,
			};

			if (params.signal) {
				const onAbort = () => {
					this.abortRequest(reqId, params.plane);
				};
				params.signal.addEventListener("abort", onAbort, { once: true });
				pendingEntry.onAbortCleanup = () => {
					params.signal?.removeEventListener("abort", onAbort);
				};
			}

			this.pendingSingleRequests.set(reqId, pendingEntry);

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

			worker.postMessage(msg);
		};

		if (existingPromise) {
			setupPendingAndPost(existingPromise.resolve, existingPromise.reject);
			return Promise.resolve(undefined as unknown as MprSliceExtractionResult);
		}

		return new Promise<MprSliceExtractionResult>((resolve, reject) => {
			setupPendingAndPost(resolve, reject);
		});
	}

	private drainNextQueuedSlice(plane: MprPlane): void {
		this.inFlightSingleByPlane.delete(plane);

		const nextQueued = this.queuedSingleByPlane.get(plane);
		if (!nextQueued) {
			return;
		}

		this.queuedSingleByPlane.delete(plane);
		nextQueued.onAbortCleanup?.();

		if (nextQueued.params.signal?.aborted) {
			nextQueued.reject(new StaleSliceRequestError(nextQueued.requestId, plane));
			this.drainNextQueuedSlice(plane);
			return;
		}

		this.dispatchSingleSlice(nextQueued.requestId, nextQueued.params, {
			resolve: nextQueued.resolve,
			reject: nextQueued.reject,
		});
	}

	/**
	 * Extracts an oblique slice asynchronously in the background worker, or synchronously in fallback mode.
	 * Drops earlier stale requests in queue for the same plane when supersedePrevious is enabled (default true).
	 */
	public renderSlice(params: WorkerRenderSliceParams): Promise<MprSliceExtractionResult> {
		const reqId = params.requestId ?? ++this.nextRequestId;
		this.latestRequestedId = Math.max(this.latestRequestedId, reqId);

		if (params.signal?.aborted) {
			return Promise.reject(new StaleSliceRequestError(reqId, params.plane));
		}

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

		if (params.supersedePrevious !== false) {
			const existingQueued = this.queuedSingleByPlane.get(params.plane);
			if (existingQueued) {
				existingQueued.onAbortCleanup?.();
				this.queuedSingleByPlane.delete(params.plane);
				existingQueued.reject(new StaleSliceRequestError(existingQueued.requestId, params.plane));
			}

			const currentInFlight = this.inFlightSingleByPlane.get(params.plane);
			if (currentInFlight) {
				if (!currentInFlight.abortNotified) {
					this.notifyWorkersAbort(currentInFlight.requestId, params.plane);
					currentInFlight.abortNotified = true;
				}

				return new Promise<MprSliceExtractionResult>((resolve, reject) => {
					const queuedEntry: QueuedSingleSlice = {
						requestId: reqId,
						params,
						resolve,
						reject,
					};

					if (params.signal) {
						const onAbort = () => {
							const q = this.queuedSingleByPlane.get(params.plane);
							if (q && q.requestId === reqId) {
								this.queuedSingleByPlane.delete(params.plane);
								q.onAbortCleanup?.();
								q.reject(new StaleSliceRequestError(reqId, params.plane));
							}
						};
						params.signal.addEventListener("abort", onAbort, { once: true });
						queuedEntry.onAbortCleanup = () => {
							params.signal?.removeEventListener("abort", onAbort);
						};
					}

					this.queuedSingleByPlane.set(params.plane, queuedEntry);
				});
			}
		}

		return this.dispatchSingleSlice(reqId, params);
	}

	private dispatchMultiPlanes(
		reqId: number,
		params: WorkerRenderAllPlanesParams,
		existingPromise?: {
			resolve: (val: Record<MprPlane, MprSliceExtractionResult>) => void;
			reject: (err: Error) => void;
			onAbortCleanup?: () => void;
		},
	): Promise<Record<MprPlane, MprSliceExtractionResult>> {
		const worker = this.getNextWorker();
		this.inFlightMulti = { requestId: reqId, worker, abortNotified: false };

		const setupPendingAndPost = (
			resolve: (val: Record<MprPlane, MprSliceExtractionResult>) => void,
			reject: (err: Error) => void,
		) => {
			const pendingEntry: PendingMultiPlane = {
				requestId: reqId,
				resolve,
				reject,
				volumeId: params.volume.id,
			};

			if (params.signal) {
				const onAbort = () => {
					this.abortRequest(reqId);
				};
				params.signal.addEventListener("abort", onAbort, { once: true });
				pendingEntry.onAbortCleanup = () => {
					params.signal?.removeEventListener("abort", onAbort);
				};
			}

			this.pendingMultiRequests.set(reqId, pendingEntry);

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

			worker.postMessage(msg);
		};

		if (existingPromise) {
			setupPendingAndPost(existingPromise.resolve, existingPromise.reject);
			return Promise.resolve(undefined as unknown as Record<MprPlane, MprSliceExtractionResult>);
		}

		return new Promise<Record<MprPlane, MprSliceExtractionResult>>((resolve, reject) => {
			setupPendingAndPost(resolve, reject);
		});
	}

	private drainNextQueuedMulti(): void {
		this.inFlightMulti = null;

		const nextQueued = this.queuedMulti;
		if (!nextQueued) {
			return;
		}

		this.queuedMulti = null;
		nextQueued.onAbortCleanup?.();

		if (nextQueued.params.signal?.aborted) {
			nextQueued.reject(new StaleSliceRequestError(nextQueued.requestId));
			this.drainNextQueuedMulti();
			return;
		}

		this.dispatchMultiPlanes(nextQueued.requestId, nextQueued.params, {
			resolve: nextQueued.resolve,
			reject: nextQueued.reject,
		});
	}

	/**
	 * Extracts all 3 orthogonal/oblique MPR planes (Axial, Coronal, Sagittal) synchronously or in background worker pool.
	 * If pool size >= 3, dispatches planes in parallel across CPU cores.
	 */
	public renderAllPlanes(
		params: WorkerRenderAllPlanesParams,
	): Promise<Record<MprPlane, MprSliceExtractionResult>> {
		const reqId = params.requestId ?? ++this.nextRequestId;
		this.latestRequestedId = Math.max(this.latestRequestedId, reqId);

		if (params.signal?.aborted) {
			return Promise.reject(new StaleSliceRequestError(reqId));
		}

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

		if (this.workers.length >= 3) {
			// Multi-worker parallel dispatch across CPU cores (axial, coronal, sagittal)
			return Promise.all([
				this.renderSlice({
					volume: params.volume,
					plane: "axial",
					crosshairMm: params.crosshairMm,
					obliqueAngles: params.obliqueAngles,
					options: params.options,
					signal: params.signal,
					supersedePrevious: params.supersedePrevious,
				}),
				this.renderSlice({
					volume: params.volume,
					plane: "coronal",
					crosshairMm: params.crosshairMm,
					obliqueAngles: params.obliqueAngles,
					options: params.options,
					signal: params.signal,
					supersedePrevious: params.supersedePrevious,
				}),
				this.renderSlice({
					volume: params.volume,
					plane: "sagittal",
					crosshairMm: params.crosshairMm,
					obliqueAngles: params.obliqueAngles,
					options: params.options,
					signal: params.signal,
					supersedePrevious: params.supersedePrevious,
				}),
			]).then(([axial, coronal, sagittal]) => ({
				axial: axial!,
				coronal: coronal!,
				sagittal: sagittal!,
			}));
		}

		if (params.supersedePrevious !== false) {
			if (this.queuedMulti) {
				const q = this.queuedMulti;
				this.queuedMulti = null;
				q.onAbortCleanup?.();
				q.reject(new StaleSliceRequestError(q.requestId));
			}

			if (this.inFlightMulti) {
				if (!this.inFlightMulti.abortNotified) {
					this.notifyWorkersAbort(this.inFlightMulti.requestId);
					this.inFlightMulti.abortNotified = true;
				}

				return new Promise<Record<MprPlane, MprSliceExtractionResult>>((resolve, reject) => {
					const queuedEntry: QueuedMultiPlane = {
						requestId: reqId,
						params,
						resolve,
						reject,
					};

					if (params.signal) {
						const onAbort = () => {
							if (this.queuedMulti && this.queuedMulti.requestId === reqId) {
								const q = this.queuedMulti;
								this.queuedMulti = null;
								q.onAbortCleanup?.();
								q.reject(new StaleSliceRequestError(reqId));
							}
						};
						params.signal.addEventListener("abort", onAbort, { once: true });
						queuedEntry.onAbortCleanup = () => {
							params.signal?.removeEventListener("abort", onAbort);
						};
					}

					this.queuedMulti = queuedEntry;
				});
			}
		}

		return this.dispatchMultiPlanes(reqId, params);
	}

	public getQueuedSingleCount(): number {
		return this.queuedSingleByPlane.size;
	}

	public getInFlightSingleCount(): number {
		return this.inFlightSingleByPlane.size;
	}

	public isPlaneInFlight(plane: MprPlane): boolean {
		return this.inFlightSingleByPlane.has(plane);
	}

	public isPlaneQueued(plane: MprPlane): boolean {
		return this.queuedSingleByPlane.has(plane);
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

			this.getNextWorker().postMessage(msg);
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

			this.getNextWorker().postMessage(msg, transferList);
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

			this.getNextWorker().postMessage(msg, transferList);
		});
	}

	/**
	 * Disposes worker thread pool, clears memory caches and terminates pending promises.
	 */
	public dispose(): void {
		for (const w of this.workers) {
			if (this.initializedVolumeId) {
				try {
					w.postMessage({
						type: "DISPOSE_VOLUME",
						volumeId: this.initializedVolumeId,
					});
				} catch {
					// Ignore postMessage failure on closing worker
				}
			}
			w.terminate();
		}
		this.workers = [];

		this.isWorkerActive = false;
		this.initializedVolumeId = null;
		this.activeVolume = null;

		for (const [, req] of this.pendingSingleRequests) {
			req.onAbortCleanup?.();
			req.reject(new Error("CbctWorkerBridge disposed."));
		}
		for (const [, req] of this.pendingMultiRequests) {
			req.onAbortCleanup?.();
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
		for (const [, q] of this.queuedSingleByPlane) {
			q.onAbortCleanup?.();
			q.reject(new Error("CbctWorkerBridge disposed."));
		}
		if (this.queuedMulti) {
			this.queuedMulti.onAbortCleanup?.();
			this.queuedMulti.reject(new Error("CbctWorkerBridge disposed."));
			this.queuedMulti = null;
		}
		this.pendingSingleRequests.clear();
		this.pendingMultiRequests.clear();
		this.pendingSeriesRequests.clear();
		this.pendingDecodeRequests.clear();
		this.pendingLodRequests.clear();
		this.queuedSingleByPlane.clear();
		this.inFlightSingleByPlane.clear();
		this.inFlightMulti = null;
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
