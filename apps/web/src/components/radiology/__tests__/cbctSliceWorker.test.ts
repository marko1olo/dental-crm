/**
 * DENTE CRM — CBCT CPU Slice Multi-Threaded Web Worker Engine Tests (FEAT-010)
 * Standards: DICOM Part 3 PS 3.3, Planmeca Romexis 6.x, Vatech Ez3D-i
 *
 * Test Suite:
 * 1. Pixel-for-pixel bit-exact accuracy: Worker message pipeline vs Synchronous extractObliqueMprSlice.
 * 2. Multi-plane synchronized extraction across Axial, Coronal, Sagittal planes.
 * 3. 3D Oblique rotation angles and Slab Thickness projection modes (MIP, MinIP, Average).
 * 4. Window/Level HU contrast transfer and White Paper inversion parity.
 * 5. In-worker volume caching and deterministic memory disposal (DISPOSE_VOLUME).
 * 6. Transparent Fallback mode in CbctWorkerBridge (Node/SSR/CSP compliance).
 * 7. End-to-end simulated Worker thread integration with Transferable ArrayBuffer zero-copy pipeline.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type {
	CbctVoxelVolume,
	MprPlane,
	Point3D,
	SlabProjectionMode,
} from "../cbctMprMath";
import { DEFAULT_OBLIQUE_ROTATION } from "../cbctObliqueMatrixMath";
import { extractObliqueMprSlice } from "../cbctObliqueSliceMath";
import { createEmptyCbctVolume } from "../cbctVolumeLifecycleMath";
import {
	type CbctWorkerInboundMessage,
	type CbctWorkerOutboundMessage,
	handleWorkerMessage,
} from "../mpr/cbctSliceWorker";
import {
	CbctWorkerBridge,
	type WorkerRenderSliceOptions,
} from "../mpr/cbctWorkerBridge";

/**
 * Creates a synthetic CBCT volume with known 3D gradient and anatomical density structures
 * for deterministic multi-plane sub-voxel interpolation testing.
 */
function createSyntheticTestVolume(
	width = 32,
	height = 32,
	depth = 32,
	spacing = 0.2,
): CbctVoxelVolume {
	const vol = createEmptyCbctVolume(width, height, depth, spacing, -1000);
	const data = vol.data!;
	const sliceStride = width * height;

	// Populate with known HU features (Air = -1000, Soft Tissue = 50, Trabecular Bone = 400, Enamel = 2500)
	for (let z = 0; z < depth; z++) {
		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				const idx = z * sliceStride + y * width + x;
				const distFromCenter = Math.sqrt((x - 16) ** 2 + (y - 16) ** 2 + (z - 16) ** 2);
				if (distFromCenter < 5) {
					// High-density dental crown / enamel core
					data[idx] = 2500;
				} else if (distFromCenter < 10) {
					// Trabecular and cortical bone
					data[idx] = 500 + Math.round((10 - distFromCenter) * 150);
				} else if (distFromCenter < 14) {
					// Gingiva and soft tissue
					data[idx] = 40;
				} else {
					// Ambient air
					data[idx] = -1000;
				}
			}
		}
	}

	return vol;
}

describe("CBCT CPU Slice Multi-Threaded Web Worker Engine (FEAT-010)", () => {
	const testVol = createSyntheticTestVolume(32, 32, 32, 0.25);
	const centerPoint: Point3D = { x: 0, y: 0, z: 0 };

	describe("1. Worker Message Protocol & Bit-Exact Pixel Parity vs Synchronous Engine", () => {
		it("produces identical pixel buffers and metadata for Axial plane", () => {
			const workerCache = new Map<string, CbctVoxelVolume>();
			const outboundMessages: CbctWorkerOutboundMessage[] = [];
			const transferredBuffers: Transferable[][] = [];

			const postMsg = (msg: CbctWorkerOutboundMessage, transfer?: Transferable[]) => {
				outboundMessages.push(msg);
				if (transfer) transferredBuffers.push(transfer);
			};

			// Step 1: Initialize volume in worker cache
			handleWorkerMessage(
				{
					type: "INIT_VOLUME",
					volumeId: testVol.id,
					dimensions: testVol.dimensions,
					spacingMm: testVol.spacingMm,
					originMm: testVol.originMm,
					minHU: testVol.minHU,
					maxHU: testVol.maxHU,
					data: testVol.data!,
				},
				postMsg,
				workerCache,
			);

			assert.strictEqual(outboundMessages.length, 1);
			assert.strictEqual(outboundMessages[0]?.type, "VOLUME_INITIALIZED");
			assert.strictEqual(workerCache.has(testVol.id), true);

			// Step 2: Request slice extraction via worker handler
			const renderOpts: WorkerRenderSliceOptions = {
				windowWidth: 4400,
				windowLevel: 1300,
				invert: false,
				slabMode: "single",
				slabThicknessMm: 2.0,
				interpolation: "trilinear",
			};

			handleWorkerMessage(
				{
					type: "RENDER_SLICE",
					requestId: 101,
					volumeId: testVol.id,
					plane: "axial",
					crosshairMm: centerPoint,
					angles: DEFAULT_OBLIQUE_ROTATION,
					options: renderOpts,
				},
				postMsg,
				workerCache,
			);

			assert.strictEqual(outboundMessages.length, 2);
			const sliceMsg = outboundMessages[1];
			assert.strictEqual(sliceMsg?.type, "SLICE_RENDERED");
			if (sliceMsg.type !== "SLICE_RENDERED") return;

			assert.strictEqual(sliceMsg.requestId, 101);
			assert.strictEqual(sliceMsg.plane, "axial");

			// Verify zero-copy transferable ArrayBuffer was transferred
			assert.ok(transferredBuffers.length > 0);
			assert.strictEqual(transferredBuffers[0]![0], sliceMsg.pixelBuffer);

			// Step 3: Compare against direct synchronous extractObliqueMprSlice
			const syncResult = extractObliqueMprSlice(
				testVol,
				"axial",
				centerPoint,
				DEFAULT_OBLIQUE_ROTATION,
				renderOpts,
			);

			const workerPixels = new Uint8ClampedArray(sliceMsg.pixelBuffer);
			assert.strictEqual(workerPixels.length, syncResult.data.length);
			assert.deepStrictEqual(sliceMsg.metadata, syncResult.metadata);

			// Verify 100% bit-exact pixel values
			let mismatches = 0;
			for (let i = 0; i < syncResult.data.length; i++) {
				if (workerPixels[i] !== syncResult.data[i]) {
					mismatches++;
				}
			}
			assert.strictEqual(mismatches, 0, "Worker pixels must match synchronous pixels with 0 differences");
		});

		it("produces identical pixel buffers for Coronal and Sagittal planes", () => {
			const workerCache = new Map<string, CbctVoxelVolume>();
			const outboundMessages: CbctWorkerOutboundMessage[] = [];
			const postMsg = (msg: CbctWorkerOutboundMessage) => outboundMessages.push(msg);

			handleWorkerMessage(
				{
					type: "INIT_VOLUME",
					volumeId: testVol.id,
					dimensions: testVol.dimensions,
					spacingMm: testVol.spacingMm,
					originMm: testVol.originMm,
					minHU: testVol.minHU,
					maxHU: testVol.maxHU,
					data: testVol.data!,
				},
				postMsg,
				workerCache,
			);

			const planes: MprPlane[] = ["coronal", "sagittal"];
			let reqId = 200;

			for (const plane of planes) {
				const renderOpts: WorkerRenderSliceOptions = {
					windowWidth: 3500,
					windowLevel: 900,
					invert: false,
					slabMode: "single",
					slabThicknessMm: 1.0,
					interpolation: "trilinear",
				};

				handleWorkerMessage(
					{
						type: "RENDER_SLICE",
						requestId: ++reqId,
						volumeId: testVol.id,
						plane,
						crosshairMm: centerPoint,
						angles: DEFAULT_OBLIQUE_ROTATION,
						options: renderOpts,
					},
					postMsg,
					workerCache,
				);

				const lastMsg = outboundMessages[outboundMessages.length - 1];
				assert.strictEqual(lastMsg?.type, "SLICE_RENDERED");
				if (lastMsg.type !== "SLICE_RENDERED") return;

				const syncRes = extractObliqueMprSlice(
					testVol,
					plane,
					centerPoint,
					DEFAULT_OBLIQUE_ROTATION,
					renderOpts,
				);

				const workerPixels = new Uint8ClampedArray(lastMsg.pixelBuffer);
				assert.strictEqual(workerPixels.length, syncRes.data.length);
				assert.deepStrictEqual(lastMsg.metadata, syncRes.metadata);

				let diffs = 0;
				for (let i = 0; i < syncRes.data.length; i++) {
					if (workerPixels[i] !== syncRes.data[i]) diffs++;
				}
				assert.strictEqual(diffs, 0, `${plane} slice pixel parity must be 100%`);
			}
		});
	});

	describe("2. Synchronized 3-Plane Batch Rendering (RENDER_ALL_PLANES)", () => {
		it("extracts all 3 MPR planes simultaneously with single message and multi-transferable buffers", () => {
			const workerCache = new Map<string, CbctVoxelVolume>();
			const outboundMessages: CbctWorkerOutboundMessage[] = [];
			const transferredBuffers: Transferable[][] = [];

			const postMsg = (msg: CbctWorkerOutboundMessage, transfer?: Transferable[]) => {
				outboundMessages.push(msg);
				if (transfer) transferredBuffers.push(transfer);
			};

			handleWorkerMessage(
				{
					type: "INIT_VOLUME",
					volumeId: testVol.id,
					dimensions: testVol.dimensions,
					spacingMm: testVol.spacingMm,
					originMm: testVol.originMm,
					minHU: testVol.minHU,
					maxHU: testVol.maxHU,
					data: testVol.data!,
				},
				postMsg,
				workerCache,
			);

			const renderOpts: WorkerRenderSliceOptions = {
				windowWidth: 4400,
				windowLevel: 1300,
				invert: true,
				slabMode: "single",
				slabThicknessMm: 2.0,
				interpolation: "trilinear",
			};

			handleWorkerMessage(
				{
					type: "RENDER_ALL_PLANES",
					requestId: 301,
					volumeId: testVol.id,
					crosshairMm: centerPoint,
					angles: DEFAULT_OBLIQUE_ROTATION,
					options: renderOpts,
				},
				postMsg,
				workerCache,
			);

			assert.strictEqual(outboundMessages.length, 2);
			const allPlanesMsg = outboundMessages[1];
			assert.strictEqual(allPlanesMsg?.type, "ALL_PLANES_RENDERED");
			if (allPlanesMsg.type !== "ALL_PLANES_RENDERED") return;

			assert.strictEqual(allPlanesMsg.requestId, 301);
			assert.ok(allPlanesMsg.slices.axial);
			assert.ok(allPlanesMsg.slices.coronal);
			assert.ok(allPlanesMsg.slices.sagittal);

			// Verify 3 distinct transferable buffers were transmitted
			assert.strictEqual(transferredBuffers[0]!.length, 3);
			assert.strictEqual(transferredBuffers[0]![0], allPlanesMsg.slices.axial.pixelBuffer);
			assert.strictEqual(transferredBuffers[0]![1], allPlanesMsg.slices.coronal.pixelBuffer);
			assert.strictEqual(transferredBuffers[0]![2], allPlanesMsg.slices.sagittal.pixelBuffer);
		});
	});

	describe("3. Oblique Rotation Angles & Slab Thickness Projection Modes", () => {
		it("maintains parity during non-trivial oblique angle rotations (yaw/pitch/roll)", () => {
			const workerCache = new Map<string, CbctVoxelVolume>();
			const outboundMessages: CbctWorkerOutboundMessage[] = [];
			const postMsg = (msg: CbctWorkerOutboundMessage) => outboundMessages.push(msg);

			handleWorkerMessage(
				{
					type: "INIT_VOLUME",
					volumeId: testVol.id,
					dimensions: testVol.dimensions,
					spacingMm: testVol.spacingMm,
					originMm: testVol.originMm,
					minHU: testVol.minHU,
					maxHU: testVol.maxHU,
					data: testVol.data!,
				},
				postMsg,
				workerCache,
			);

			const obliqueAngles = {
				axialAngleDeg: 35,
				coronalTiltDeg: -15,
				sagittalTiltDeg: 20,
			};

			const renderOpts: WorkerRenderSliceOptions = {
				windowWidth: 4400,
				windowLevel: 1300,
				invert: false,
				slabMode: "single",
				slabThicknessMm: 2.0,
				interpolation: "trilinear",
			};

			handleWorkerMessage(
				{
					type: "RENDER_SLICE",
					requestId: 401,
					volumeId: testVol.id,
					plane: "axial",
					crosshairMm: { x: 1.0, y: -0.5, z: 2.0 },
					angles: obliqueAngles,
					options: renderOpts,
				},
				postMsg,
				workerCache,
			);

			const lastMsg = outboundMessages[outboundMessages.length - 1];
			assert.strictEqual(lastMsg?.type, "SLICE_RENDERED");
			if (lastMsg.type !== "SLICE_RENDERED") return;

			const syncRes = extractObliqueMprSlice(
				testVol,
				"axial",
				{ x: 1.0, y: -0.5, z: 2.0 },
				obliqueAngles,
				renderOpts,
			);

			const workerPixels = new Uint8ClampedArray(lastMsg.pixelBuffer);
			assert.deepStrictEqual(workerPixels, syncRes.data);
		});

		it("maintains parity across slab projection modes: MIP, MinIP, Average", () => {
			const workerCache = new Map<string, CbctVoxelVolume>();
			const outboundMessages: CbctWorkerOutboundMessage[] = [];
			const postMsg = (msg: CbctWorkerOutboundMessage) => outboundMessages.push(msg);

			handleWorkerMessage(
				{
					type: "INIT_VOLUME",
					volumeId: testVol.id,
					dimensions: testVol.dimensions,
					spacingMm: testVol.spacingMm,
					originMm: testVol.originMm,
					minHU: testVol.minHU,
					maxHU: testVol.maxHU,
					data: testVol.data!,
				},
				postMsg,
				workerCache,
			);

			const slabModes: SlabProjectionMode[] = ["mip", "minip", "average"];
			let reqId = 500;

			for (const slabMode of slabModes) {
				const renderOpts: WorkerRenderSliceOptions = {
					windowWidth: 4000,
					windowLevel: 1000,
					invert: false,
					slabMode,
					slabThicknessMm: 3.0,
					interpolation: "trilinear",
				};

				handleWorkerMessage(
					{
						type: "RENDER_SLICE",
						requestId: ++reqId,
						volumeId: testVol.id,
						plane: "coronal",
						crosshairMm: centerPoint,
						angles: DEFAULT_OBLIQUE_ROTATION,
						options: renderOpts,
					},
					postMsg,
					workerCache,
				);

				const lastMsg = outboundMessages[outboundMessages.length - 1];
				assert.strictEqual(lastMsg?.type, "SLICE_RENDERED");
				if (lastMsg.type !== "SLICE_RENDERED") return;

				const syncRes = extractObliqueMprSlice(
					testVol,
					"coronal",
					centerPoint,
					DEFAULT_OBLIQUE_ROTATION,
					renderOpts,
				);

				const workerPixels = new Uint8ClampedArray(lastMsg.pixelBuffer);
				assert.deepStrictEqual(workerPixels, syncRes.data, `Slab mode ${slabMode} must have exact parity`);
			}
		});
	});

	describe("4. Volume Lifecycle & Disposal in Worker Memory", () => {
		it("releases volume memory upon DISPOSE_VOLUME and returns error on disposed requests", () => {
			const workerCache = new Map<string, CbctVoxelVolume>();
			const outboundMessages: CbctWorkerOutboundMessage[] = [];
			const postMsg = (msg: CbctWorkerOutboundMessage) => outboundMessages.push(msg);

			handleWorkerMessage(
				{
					type: "INIT_VOLUME",
					volumeId: testVol.id,
					dimensions: testVol.dimensions,
					spacingMm: testVol.spacingMm,
					originMm: testVol.originMm,
					minHU: testVol.minHU,
					maxHU: testVol.maxHU,
					data: testVol.data!,
				},
				postMsg,
				workerCache,
			);

			assert.strictEqual(workerCache.has(testVol.id), true);

			// Dispose volume
			handleWorkerMessage(
				{
					type: "DISPOSE_VOLUME",
					volumeId: testVol.id,
				},
				postMsg,
				workerCache,
			);

			assert.strictEqual(workerCache.has(testVol.id), false);
			const disposeAck = outboundMessages.find((m) => m.type === "VOLUME_DISPOSED");
			assert.ok(disposeAck);

			// Attempt render on disposed volume
			handleWorkerMessage(
				{
					type: "RENDER_SLICE",
					requestId: 601,
					volumeId: testVol.id,
					plane: "axial",
					crosshairMm: centerPoint,
					angles: DEFAULT_OBLIQUE_ROTATION,
					options: {
						windowWidth: 4400,
						windowLevel: 1300,
					},
				},
				postMsg,
				workerCache,
			);

			const lastMsg = outboundMessages[outboundMessages.length - 1];
			assert.strictEqual(lastMsg?.type, "ERROR");
			if (lastMsg.type === "ERROR") {
				assert.strictEqual(lastMsg.requestId, 601);
				assert.ok(lastMsg.error.includes("disposed"));
			}
		});
	});

	describe("5. CbctWorkerBridge Transparent Fallback Mode", () => {
		it("executes synchronous fallback seamlessly when worker is disabled or unavailable", async () => {
			const bridge = new CbctWorkerBridge({ forceFallback: true });
			assert.strictEqual(bridge.isFallbackMode(), true);

			bridge.initVolume(testVol);
			assert.strictEqual(bridge.getActiveVolumeId(), testVol.id);

			const renderOpts: WorkerRenderSliceOptions = {
				windowWidth: 4400,
				windowLevel: 1300,
				invert: false,
				slabMode: "single",
				slabThicknessMm: 2.0,
				interpolation: "trilinear",
			};

			// Test single slice render fallback
			const axialSlice = await bridge.renderSlice({
				volume: testVol,
				plane: "axial",
				crosshairMm: centerPoint,
				obliqueAngles: DEFAULT_OBLIQUE_ROTATION,
				options: renderOpts,
			});

			assert.ok(axialSlice.data instanceof Uint8ClampedArray);
			assert.strictEqual(axialSlice.metadata.plane, "axial");

			// Test multi-plane synchronized render fallback
			const allSlices = await bridge.renderAllPlanes({
				volume: testVol,
				crosshairMm: centerPoint,
				obliqueAngles: DEFAULT_OBLIQUE_ROTATION,
				options: renderOpts,
			});

			assert.ok(allSlices.axial.data);
			assert.ok(allSlices.coronal.data);
			assert.ok(allSlices.sagittal.data);

			assert.strictEqual(allSlices.axial.metadata.plane, "axial");
			assert.strictEqual(allSlices.coronal.metadata.plane, "coronal");
			assert.strictEqual(allSlices.sagittal.metadata.plane, "sagittal");

			bridge.dispose();
			assert.strictEqual(bridge.getActiveVolumeId(), null);
		});
	});

	describe("6. CbctWorkerBridge Simulated Worker Thread Integration", () => {
		it("integrates with worker message stream, resolves promises, and handles request batching", async () => {
			const workerCache = new Map<string, CbctVoxelVolume>();

			// Create a simulated Worker object that routes postMessage directly to handleWorkerMessage
			class SimulatedWorker {
				public onmessage: ((event: MessageEvent<CbctWorkerOutboundMessage>) => void) | null = null;
				public onerror: ((error: ErrorEvent) => void) | null = null;

				public postMessage(msg: CbctWorkerInboundMessage): void {
					// Asynchronous microtask turn simulation (like real Worker message dispatch)
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

				public terminate(): void {
					this.onmessage = null;
					this.onerror = null;
				}
			}

			const simulatedWorkerInstance = new SimulatedWorker();
			const bridge = new CbctWorkerBridge({
				forceFallback: false,
				workerFactory: () => simulatedWorkerInstance as unknown as Worker,
			});

			assert.strictEqual(bridge.isFallbackMode(), false);

			bridge.initVolume(testVol);

			const renderOpts: WorkerRenderSliceOptions = {
				windowWidth: 4400,
				windowLevel: 1300,
				invert: false,
				slabMode: "single",
				slabThicknessMm: 2.0,
				interpolation: "trilinear",
			};

			// Execute async worker render for all planes
			const result = await bridge.renderAllPlanes({
				volume: testVol,
				crosshairMm: centerPoint,
				obliqueAngles: DEFAULT_OBLIQUE_ROTATION,
				options: renderOpts,
				requestId: 701,
			});

			assert.ok(result.axial.data);
			assert.ok(result.coronal.data);
			assert.ok(result.sagittal.data);

			// Compare pixel data with synchronous reference
			const syncRef = extractObliqueMprSlice(testVol, "axial", centerPoint, DEFAULT_OBLIQUE_ROTATION, renderOpts);
			assert.deepStrictEqual(result.axial.data, syncRef.data);

			// Test single slice render through bridge worker
			const sagittalResult = await bridge.renderSlice({
				volume: testVol,
				plane: "sagittal",
				crosshairMm: centerPoint,
				obliqueAngles: DEFAULT_OBLIQUE_ROTATION,
				options: renderOpts,
				requestId: 702,
			});

			const syncSagittalRef = extractObliqueMprSlice(testVol, "sagittal", centerPoint, DEFAULT_OBLIQUE_ROTATION, renderOpts);
			assert.deepStrictEqual(sagittalResult.data, syncSagittalRef.data);

			bridge.dispose();
			assert.strictEqual(bridge.isFallbackMode(), true);
		});
	});
});
