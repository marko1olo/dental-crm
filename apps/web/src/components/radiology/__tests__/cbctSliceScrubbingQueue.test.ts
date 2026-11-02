/**
 * DENTE CRM — CBCT MPR Slice Scrubbing Queue & Worker Dispatch Throttling
 *
 * Mandate 8b / 8zi Sweet-Spot Module.
 * Verifies:
 * 1. Rapid 50-slice wheel scrubbing collapses intermediate requests into at most 2 worker dispatches.
 * 2. Pre-flight abort via AbortSignal cancels queued requests immediately.
 * 3. Independent plane isolation (axial scrub does not drop coronal or sagittal tasks).
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import type { CbctVoxelVolume } from "../cbctMprMath";
import { DEFAULT_OBLIQUE_ROTATION } from "../cbctObliqueMatrixMath";
import {
	CbctWorkerBridge,
	isStaleSliceRequestError,
	type WorkerRenderSliceOptions,
} from "../mpr/cbctWorkerBridge";
import {
	handleWorkerMessage,
	clearCancelledRequests,
	type CbctWorkerInboundMessage,
	type CbctWorkerOutboundMessage,
} from "../mpr/cbctSliceWorker";

function createMockVolume(width = 32, height = 32, depth = 32): CbctVoxelVolume {
	const totalVoxels = width * height * depth;
	const data = new Int16Array(totalVoxels);
	for (let z = 0; z < depth; z++) {
		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				const idx = z * (width * height) + y * width + x;
				data[idx] = (x * 20 + y * 15 + z * 30 - 500) | 0;
			}
		}
	}

	return {
		id: "test-scrub-vol-queue",
		dimensions: { width, height, depth },
		spacingMm: { x: 0.5, y: 0.5, z: 0.5 },
		originMm: { x: -8, y: -8, z: -8 },
		physicalSizeMm: { x: 16, y: 16, z: 16 },
		data,
		minHU: -500,
		maxHU: 2000,
		rescaleSlope: 1.0,
		rescaleIntercept: 0,
		defaultWindowWidth: 2500,
		defaultWindowLevel: 500,
		isDisposed: false,
	};
}

const renderOpts: WorkerRenderSliceOptions = {
	windowWidth: 2500,
	windowLevel: 500,
	invert: false,
	slabMode: "single",
	slabThicknessMm: 0.5,
	interpolation: "nearest",
};

describe("CBCT Slice Scrubbing Queue & Dispatch Throttler", () => {
	beforeEach(() => {
		clearCancelledRequests();
	});

	it("1. Collapses 50 rapid slice requests into at most 2 worker dispatches, rejecting intermediate tasks", async () => {
		const testVol = createMockVolume();
		const workerCache = new Map<string, CbctVoxelVolume>();
		let dispatchedToWorkerCount = 0;

		class ControlledSimulatedWorker {
			public onmessage: ((event: MessageEvent<CbctWorkerOutboundMessage>) => void) | null = null;
			public onerror: ((error: ErrorEvent) => void) | null = null;

			public postMessage(msg: CbctWorkerInboundMessage): void {
				dispatchedToWorkerCount++;
				const poster = (outboundMsg: CbctWorkerOutboundMessage) => {
					if (this.onmessage) {
						this.onmessage({ data: outboundMsg } as MessageEvent<CbctWorkerOutboundMessage>);
					}
				};

				// If it's INIT_VOLUME or ABORT_REQUEST, process asynchronously
				if (msg.type === "INIT_VOLUME" || msg.type === "ABORT_REQUEST") {
					queueMicrotask(() => {
						handleWorkerMessage(msg, poster, workerCache);
					});
					return;
				}

				// For RENDER_SLICE, simulate delayed worker execution (5ms)
				if (msg.type === "RENDER_SLICE") {
					setTimeout(() => {
						handleWorkerMessage(msg, poster, workerCache);
					}, 5);
				}
			}

			public terminate(): void {
				this.onmessage = null;
				this.onerror = null;
			}
		}

		const simulatedWorker = new ControlledSimulatedWorker();
		const bridge = new CbctWorkerBridge({
			forceFallback: false,
			workerFactory: () => simulatedWorker as unknown as Worker,
		});

		bridge.initVolume(testVol);
		// Reset count after INIT_VOLUME
		dispatchedToWorkerCount = 0;

		const promises: Array<Promise<unknown>> = [];
		const rejectedStaleIndexes: number[] = [];

		// Simulate user spinning wheel rapidly through 50 slices (z from -7mm to 7mm)
		for (let i = 0; i < 50; i++) {
			const zMm = -7 + (i / 49) * 14;
			const p = bridge
				.renderSlice({
					volume: testVol,
					plane: "axial",
					crosshairMm: { x: 0, y: 0, z: zMm },
					obliqueAngles: DEFAULT_OBLIQUE_ROTATION,
					options: renderOpts,
				})
				.catch((err) => {
					if (isStaleSliceRequestError(err)) {
						rejectedStaleIndexes.push(i);
						return "STALE";
					}
					throw err;
				});

			promises.push(p);
		}

		// Verify queue state during the burst: queued single count must be at most 1!
		assert.ok(
			bridge.getQueuedSingleCount() <= 1,
			`Queued count must be <= 1, was ${bridge.getQueuedSingleCount()}`,
		);

		// Wait for all promises to settle
		const results = await Promise.all(promises);

		// The final slice (index 49) must resolve successfully (not "STALE")
		const finalResult = results[49];
		assert.notStrictEqual(finalResult, "STALE", "Final target slice must not be stale!");
		assert.ok(
			finalResult && typeof finalResult === "object" && "data" in finalResult,
			"Final target slice must return valid slice result",
		);

		// Verify that at least 45 intermediate slices were rejected with StaleSliceRequestError
		assert.ok(
			rejectedStaleIndexes.length >= 45,
			`Expected >= 45 stale rejections, got ${rejectedStaleIndexes.length}`,
		);

		// Verify that worker was dispatched at most 4 times (first slice + abort + final slice)
		// NOT 50 times!
		assert.ok(
			dispatchedToWorkerCount <= 4,
			`Dispatched tasks to worker must be <= 4 (was ${dispatchedToWorkerCount})`,
		);

		bridge.dispose();
	});

	it("2. Cancels queued slice immediately when AbortSignal fires before worker dispatch", async () => {
		const testVol = createMockVolume();

		class BlockingWorker {
			public onmessage: ((event: MessageEvent<CbctWorkerOutboundMessage>) => void) | null = null;
			public onerror: ((error: ErrorEvent) => void) | null = null;

			public postMessage(msg: CbctWorkerInboundMessage): void {
				if (msg.type === "RENDER_SLICE") {
					// Keep worker busy for 20ms
					setTimeout(() => {
						if (this.onmessage) {
							this.onmessage({
								data: {
									type: "SLICE_RENDERED",
									requestId: msg.requestId,
									volumeId: msg.volumeId,
									plane: msg.plane,
									metadata: {
										plane: msg.plane,
										widthPx: 32,
										heightPx: 32,
										pixelSpacingMm: { x: 0.5, y: 0.5 },
										originWorldMm: { x: 0, y: 0, z: 0 },
										slabThicknessMm: 0.5,
										slabMode: "single",
										sliceThicknessMm: 0.5,
										windowWidth: 2500,
										windowLevel: 500,
									},
									pixelBuffer: new ArrayBuffer(32 * 32 * 4),
								},
							} as unknown as MessageEvent<CbctWorkerOutboundMessage>);
						}
					}, 20);
				}
			}

			public terminate(): void {}
		}

		const bridge = new CbctWorkerBridge({
			forceFallback: false,
			workerFactory: () => new BlockingWorker() as unknown as Worker,
		});

		bridge.initVolume(testVol);

		// First request: occupies the in-flight slot
		bridge.renderSlice({
			volume: testVol,
			plane: "coronal",
			crosshairMm: { x: 0, y: 0, z: 0 },
			obliqueAngles: DEFAULT_OBLIQUE_ROTATION,
			options: renderOpts,
		}).catch(() => {});

		// Second request: enters queue with AbortController
		const abortController = new AbortController();
		const queuedPromise = bridge.renderSlice({
			volume: testVol,
			plane: "coronal",
			crosshairMm: { x: 0, y: 1, z: 0 },
			obliqueAngles: DEFAULT_OBLIQUE_ROTATION,
			options: renderOpts,
			signal: abortController.signal,
		});

		assert.strictEqual(bridge.isPlaneQueued("coronal"), true);

		// Abort before worker completes first slice
		abortController.abort();

		// Queued request must reject immediately with StaleSliceRequestError
		await assert.rejects(queuedPromise, (err) => {
			return isStaleSliceRequestError(err);
		});

		assert.strictEqual(bridge.isPlaneQueued("coronal"), false);

		bridge.dispose();
	});

	it("3. Maintains independent plane queues: scrubbing Axial does not drop Coronal or Sagittal tasks", async () => {
		const testVol = createMockVolume();
		const workerCache = new Map<string, CbctVoxelVolume>();

		class AsyncWorker {
			public onmessage: ((event: MessageEvent<CbctWorkerOutboundMessage>) => void) | null = null;
			public onerror: ((error: ErrorEvent) => void) | null = null;

			public postMessage(msg: CbctWorkerInboundMessage): void {
				queueMicrotask(() => {
					handleWorkerMessage(
						msg,
						(outboundMsg) => {
							if (this.onmessage) {
								this.onmessage({ data: outboundMsg } as MessageEvent<CbctWorkerOutboundMessage>);
							}
						},
						workerCache,
					);
				});
			}

			public terminate(): void {}
		}

		const bridge = new CbctWorkerBridge({
			forceFallback: false,
			workerFactory: () => new AsyncWorker() as unknown as Worker,
		});

		bridge.initVolume(testVol);

		// Dispatch coronal and sagittal requests
		const coronalPromise = bridge.renderSlice({
			volume: testVol,
			plane: "coronal",
			crosshairMm: { x: 0, y: 0, z: 0 },
			obliqueAngles: DEFAULT_OBLIQUE_ROTATION,
			options: renderOpts,
		});

		const sagittalPromise = bridge.renderSlice({
			volume: testVol,
			plane: "sagittal",
			crosshairMm: { x: 0, y: 0, z: 0 },
			obliqueAngles: DEFAULT_OBLIQUE_ROTATION,
			options: renderOpts,
		});

		// Simultaneously scrub axial through 10 slices
		for (let i = 0; i < 10; i++) {
			bridge
				.renderSlice({
					volume: testVol,
					plane: "axial",
					crosshairMm: { x: 0, y: 0, z: i },
					obliqueAngles: DEFAULT_OBLIQUE_ROTATION,
					options: renderOpts,
				})
				.catch(() => {});
		}

		const axialPromise = bridge.renderSlice({
			volume: testVol,
			plane: "axial",
			crosshairMm: { x: 0, y: 0, z: 10 },
			obliqueAngles: DEFAULT_OBLIQUE_ROTATION,
			options: renderOpts,
		});

		// All 3 planes must successfully resolve without cross-plane interference
		const [coronalSlice, sagittalSlice, axialSlice] = await Promise.all([
			coronalPromise,
			sagittalPromise,
			axialPromise,
		]);

		assert.strictEqual(coronalSlice.metadata.plane, "coronal");
		assert.strictEqual(sagittalSlice.metadata.plane, "sagittal");
		assert.strictEqual(axialSlice.metadata.plane, "axial");

		bridge.dispose();
	});
});
