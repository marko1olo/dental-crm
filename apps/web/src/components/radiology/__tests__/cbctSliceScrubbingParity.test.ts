/**
 * DENTE CRM — CBCT MPR Slice Scrubbing Pixel Parity & Direction Reversal
 *
 * Mandate 8b / 8zi Sweet-Spot Module.
 * Verifies:
 * 1. Preserves 100% bit-exact HU and pixel parity for the final slice after rapid scrubbing (Mandate 8e).
 * 2. Direction reversal (forward then backward) renders final target slice with zero lag.
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import type { CbctVoxelVolume, Point3D } from "../cbctMprMath";
import { DEFAULT_OBLIQUE_ROTATION } from "../cbctObliqueMatrixMath";
import { extractObliqueMprSlice } from "../cbctObliqueSliceMath";
import {
	CbctWorkerBridge,
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
				// Linear gradient + anatomical landmark simulation
				data[idx] = (x * 20 + y * 15 + z * 30 - 500) | 0;
			}
		}
	}

	return {
		id: "test-scrub-vol-parity",
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

describe("CBCT Slice Scrubbing Pixel Parity & Direction Reversal", () => {
	beforeEach(() => {
		clearCancelledRequests();
	});

	it("1. Preserves 100% bit-exact HU and pixel parity for the final slice after rapid scrubbing", async () => {
		const testVol = createMockVolume();
		const workerCache = new Map<string, CbctVoxelVolume>();

		class AsyncWorker {
			public onmessage: ((event: MessageEvent<CbctWorkerOutboundMessage>) => void) | null = null;
			public onerror: ((error: ErrorEvent) => void) | null = null;

			public postMessage(msg: CbctWorkerInboundMessage): void {
				const poster = (outboundMsg: CbctWorkerOutboundMessage) => {
					if (this.onmessage) {
						this.onmessage({ data: outboundMsg } as MessageEvent<CbctWorkerOutboundMessage>);
					}
				};

				queueMicrotask(() => {
					handleWorkerMessage(msg, poster, workerCache);
				});
			}

			public terminate(): void {
				this.onmessage = null;
			}
		}

		const bridge = new CbctWorkerBridge({
			forceFallback: false,
			workerFactory: () => new AsyncWorker() as unknown as Worker,
		});

		bridge.initVolume(testVol);

		const targetCrosshair: Point3D = { x: 2.5, y: -1.0, z: 3.5 };

		// Rapid scrub leading to targetCrosshair
		for (let i = 0; i < 20; i++) {
			bridge
				.renderSlice({
					volume: testVol,
					plane: "axial",
					crosshairMm: { x: 0, y: 0, z: i * 0.2 },
					obliqueAngles: DEFAULT_OBLIQUE_ROTATION,
					options: renderOpts,
				})
				.catch(() => {});
		}

		// Final slice request
		const finalResult = await bridge.renderSlice({
			volume: testVol,
			plane: "axial",
			crosshairMm: targetCrosshair,
			obliqueAngles: DEFAULT_OBLIQUE_ROTATION,
			options: renderOpts,
		});

		// Calculate synchronous reference slice with identical math
		const referenceResult = extractObliqueMprSlice(
			testVol,
			"axial",
			targetCrosshair,
			DEFAULT_OBLIQUE_ROTATION,
			renderOpts,
		);

		// Bit-exact verification of pixels and metadata
		assert.strictEqual(finalResult.metadata.widthPx, referenceResult.metadata.widthPx);
		assert.strictEqual(finalResult.metadata.heightPx, referenceResult.metadata.heightPx);
		assert.strictEqual(finalResult.metadata.plane, "axial");
		assert.deepStrictEqual(finalResult.data, referenceResult.data);

		bridge.dispose();
	});

	it("2. Direction reversal (forward then backward) renders final target slice with zero lag", async () => {
		const testVol = createMockVolume();
		const workerCache = new Map<string, CbctVoxelVolume>();

		class AsyncWorker {
			public onmessage: ((event: MessageEvent<CbctWorkerOutboundMessage>) => void) | null = null;
			public onerror: ((error: ErrorEvent) => void) | null = null;

			public postMessage(msg: CbctWorkerInboundMessage): void {
				setTimeout(() => {
					handleWorkerMessage(
						msg,
						(outboundMsg) => {
							if (this.onmessage) {
								this.onmessage({ data: outboundMsg } as MessageEvent<CbctWorkerOutboundMessage>);
							}
						},
						workerCache,
					);
				}, 2);
			}

			public terminate(): void {}
		}

		const bridge = new CbctWorkerBridge({
			forceFallback: false,
			workerFactory: () => new AsyncWorker() as unknown as Worker,
		});

		bridge.initVolume(testVol);

		// Forward scrub: z = 0, 1, 2, ..., 15
		for (let z = 0; z <= 15; z++) {
			bridge
				.renderSlice({
					volume: testVol,
					plane: "axial",
					crosshairMm: { x: 0, y: 0, z },
					obliqueAngles: DEFAULT_OBLIQUE_ROTATION,
					options: renderOpts,
				})
				.catch(() => {});
		}

		// Immediate reversal: z = 14, 13, ..., 5
		for (let z = 14; z > 5; z--) {
			bridge
				.renderSlice({
					volume: testVol,
					plane: "axial",
					crosshairMm: { x: 0, y: 0, z },
					obliqueAngles: DEFAULT_OBLIQUE_ROTATION,
					options: renderOpts,
				})
				.catch(() => {});
		}

		// Final reversed target slice: z = 5
		const targetSlice = await bridge.renderSlice({
			volume: testVol,
			plane: "axial",
			crosshairMm: { x: 0, y: 0, z: 5 },
			obliqueAngles: DEFAULT_OBLIQUE_ROTATION,
			options: renderOpts,
		});

		assert.strictEqual(targetSlice.metadata.plane, "axial");
		const expected = extractObliqueMprSlice(
			testVol,
			"axial",
			{ x: 0, y: 0, z: 5 },
			DEFAULT_OBLIQUE_ROTATION,
			renderOpts,
		);
		assert.deepStrictEqual(targetSlice.data, expected.data);

		bridge.dispose();
	});
});
