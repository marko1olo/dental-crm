/**
 * DENTE CRM — CBCT CPU Slice Multi-Threaded Web Worker Bridge Core (FEAT-010)
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
} from "../../cbctMprMath";
import type { CrossSectionSliceData } from "../../cbctCrossSectionResliceMath";
import type {
	CbctWorkerInboundMessage,
	CbctWorkerOutboundMessage,
} from "../cbctSliceWorker";

import {
	type CbctWorkerBridgeOptions,
	type DecodeDicomSliceTask,
	type DecodedSliceResult,
	type GenerateProgressiveLodPayload,
	type QueuedMultiPlane,
	type QueuedSingleSlice,
	StaleSliceRequestError,
	type WorkerCrossSectionSeriesParams,
	type WorkerRenderAllPlanesParams,
	type WorkerRenderSliceParams,
} from "./types";
import { WorkerPoolManager } from "./workerPoolManager";
import { SliceDispatchEngine } from "./sliceDispatchEngine";
import {
	syncDecodeDicomSlices,
	syncExtractAllPlanes,
	syncExtractCrossSectionSeries,
	syncExtractSingleSlice,
	syncGenerateProgressiveLod,
} from "./syncFallbackReslice";

export class CbctWorkerBridge {
	private poolManager: WorkerPoolManager;
	private dispatchEngine: SliceDispatchEngine;

	private initializedVolumeId: string | null = null;
	private activeVolume: CbctVoxelVolume | null = null;
	private nextRequestId = 0;
	private latestRequestedId = 0;

	constructor(options?: CbctWorkerBridgeOptions) {
		this.dispatchEngine = new SliceDispatchEngine();

		this.poolManager = new WorkerPoolManager(
			options,
			(msg: CbctWorkerOutboundMessage) => {
				this.handleWorkerMessage(msg);
			},
			(err: ErrorEvent) => {
				this.dispatchEngine.failAllPending(
					`Worker execution error: ${err.message}`,
				);
			},
		);
	}

	public getNextWorker(): Worker {
		return this.poolManager.getNextWorker();
	}

	public getPoolSize(): number {
		return this.poolManager.getPoolSize();
	}

	public handleWorkerMessage(msg: CbctWorkerOutboundMessage): void {
		this.dispatchEngine.handleWorkerMessage(
			msg,
			(plane) => this.drainNextQueuedSlice(plane),
			() => this.drainNextQueuedMulti(),
			(volumeId) => {
				if (this.initializedVolumeId === volumeId) {
					this.initializedVolumeId = null;
				}
			},
		);
	}

	public isFallbackMode(): boolean {
		return this.poolManager.isFallbackMode();
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
			...(volume.rescaleSlope !== undefined
				? { rescaleSlope: volume.rescaleSlope }
				: {}),
			...(volume.rescaleIntercept !== undefined
				? { rescaleIntercept: volume.rescaleIntercept }
				: {}),
			...(volume.defaultWindowWidth !== undefined
				? { defaultWindowWidth: volume.defaultWindowWidth }
				: {}),
			...(volume.defaultWindowLevel !== undefined
				? { defaultWindowLevel: volume.defaultWindowLevel }
				: {}),
			data: volume.data,
		};

		this.poolManager.broadcast(initMsg);
		this.initializedVolumeId = volume.id;
	}

	/**
	 * Cancels all pending single-slice requests for the given plane whose requestId < currentRequestId.
	 */
	public supersedePendingSingleSlice(
		plane: MprPlane,
		currentRequestId: number,
	): void {
		this.dispatchEngine.supersedePendingSingleSlice(
			plane,
			currentRequestId,
			(id, p) => this.notifyWorkersAbort(id, p),
		);
	}

	/**
	 * Cancels all pending multi-plane requests whose requestId < currentRequestId.
	 */
	public supersedePendingAllPlanes(currentRequestId: number): void {
		this.dispatchEngine.supersedePendingAllPlanes(
			currentRequestId,
			(id) => this.notifyWorkersAbort(id),
		);
	}

	/**
	 * Manually abort a specific in-flight or queued request.
	 */
	public abortRequest(requestId: number, plane?: MprPlane): void {
		this.dispatchEngine.abortRequest(
			requestId,
			plane,
			(id, p) => this.notifyWorkersAbort(id, p),
			(p) => this.drainNextQueuedSlice(p),
			() => this.drainNextQueuedMulti(),
		);
	}

	/**
	 * Sends an ABORT_REQUEST notification to all active workers so they drop the request pre-flight.
	 */
	public notifyWorkersAbort(requestId: number, plane?: MprPlane): void {
		this.poolManager.broadcastAbort(requestId, plane);
	}

	private drainNextQueuedSlice(plane: MprPlane): void {
		this.dispatchEngine.drainNextQueuedSlice(
			plane,
			(reqId, params, existingPromise) => {
				const worker = this.getNextWorker();
				this.dispatchEngine.dispatchSingleSlice(
					reqId,
					params,
					worker,
					(id, p) => this.abortRequest(id, p),
					existingPromise,
				);
			},
		);
	}

	private drainNextQueuedMulti(): void {
		this.dispatchEngine.drainNextQueuedMulti(
			(reqId, params, existingPromise) => {
				const worker = this.getNextWorker();
				this.dispatchEngine.dispatchMultiPlanes(
					reqId,
					params,
					worker,
					(id) => this.abortRequest(id),
					existingPromise,
				);
			},
		);
	}

	/**
	 * Extracts an oblique slice asynchronously in the background worker, or synchronously in fallback mode.
	 * Drops earlier stale requests in queue for the same plane when supersedePrevious is enabled (default true).
	 */
	public renderSlice(
		params: WorkerRenderSliceParams,
	): Promise<MprSliceExtractionResult> {
		const reqId = params.requestId ?? ++this.nextRequestId;
		this.latestRequestedId = Math.max(this.latestRequestedId, reqId);

		if (params.signal?.aborted) {
			return Promise.reject(new StaleSliceRequestError(reqId, params.plane));
		}

		if (this.isFallbackMode()) {
			return Promise.resolve(syncExtractSingleSlice(params));
		}

		if (this.initializedVolumeId !== params.volume.id) {
			this.initVolume(params.volume);
		}

		if (params.supersedePrevious !== false) {
			const existingQueued = this.dispatchEngine.getQueuedSingle(params.plane);
			if (existingQueued) {
				existingQueued.onAbortCleanup?.();
				this.dispatchEngine.deleteQueuedSingle(params.plane);
				existingQueued.reject(
					new StaleSliceRequestError(existingQueued.requestId, params.plane),
				);
			}

			const currentInFlight = this.dispatchEngine.getInFlightSingle(params.plane);
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
							const q = this.dispatchEngine.getQueuedSingle(params.plane);
							if (q && q.requestId === reqId) {
								this.dispatchEngine.deleteQueuedSingle(params.plane);
								q.onAbortCleanup?.();
								q.reject(new StaleSliceRequestError(reqId, params.plane));
							}
						};
						params.signal.addEventListener("abort", onAbort, { once: true });
						queuedEntry.onAbortCleanup = () => {
							params.signal?.removeEventListener("abort", onAbort);
						};
					}

					this.dispatchEngine.setQueuedSingle(params.plane, queuedEntry);
				});
			}
		}

		const worker = this.getNextWorker();
		return this.dispatchEngine.dispatchSingleSlice(
			reqId,
			params,
			worker,
			(id, p) => this.abortRequest(id, p),
		);
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
			return Promise.resolve(syncExtractAllPlanes(params));
		}

		if (this.initializedVolumeId !== params.volume.id) {
			this.initVolume(params.volume);
		}

		if (this.getPoolSize() >= 3) {
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
			const queuedMulti = this.dispatchEngine.getQueuedMulti();
			if (queuedMulti) {
				this.dispatchEngine.setQueuedMulti(null);
				queuedMulti.onAbortCleanup?.();
				queuedMulti.reject(new StaleSliceRequestError(queuedMulti.requestId));
			}

			const inFlightMulti = this.dispatchEngine.getInFlightMulti();
			if (inFlightMulti) {
				if (!inFlightMulti.abortNotified) {
					this.notifyWorkersAbort(inFlightMulti.requestId);
					inFlightMulti.abortNotified = true;
				}

				return new Promise<Record<MprPlane, MprSliceExtractionResult>>(
					(resolve, reject) => {
						const queuedEntry: QueuedMultiPlane = {
							requestId: reqId,
							params,
							resolve,
							reject,
						};

						if (params.signal) {
							const onAbort = () => {
								const q = this.dispatchEngine.getQueuedMulti();
								if (q && q.requestId === reqId) {
									this.dispatchEngine.setQueuedMulti(null);
									q.onAbortCleanup?.();
									q.reject(new StaleSliceRequestError(reqId));
								}
							};
							params.signal.addEventListener("abort", onAbort, {
								once: true,
							});
							queuedEntry.onAbortCleanup = () => {
								params.signal?.removeEventListener("abort", onAbort);
							};
						}

						this.dispatchEngine.setQueuedMulti(queuedEntry);
					},
				);
			}
		}

		const worker = this.getNextWorker();
		return this.dispatchEngine.dispatchMultiPlanes(
			reqId,
			params,
			worker,
			(id) => this.abortRequest(id),
		);
	}

	public getQueuedSingleCount(): number {
		return this.dispatchEngine.getQueuedSingleCount();
	}

	public getInFlightSingleCount(): number {
		return this.dispatchEngine.getInFlightSingleCount();
	}

	public isPlaneInFlight(plane: MprPlane): boolean {
		return this.dispatchEngine.isPlaneInFlight(plane);
	}

	public isPlaneQueued(plane: MprPlane): boolean {
		return this.dispatchEngine.isPlaneQueued(plane);
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
			return Promise.resolve(syncExtractCrossSectionSeries(params));
		}

		if (this.initializedVolumeId !== params.volume.id) {
			this.initVolume(params.volume);
		}

		return new Promise<CrossSectionSliceData[]>((resolve, reject) => {
			this.dispatchEngine.getPendingSeries().set(reqId, {
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
			return Promise.resolve(syncDecodeDicomSlices(tasks));
		}

		const reqId = ++this.nextRequestId;
		this.latestRequestedId = Math.max(this.latestRequestedId, reqId);

		return new Promise<DecodedSliceResult[]>((resolve, reject) => {
			this.dispatchEngine.getPendingDecode().set(reqId, { resolve, reject });

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
			return Promise.resolve(syncGenerateProgressiveLod(payload));
		}

		const reqId = ++this.nextRequestId;
		this.latestRequestedId = Math.max(this.latestRequestedId, reqId);

		return new Promise<CbctVoxelVolume>((resolve, reject) => {
			this.dispatchEngine.getPendingLod().set(reqId, { resolve, reject });

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
		this.poolManager.dispose(this.initializedVolumeId);
		this.initializedVolumeId = null;
		this.activeVolume = null;

		this.dispatchEngine.failAllPending("CbctWorkerBridge disposed.");
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
