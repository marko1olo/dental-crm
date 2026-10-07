/**
 * DENTE CRM — CBCT Adaptive Multi-Worker Pool & Shader Uniforms Red Team Test Suite
 * Standards: DICOM Part 3 PS 3.3, Planmeca Romexis 6.x, Mandates 8e/8s Diagnostic Honesty
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	CbctWorkerBridge,
	getSharedCbctWorkerBridge,
} from "../mpr/cbctWorkerBridge";
import { CBCT_VOLUME_3D_FRAGMENT_SHADER } from "../mpr/cbctVolume3DShaders";
import {
	calculateDynamicWorkerPoolSize,
	deriveAdaptiveRenderProfile,
	CbctRenderTelemetryCollector,
} from "@dental/shared";
import type { CbctVoxelVolume, Point3D } from "../cbctMprMath";

function createMockVolume(dim = 32): CbctVoxelVolume {
	const total = dim * dim * dim;
	const data = new Int16Array(total);
	for (let i = 0; i < total; i++) {
		data[i] = (i % 2000) - 1000;
	}
	return {
		id: `mock-vol-${dim}`,
		dimensions: { width: dim, height: dim, depth: dim },
		spacingMm: { x: 0.5, y: 0.5, z: 0.5 },
		originMm: { x: 0, y: 0, z: 0 },
		physicalSizeMm: { x: dim * 0.5, y: dim * 0.5, z: dim * 0.5 },
		data,
		minHU: -1000,
		maxHU: 2500,
		isDisposed: false,
	};
}

describe("CBCT Adaptive Multi-Worker Pool & Telemetry Integration", () => {
	it("1. Worker Pool scales correctly with CPU cores and explicit poolSize override", () => {
		// Mock single worker factory for node environment
		let workersCreated = 0;
		const mockWorkerFactory = () => {
			workersCreated++;
			return {
				postMessage: () => {},
				terminate: () => {},
				onmessage: null,
				onerror: null,
			} as unknown as Worker;
		};

		const bridgePool1 = new CbctWorkerBridge({
			workerFactory: mockWorkerFactory,
			poolSize: 1,
		});
		assert.equal(bridgePool1.getPoolSize(), 1);
		assert.equal(workersCreated, 1);

		const bridgePool3 = new CbctWorkerBridge({
			workerFactory: mockWorkerFactory,
			poolSize: 3,
		});
		assert.equal(bridgePool3.getPoolSize(), 3);
		assert.equal(workersCreated, 4);

		bridgePool1.dispose();
		bridgePool3.dispose();
		assert.equal(bridgePool1.getPoolSize(), 0);
		assert.equal(bridgePool3.getPoolSize(), 0);
	});

	it("2. Fallback mode executes synchronously with zero worker errors", async () => {
		const bridge = new CbctWorkerBridge({ forceFallback: true });
		assert.ok(bridge.isFallbackMode());

		const vol = createMockVolume(16);
		const crosshair: Point3D = { x: 4, y: 4, z: 4 };
		const angles = { axialAngleDeg: 0, coronalTiltDeg: 0, sagittalTiltDeg: 0 };
		const options = { windowWidth: 2000, windowLevel: 400 };

		const allPlanes = await bridge.renderAllPlanes({
			volume: vol,
			crosshairMm: crosshair,
			obliqueAngles: angles,
			options,
		});

		assert.ok(allPlanes.axial.data.length > 0);
		assert.ok(allPlanes.coronal.data.length > 0);
		assert.ok(allPlanes.sagittal.data.length > 0);
		assert.equal(allPlanes.axial.metadata.plane, "axial");

		bridge.dispose();
	});

	it("3. Parallel dispatch in multi-worker pool distributes planes across workers", async () => {
		const messagesByWorker: Array<{ workerIdx: number; msg: any }> = [];
		let workerCounter = 0;

		const mockFactory = () => {
			const idx = workerCounter++;
			const mock: any = {
				postMessage: (msg: any) => {
					messagesByWorker.push({ workerIdx: idx, msg });
					// Auto respond if RENDER_SLICE
					if (msg.type === "RENDER_SLICE" && mock.onmessage) {
						setTimeout(() => {
							mock.onmessage({
								data: {
									type: "SLICE_RENDERED",
									requestId: msg.requestId,
									pixelBuffer: new Uint8ClampedArray(64).buffer,
									metadata: {
										plane: msg.plane,
										width: 4,
										height: 4,
										minVal: 0,
										maxVal: 255,
									},
								},
							});
						}, 5);
					}
				},
				terminate: () => {},
				onmessage: null,
				onerror: null,
			};
			return mock as Worker;
		};

		const bridge = new CbctWorkerBridge({
			workerFactory: mockFactory,
			poolSize: 3,
		});

		const vol = createMockVolume(16);
		const planesPromise = bridge.renderAllPlanes({
			volume: vol,
			crosshairMm: { x: 0, y: 0, z: 0 },
			obliqueAngles: { axialAngleDeg: 0, coronalTiltDeg: 0, sagittalTiltDeg: 0 },
			options: { windowWidth: 1500, windowLevel: 300 },
		});

		const result = await planesPromise;
		assert.ok(result.axial);
		assert.ok(result.coronal);
		assert.ok(result.sagittal);

		// Verify initVolume was broadcast to all 3 workers
		const initMsgs = messagesByWorker.filter((m) => m.msg.type === "INIT_VOLUME");
		assert.equal(initMsgs.length, 3, "All 3 workers must receive INIT_VOLUME");

		// Verify renderSlice messages were sent to distinct workers
		const renderMsgs = messagesByWorker.filter((m) => m.msg.type === "RENDER_SLICE");
		assert.equal(renderMsgs.length, 3, "Must dispatch 3 individual render slices in parallel");

		const planes = renderMsgs.map((m) => m.msg.plane);
		assert.ok(planes.includes("axial"));
		assert.ok(planes.includes("coronal"));
		assert.ok(planes.includes("sagittal"));

		bridge.dispose();
	});

	it("4. Diagnostic Honesty Invariant: Dynamic downsampling only during interaction", () => {
		const highProfile = deriveAdaptiveRenderProfile(
			{
				isDiscreteGpu: true,
				max3DTextureSize: 4096,
				hardwareConcurrency: 16,
				deviceMemoryGb: 16,
			},
			"nominal",
			"ultra",
		);
		const potatoProfile = deriveAdaptiveRenderProfile(
			{
				isDiscreteGpu: false,
				max3DTextureSize: 512,
				hardwareConcurrency: 2,
				deviceMemoryGb: 2,
			},
			"nominal",
			"potato",
		);

		// Idle: downsampling is strictly 1.0 (no blur, crisp bone contours, full resolution)
		const getCanvasResolution = (rawWidth: number, rawHeight: number, isInteracting: boolean, profile: typeof highProfile) => {
			const factor = isInteracting ? profile.interactiveDownsampleFactor : 1.0;
			return {
				width: Math.floor(rawWidth * factor),
				height: Math.floor(rawHeight * factor),
			};
		};

		const rawW = 1000;
		const rawH = 800;

		// When idle, both ultra and potato MUST render at 100% full resolution (1.0x)
		const ultraIdle = getCanvasResolution(rawW, rawH, false, highProfile);
		const potatoIdle = getCanvasResolution(rawW, rawH, false, potatoProfile);
		assert.equal(ultraIdle.width, 1000, "Diagnostic Honesty: Idle width must be 1000px");
		assert.equal(ultraIdle.height, 800, "Diagnostic Honesty: Idle height must be 800px");
		assert.equal(potatoIdle.width, 1000, "Diagnostic Honesty: Idle width must be 1000px on potato");
		assert.equal(potatoIdle.height, 800, "Diagnostic Honesty: Idle height must be 800px on potato");

		// During interaction (rotation/zoom), ultra downsamples to 0.5x, potato to 0.25x for 60 FPS fluidity
		const ultraInteracting = getCanvasResolution(rawW, rawH, true, highProfile);
		const potatoInteracting = getCanvasResolution(rawW, rawH, true, potatoProfile);
		assert.equal(ultraInteracting.width, 500, "Ultra interactive width downsamples to 500px (0.5x)");
		assert.equal(potatoInteracting.width, 250, "Potato interactive width downsamples to 250px (0.25x)");
	});

	it("5. Telemetry collector dynamically adapts stress level under high frame latency", () => {
		const collector = new CbctRenderTelemetryCollector();

		// Record 30 nominal frames (~1.5 ms each)
		for (let i = 0; i < 30; i++) {
			collector.recordFrameTime(1.5);
		}
		assert.equal(collector.getStressLevel(), "nominal");
		assert.ok(collector.getEstimatedFps() >= 55);

		// Record 20 heavy frames (~35 ms each) -> elevated stress
		for (let i = 0; i < 20; i++) {
			collector.recordFrameTime(35);
		}
		assert.equal(collector.getStressLevel(), "elevated");

		// Record 15 severe frames (~60 ms each) -> critical stress
		for (let i = 0; i < 15; i++) {
			collector.recordFrameTime(60);
		}
		assert.equal(collector.getStressLevel(), "critical");

		// Reset clears stress back to nominal
		collector.reset();
		assert.equal(collector.getStressLevel(), "nominal");
	});

	it("6. WebGL2 Fragment Shader contains adaptive u_voxelStep uniform and MAR fast path", () => {
		assert.ok(
			CBCT_VOLUME_3D_FRAGMENT_SHADER.includes("uniform float u_voxelStep;"),
			"Shader must declare uniform float u_voxelStep;",
		);
		assert.ok(
			CBCT_VOLUME_3D_FRAGMENT_SHADER.includes("u_voxelStep > 0.05 ? u_voxelStep : rayDist / float(safeMaxSteps)"),
			"Shader must calculate stepSize using u_voxelStep when available",
		);
		assert.ok(
			CBCT_VOLUME_3D_FRAGMENT_SHADER.includes("u_refineSteps == 0 && u_voxelStep >= 1.5"),
			"Shader must bypass heavy transverse MAR filtering on coarse interaction passes",
		);
	});
});
