/**
 * DENTE CRM — CBCT Slice Request Queue & In-Flight Dispatch Engine (FEAT-010)
 * Standards: DICOM Part 3 PS 3.3, Planmeca Romexis 6.x, Vatech Ez3D-i
 *
 * Coordinates request IDs, pending promise tables, superseding of stale rotations,
 * in-flight worker tracking, and queued slice draining.
 */

import type { MprPlane, MprSliceExtractionResult } from "../cbctMprMath";
import type {
	CbctWorkerInboundMessage,
	CbctWorkerOutboundMessage,
} from "../cbctSliceWorker";
import {
	type InFlightMultiTask,
	type InFlightSingleTask,
	type PendingDecodeRequest,
	type PendingLodRequest,
	type PendingMultiPlane,
	type PendingSeriesRequest,
	type PendingSingleSlice,
	type QueuedMultiPlane,
	type QueuedSingleSlice,
	StaleSliceRequestError,
	type WorkerRenderAllPlanesParams,
	type WorkerRenderSliceParams,
} from "./types";

export class SliceDispatchEngine {
	private pendingSingleRequests = new Map<number, PendingSingleSlice>();
	private pendingMultiRequests = new Map<number, PendingMultiPlane>();
	private pendingSeriesRequests = new Map<number, PendingSeriesRequest>();
	private pendingDecodeRequests = new Map<number, PendingDecodeRequest>();
	private pendingLodRequests = new Map<number, PendingLodRequest>();

	// ─── MPR QUEUE & IN-FLIGHT SCRUBBING OPTIMIZER ─────────────────────────────
	private inFlightSingleByPlane = new Map<MprPlane, InFlightSingleTask>();
	private queuedSingleByPlane = new Map<MprPlane, QueuedSingleSlice>();

	private inFlightMulti: InFlightMultiTask | null = null;
	private queuedMulti: QueuedMultiPlane | null = null;

	public getPendingSeries(): Map<number, PendingSeriesRequest> {
		return this.pendingSeriesRequests;
	}

	public getPendingDecode(): Map<number, PendingDecodeRequest> {
		return this.pendingDecodeRequests;
	}

	public getPendingLod(): Map<number, PendingLodRequest> {
		return this.pendingLodRequests;
	}

	public getQueuedSingle(plane: MprPlane): QueuedSingleSlice | undefined {
		return this.queuedSingleByPlane.get(plane);
	}

	public setQueuedSingle(plane: MprPlane, entry: QueuedSingleSlice): void {
		this.queuedSingleByPlane.set(plane, entry);
	}

	public deleteQueuedSingle(plane: MprPlane): void {
		this.queuedSingleByPlane.delete(plane);
	}

	public getInFlightSingle(plane: MprPlane): InFlightSingleTask | undefined {
		return this.inFlightSingleByPlane.get(plane);
	}

	public getInFlightMulti(): InFlightMultiTask | null {
		return this.inFlightMulti;
	}

	public getQueuedMulti(): QueuedMultiPlane | null {
		return this.queuedMulti;
	}

	public setQueuedMulti(entry: QueuedMultiPlane | null): void {
		this.queuedMulti = entry;
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

	public supersedePendingSingleSlice(
		plane: MprPlane,
		currentRequestId: number,
		notifyAbort: (id: number, plane?: MprPlane) => void,
	): void {
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
				notifyAbort(id, plane);
				req.reject(new StaleSliceRequestError(id, plane));
			}
		}

		const inFlight = this.inFlightSingleByPlane.get(plane);
		if (inFlight && inFlight.requestId < currentRequestId) {
			notifyAbort(inFlight.requestId, plane);
		}
	}

	public supersedePendingAllPlanes(
		currentRequestId: number,
		notifyAbort: (id: number) => void,
	): void {
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
				notifyAbort(id);
				req.reject(new StaleSliceRequestError(id));
			}
		}

		if (this.inFlightMulti && this.inFlightMulti.requestId < currentRequestId) {
			notifyAbort(this.inFlightMulti.requestId);
		}
	}

	public abortRequest(
		requestId: number,
		plane: MprPlane | undefined,
		notifyAbort: (id: number, plane?: MprPlane) => void,
		drainNextSlice: (plane: MprPlane) => void,
		drainNextMulti: () => void,
	): void {
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
			notifyAbort(requestId, targetPlane);
			pendingSingle.reject(new StaleSliceRequestError(requestId, targetPlane));

			const inFlight = this.inFlightSingleByPlane.get(targetPlane);
			if (inFlight && inFlight.requestId === requestId) {
				this.inFlightSingleByPlane.delete(targetPlane);
				drainNextSlice(targetPlane);
			}
		}

		const pendingMulti = this.pendingMultiRequests.get(requestId);
		if (pendingMulti) {
			pendingMulti.onAbortCleanup?.();
			this.pendingMultiRequests.delete(requestId);
			notifyAbort(requestId);
			pendingMulti.reject(new StaleSliceRequestError(requestId));

			if (this.inFlightMulti && this.inFlightMulti.requestId === requestId) {
				this.inFlightMulti = null;
				drainNextMulti();
			}
		}
	}

	public dispatchSingleSlice(
		reqId: number,
		params: WorkerRenderSliceParams,
		worker: Worker,
		onAbortTrigger: (reqId: number, plane: MprPlane) => void,
		existingPromise?: {
			resolve: (val: MprSliceExtractionResult) => void;
			reject: (err: Error) => void;
			onAbortCleanup?: () => void;
		},
	): Promise<MprSliceExtractionResult> {
		this.inFlightSingleByPlane.set(params.plane, {
			requestId: reqId,
			worker,
			abortNotified: false,
		});

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
					onAbortTrigger(reqId, params.plane);
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
					...(params.options.invert !== undefined
						? { invert: params.options.invert }
						: {}),
					...(params.options.slabMode !== undefined
						? { slabMode: params.options.slabMode }
						: {}),
					...(params.options.slabThicknessMm !== undefined
						? { slabThicknessMm: params.options.slabThicknessMm }
						: {}),
					...(params.options.interpolation !== undefined
						? { interpolation: params.options.interpolation }
						: {}),
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

	public drainNextQueuedSlice(
		plane: MprPlane,
		dispatch: (
			reqId: number,
			params: WorkerRenderSliceParams,
			existingPromise: {
				resolve: (val: MprSliceExtractionResult) => void;
				reject: (err: Error) => void;
			},
		) => void,
	): void {
		this.inFlightSingleByPlane.delete(plane);

		const nextQueued = this.queuedSingleByPlane.get(plane);
		if (!nextQueued) {
			return;
		}

		this.queuedSingleByPlane.delete(plane);
		nextQueued.onAbortCleanup?.();

		if (nextQueued.params.signal?.aborted) {
			nextQueued.reject(new StaleSliceRequestError(nextQueued.requestId, plane));
			this.drainNextQueuedSlice(plane, dispatch);
			return;
		}

		dispatch(nextQueued.requestId, nextQueued.params, {
			resolve: nextQueued.resolve,
			reject: nextQueued.reject,
		});
	}

	public dispatchMultiPlanes(
		reqId: number,
		params: WorkerRenderAllPlanesParams,
		worker: Worker,
		onAbortTrigger: (reqId: number) => void,
		existingPromise?: {
			resolve: (val: Record<MprPlane, MprSliceExtractionResult>) => void;
			reject: (err: Error) => void;
			onAbortCleanup?: () => void;
		},
	): Promise<Record<MprPlane, MprSliceExtractionResult>> {
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
					onAbortTrigger(reqId);
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
					...(params.options.invert !== undefined
						? { invert: params.options.invert }
						: {}),
					...(params.options.slabMode !== undefined
						? { slabMode: params.options.slabMode }
						: {}),
					...(params.options.slabThicknessMm !== undefined
						? { slabThicknessMm: params.options.slabThicknessMm }
						: {}),
					...(params.options.interpolation !== undefined
						? { interpolation: params.options.interpolation }
						: {}),
				},
			};

			worker.postMessage(msg);
		};

		if (existingPromise) {
			setupPendingAndPost(existingPromise.resolve, existingPromise.reject);
			return Promise.resolve(
				undefined as unknown as Record<MprPlane, MprSliceExtractionResult>,
			);
		}

		return new Promise<Record<MprPlane, MprSliceExtractionResult>>(
			(resolve, reject) => {
				setupPendingAndPost(resolve, reject);
			},
		);
	}

	public drainNextQueuedMulti(
		dispatch: (
			reqId: number,
			params: WorkerRenderAllPlanesParams,
			existingPromise: {
				resolve: (val: Record<MprPlane, MprSliceExtractionResult>) => void;
				reject: (err: Error) => void;
			},
		) => void,
	): void {
		this.inFlightMulti = null;

		const nextQueued = this.queuedMulti;
		if (!nextQueued) {
			return;
		}

		this.queuedMulti = null;
		nextQueued.onAbortCleanup?.();

		if (nextQueued.params.signal?.aborted) {
			nextQueued.reject(new StaleSliceRequestError(nextQueued.requestId));
			this.drainNextQueuedMulti(dispatch);
			return;
		}

		dispatch(nextQueued.requestId, nextQueued.params, {
			resolve: nextQueued.resolve,
			reject: nextQueued.reject,
		});
	}

	public handleWorkerMessage(
		msg: CbctWorkerOutboundMessage,
		drainSingle: (plane: MprPlane) => void,
		drainMulti: () => void,
		onVolumeDisposed: (volumeId: string) => void,
	): void {
		if (!msg || typeof msg !== "object") return;

		switch (msg.type) {
			case "VOLUME_INITIALIZED": {
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
						drainSingle(plane);
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
							data: new Uint8ClampedArray(
								msg.slices.axial.pixelBuffer as ArrayBuffer,
							),
							metadata: msg.slices.axial.metadata,
						},
						coronal: {
							data: new Uint8ClampedArray(
								msg.slices.coronal.pixelBuffer as ArrayBuffer,
							),
							metadata: msg.slices.coronal.metadata,
						},
						sagittal: {
							data: new Uint8ClampedArray(
								msg.slices.sagittal.pixelBuffer as ArrayBuffer,
							),
							metadata: msg.slices.sagittal.metadata,
						},
					});
				}
				if (
					this.inFlightMulti &&
					this.inFlightMulti.requestId === msg.requestId
				) {
					this.inFlightMulti = null;
					drainMulti();
				}
				break;
			}

			case "REQUEST_ABORTED": {
				const pendingSingle = this.pendingSingleRequests.get(msg.requestId);
				if (pendingSingle) {
					pendingSingle.onAbortCleanup?.();
					this.pendingSingleRequests.delete(msg.requestId);
					pendingSingle.reject(
						new StaleSliceRequestError(msg.requestId, pendingSingle.plane),
					);
				}
				const plane = msg.plane ?? pendingSingle?.plane;
				if (plane) {
					const inFlight = this.inFlightSingleByPlane.get(plane);
					if (inFlight && inFlight.requestId === msg.requestId) {
						this.inFlightSingleByPlane.delete(plane);
						drainSingle(plane);
					}
				}
				const pendingMulti = this.pendingMultiRequests.get(msg.requestId);
				if (pendingMulti) {
					pendingMulti.onAbortCleanup?.();
					this.pendingMultiRequests.delete(msg.requestId);
					pendingMulti.reject(new StaleSliceRequestError(msg.requestId));
				}
				if (
					this.inFlightMulti &&
					this.inFlightMulti.requestId === msg.requestId
				) {
					this.inFlightMulti = null;
					drainMulti();
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
				onVolumeDisposed(msg.volumeId);
				break;
			}

			case "ERROR": {
				if (msg.requestId !== undefined) {
					const pendingSingle = this.pendingSingleRequests.get(msg.requestId);
					if (pendingSingle) {
						pendingSingle.onAbortCleanup?.();
						this.pendingSingleRequests.delete(msg.requestId);
						pendingSingle.reject(new Error(msg.error));
						const inFlight = this.inFlightSingleByPlane.get(
							pendingSingle.plane,
						);
						if (inFlight && inFlight.requestId === msg.requestId) {
							this.inFlightSingleByPlane.delete(pendingSingle.plane);
							drainSingle(pendingSingle.plane);
						}
					}
					const pendingMulti = this.pendingMultiRequests.get(msg.requestId);
					if (pendingMulti) {
						pendingMulti.onAbortCleanup?.();
						this.pendingMultiRequests.delete(msg.requestId);
						pendingMulti.reject(new Error(msg.error));
						if (
							this.inFlightMulti &&
							this.inFlightMulti.requestId === msg.requestId
						) {
							this.inFlightMulti = null;
							drainMulti();
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

	public failAllPending(
		errorMsg: string,
	): void {
		const err = new Error(errorMsg);
		for (const [, req] of this.pendingSingleRequests) {
			req.onAbortCleanup?.();
			req.reject(err);
		}
		for (const [, req] of this.pendingMultiRequests) {
			req.onAbortCleanup?.();
			req.reject(err);
		}
		for (const [, req] of this.pendingSeriesRequests) {
			req.reject(err);
		}
		for (const [, req] of this.pendingDecodeRequests) {
			req.reject(err);
		}
		for (const [, req] of this.pendingLodRequests) {
			req.reject(err);
		}
		for (const [, q] of this.queuedSingleByPlane) {
			q.onAbortCleanup?.();
			q.reject(err);
		}
		if (this.queuedMulti) {
			this.queuedMulti.onAbortCleanup?.();
			this.queuedMulti.reject(err);
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
}
