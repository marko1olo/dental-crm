/**
 * DENTE CRM — CBCT Web Worker Pool Lifecycle Manager (FEAT-010)
 * Standards: DICOM Part 3 PS 3.3, Planmeca Romexis 6.x, Vatech Ez3D-i
 *
 * Manages Web Worker pool sizing, round-robin dispatching, listener attachment,
 * graceful disposal, and hardware concurrency adaptation.
 */

import { calculateDynamicWorkerPoolSize } from "@dental/shared";
import { clientLogger } from "../../../../services/logging/clientLogger";
import type { MprPlane } from "../../cbctMprMath";
import type {
	CbctWorkerInboundMessage,
	CbctWorkerOutboundMessage,
} from "../cbctSliceWorker";
import type { CbctWorkerBridgeOptions } from "./types";

export class WorkerPoolManager {
	private workers: Worker[] = [];
	private workerPoolSize = 1;
	private roundRobinIndex = 0;
	private forceFallback: boolean;
	private _isWorkerActive = false;

	constructor(
		options: CbctWorkerBridgeOptions | undefined,
		private readonly onMessage: (msg: CbctWorkerOutboundMessage) => void,
		private readonly onError: (err: ErrorEvent) => void,
	) {
		this.forceFallback = options?.forceFallback ?? false;

		const concurrency =
			typeof navigator !== "undefined" &&
			typeof navigator.hardwareConcurrency === "number"
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
					// Vite native module worker URL resolution relative to parent directory
					w = new Worker(
						new URL("../cbctSliceWorker.ts", import.meta.url),
						{ type: "module" },
					);
				}
				if (w) {
					this.setupWorkerListeners(w);
					this.workers.push(w);
				}
			}
			this._isWorkerActive = this.workers.length > 0;
		} catch (err) {
			clientLogger.warn(
				"[CbctWorkerBridge] Web Worker instantiation unavailable, falling back to main-thread rendering",
				err,
				{ module: "CbctWorkerBridge" },
			);
			this._isWorkerActive = false;
			this.workers = [];
		}
	}

	private setupWorkerListeners(worker: Worker): void {
		worker.onmessage = (event: MessageEvent<CbctWorkerOutboundMessage>) => {
			this.onMessage(event.data);
		};

		worker.onerror = (err: ErrorEvent) => {
			clientLogger.error("[CbctWorkerBridge] Worker error encountered", err.message, {
				module: "CbctWorkerBridge",
			});
			this.onError(err);
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

	public isFallbackMode(): boolean {
		return this.forceFallback || !this._isWorkerActive || this.workers.length === 0;
	}

	public isWorkerActive(): boolean {
		return this._isWorkerActive;
	}

	public getWorkers(): Worker[] {
		return this.workers;
	}

	/**
	 * Broadcasts an inbound message to all active workers in the pool.
	 */
	public broadcast(msg: CbctWorkerInboundMessage): void {
		if (this.isFallbackMode()) return;
		for (const w of this.workers) {
			try {
				w.postMessage(msg);
			} catch (err) {
				clientLogger.debug("[CbctWorkerBridge] broadcast skipped for closed worker", err, {
					module: "CbctWorkerBridge",
				});
			}
		}
	}

	/**
	 * Sends an ABORT_REQUEST notification to all active workers so they drop the request pre-flight.
	 */
	public broadcastAbort(requestId: number, plane?: MprPlane): void {
		if (this.isFallbackMode()) return;
		const abortMsg: CbctWorkerInboundMessage = {
			type: "ABORT_REQUEST",
			requestId,
			...(plane ? { plane } : {}),
		};
		for (const w of this.workers) {
			try {
				w.postMessage(abortMsg);
			} catch (err) {
				clientLogger.debug("[CbctWorkerBridge] broadcastAbort skipped for closed worker", err, {
					module: "CbctWorkerBridge",
				});
			}
		}
	}

	/**
	 * Disposes worker thread pool, sends DISPOSE_VOLUME message, and terminates all workers.
	 */
	public dispose(initializedVolumeId: string | null): void {
		for (const w of this.workers) {
			if (initializedVolumeId) {
				try {
					w.postMessage({
						type: "DISPOSE_VOLUME",
						volumeId: initializedVolumeId,
					});
				} catch (err) {
					clientLogger.debug("[CbctWorkerBridge] DISPOSE_VOLUME postMessage skipped on closing worker", err, {
						module: "CbctWorkerBridge",
					});
				}
			}
			w.terminate();
		}
		this.workers = [];
		this._isWorkerActive = false;
	}
}
