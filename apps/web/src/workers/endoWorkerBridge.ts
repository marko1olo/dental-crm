/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL CBCT: ENDODONTIC CANAL WEB WORKER BRIDGE (FEAT-ENDO-3D)
 * ═══════════════════════════════════════════════════════════════════════════
 * Asynchronous non-blocking client bridge for offloading heavy volumetric
 * 3D Frangi tubeness and Fast Marching root canal calculations to background Web Worker.
 *
 * Provides:
 * - Worker instantiation with Vite module URL
 * - Request / Response correlation with unique IDs
 * - Configurable timeout protection (default 30s)
 * - Safe fallback to synchronous execution in Node/SSR/Vitest testing environments
 * - Zero UI thread stuttering or blocking
 * ═══════════════════════════════════════════════════════════════════════════
 */

import {
	computeMultiscaleFrangiVolume,
	extractRootCanalSystem,
	buildEndoToothClinicalReport,
	type CbctVoxelVolume,
	type EndoToothClinicalReport,
	type TracedCanalPath,
	type FrangiParameters,
} from "@dental/shared";
import type {
	EndoCanalWorkerComputePayload,
	EndoCanalWorkerOutboundMessage,
	EndoCanalWorkerComputeSuccessResponse,
} from "./endoCanalWorker";

export interface EndoWorkerBridgeOptions {
	readonly workerUrl?: string | URL;
	readonly workerFactory?: () => Worker;
	readonly timeoutMs?: number;
	readonly forceFallback?: boolean;
}

export interface EndoCalculationInput {
	readonly toothFdi: number;
	readonly dimensions: [number, number, number];
	readonly spacingMm: [number, number, number];
	readonly originMm: [number, number, number];
	readonly voxelData: Int16Array;
	readonly options?: {
		readonly scalesMm?: number[] | undefined;
		readonly darkTubeness?: boolean | undefined;
		readonly expectedCanalCount?: number | undefined;
		readonly alpha?: number | undefined;
		readonly beta?: number | undefined;
		readonly c?: number | undefined;
	} | undefined;
}

export interface EndoCalculationResult {
	readonly success: boolean;
	readonly toothFdi: number;
	readonly report: EndoToothClinicalReport;
	readonly canals: TracedCanalPath[];
	readonly telemetry: {
		readonly frangiMs: number;
		readonly fmmMs: number;
		readonly totalMs: number;
		readonly voxelCount: number;
		readonly isWorker: boolean;
	};
}

export class EndoWorkerBridge {
	private worker: Worker | null = null;
	private isWorkerReady = false;
	private pendingRequests = new Map<
		string,
		{
			resolve: (res: EndoCalculationResult) => void;
			reject: (err: Error) => void;
			timer: ReturnType<typeof setTimeout>;
		}
	>();
	private requestCounter = 0;
	private options: EndoWorkerBridgeOptions;

	constructor(options: EndoWorkerBridgeOptions = {}) {
		this.options = options;
		if (!options.forceFallback) {
			this.initWorker();
		}
	}

	public get isAvailable(): boolean {
		return this.isWorkerReady && this.worker !== null;
	}

	private initWorker(): void {
		if (typeof window === "undefined" || typeof Worker === "undefined") {
			return;
		}

		try {
			if (this.options.workerFactory) {
				this.worker = this.options.workerFactory();
			} else {
				const workerUrl = this.options.workerUrl ?? new URL("./endoCanalWorker.ts", import.meta.url);
				this.worker = new Worker(workerUrl, { type: "module" });
			}

			this.worker.onmessage = (event: MessageEvent<EndoCanalWorkerOutboundMessage>) => {
				this.handleMessage(event.data);
			};

			this.worker.onerror = (err: ErrorEvent) => {
				console.warn("[EndoWorkerBridge] Worker error:", err.message);
			};

			this.isWorkerReady = true;
		} catch (err) {
			console.warn("[EndoWorkerBridge] Web Worker init failed, falling back to sync execution:", err);
			this.worker = null;
			this.isWorkerReady = false;
		}
	}

	private handleMessage(msg: EndoCanalWorkerOutboundMessage): void {
		if (!msg || !("requestId" in msg) || !msg.requestId) return;

		const pending = this.pendingRequests.get(msg.requestId);
		if (!pending) return;

		clearTimeout(pending.timer);
		this.pendingRequests.delete(msg.requestId);

		if (!msg.success) {
			pending.reject(new Error(msg.error || "Endo Worker computation failed"));
			return;
		}

		if (msg.type === "compute_endo") {
			const res: EndoCalculationResult = {
				success: true,
				toothFdi: msg.toothFdi,
				report: msg.report,
				canals: msg.canals,
				telemetry: {
					...msg.telemetry,
					isWorker: true,
				},
			};
			pending.resolve(res);
		}
	}

	/**
	 * Executes honest 3D endodontic calculation either in background Web Worker
	 * or synchronously if in test/Node environment.
	 */
	public async calculateEndoCanalsAsync(input: EndoCalculationInput): Promise<EndoCalculationResult> {
		if (!this.isAvailable || !this.worker) {
			return this.calculateSyncFallback(input);
		}

		const requestId = `endo_${Date.now()}_${++this.requestCounter}`;
		const timeoutMs = this.options.timeoutMs ?? 45000; // 45 seconds timeout for heavy volumes

		const payload: EndoCanalWorkerComputePayload = {
			type: "compute_endo",
			requestId,
			toothFdi: input.toothFdi,
			dimensions: input.dimensions,
			spacingMm: input.spacingMm,
			originMm: input.originMm,
			voxelData: input.voxelData,
			...(input.options !== undefined ? { options: input.options } : {}),
		};

		return new Promise<EndoCalculationResult>((resolve, reject) => {
			const timer = setTimeout(() => {
				this.pendingRequests.delete(requestId);
				reject(new Error(`Endo Worker computation timed out after ${timeoutMs}ms`));
			}, timeoutMs);

			this.pendingRequests.set(requestId, { resolve, reject, timer });

			try {
				// Zero-copy array buffer transfer if input buffer is standalone
				this.worker!.postMessage(payload, [input.voxelData.buffer]);
			} catch {
				// Fallback to structured clone if buffer cannot be transferred (e.g. SharedArrayBuffer or shared view)
				this.worker!.postMessage(payload);
			}
		});
	}

	/**
	 * Synchronous fallback execution for unit tests, SSR, or unsupported worker environments.
	 */
	public calculateSyncFallback(input: EndoCalculationInput): EndoCalculationResult {
		const tStart = performance.now();
		const [nx, ny, nz] = input.dimensions;
		const [sx, sy, sz] = input.spacingMm;
		const [ox, oy, oz] = input.originMm;

		const subVolume: CbctVoxelVolume = {
			id: `sync_${input.toothFdi}_${Date.now()}`,
			data: input.voxelData,
			dimensions: { width: nx, height: ny, depth: nz },
			spacingMm: { x: sx, y: sy, z: sz },
			originMm: { x: ox, y: oy, z: oz },
			physicalSizeMm: { x: nx * sx, y: ny * sy, z: nz * sz },
			minHU: -1024,
			maxHU: 3071,
			isDisposed: false,
		};

		const frangiParams: FrangiParameters = {
			alpha: input.options?.alpha ?? 0.5,
			beta: input.options?.beta ?? 0.5,
			c: input.options?.c ?? 15.0,
			scalesMm: input.options?.scalesMm ?? [0.35, 0.60],
			darkTubeness: input.options?.darkTubeness ?? true,
		};

		const tFrangi = performance.now();
		const frangiRes = computeMultiscaleFrangiVolume(subVolume, undefined, frangiParams);
		const frangiMs = performance.now() - tFrangi;

		const expectedCount =
			input.options?.expectedCanalCount ??
			([16, 17, 26, 27].includes(input.toothFdi) ? 4 : [36, 37, 46, 47].includes(input.toothFdi) ? 3 : 1);

		const tFmm = performance.now();
		const canalSystem = extractRootCanalSystem(subVolume, frangiRes, expectedCount);
		const fmmMs = performance.now() - tFmm;

		const report = buildEndoToothClinicalReport(canalSystem.canals, input.toothFdi);
		const totalMs = performance.now() - tStart;

		return {
			success: true,
			toothFdi: input.toothFdi,
			report,
			canals: canalSystem.canals,
			telemetry: {
				frangiMs: Number(frangiMs.toFixed(1)),
				fmmMs: Number(fmmMs.toFixed(1)),
				totalMs: Number(totalMs.toFixed(1)),
				voxelCount: nx * ny * nz,
				isWorker: false,
			},
		};
	}

	public terminate(): void {
		for (const [id, pending] of this.pendingRequests.entries()) {
			clearTimeout(pending.timer);
			pending.reject(new Error("Worker terminated"));
			this.pendingRequests.delete(id);
		}
		if (this.worker) {
			this.worker.terminate();
			this.worker = null;
		}
		this.isWorkerReady = false;
	}
}

let globalBridge: EndoWorkerBridge | null = null;

export function getGlobalEndoWorkerBridge(options?: EndoWorkerBridgeOptions): EndoWorkerBridge {
	if (!globalBridge) {
		globalBridge = new EndoWorkerBridge(options);
	}
	return globalBridge;
}

export function resetGlobalEndoWorkerBridge(): void {
	if (globalBridge) {
		globalBridge.terminate();
		globalBridge = null;
	}
}

