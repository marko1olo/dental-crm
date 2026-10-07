import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	cephAiInferenceService,
	detectOptimalCephBackend,
	decodeHeatmaps,
	mapImageLandmarksToViewBox,
	mapViewBoxLandmarksToImage,
	CLINICAL_16_CHANNELS,
	SAMPLE_VALIDATION_COORDINATES_1200_896,
	type CephAiBackendPreference,
} from "../cephAiInferenceService";
import {
	calculateCephalometrics,
	type LandmarkKey,
	type Point2D,
} from "../cephalometricMath";

describe("Ceph 2D TRG AI Inference Service & Local Pipeline", () => {
	it("detects and resolves optimal execution provider based on hardware preference", () => {
		const preferences: CephAiBackendPreference[] = ["auto", "webgpu", "webgl", "wasm"];

		for (const pref of preferences) {
			const info = detectOptimalCephBackend(pref);
			assert.ok(info.backend === "webgpu" || info.backend === "webgl" || info.backend === "wasm");
			assert.ok(info.badge.length > 0);
			assert.ok(info.labelRu.length > 0);
			assert.ok(info.descriptionRu.length > 0);
			assert.equal(info.preference, pref);
		}

		// Explicit wasm request should always yield wasm
		const wasmInfo = detectOptimalCephBackend("wasm");
		assert.equal(wasmInfo.backend, "wasm");
		assert.equal(wasmInfo.badge, "CPU");

		// Auto mode returns a valid backend
		const autoInfo = detectOptimalCephBackend("auto");
		assert.ok(["webgpu", "webgl", "wasm"].includes(autoInfo.backend));
	});

	it("accurately decodes heatmaps with local weighted centroid subpixel refinement", () => {
		const numChannels = 29;
		const width = 192;
		const height = 192;
		const planeSize = width * height;
		const heatmaps = new Float32Array(numChannels * planeSize);

		// Place a synthetic Gaussian-like peak on channel 0 (Point A) at (x=50, y=80)
		const targetX = 50;
		const targetY = 80;
		const channel = 0;
		const offset = channel * planeSize;

		// Set center peak
		heatmaps[offset + targetY * width + targetX] = 1.0;
		// Slightly offset weight to the right (x+1) to test subpixel refinement
		heatmaps[offset + targetY * width + (targetX + 1)] = 0.8;
		heatmaps[offset + targetY * width + (targetX - 1)] = 0.2;
		heatmaps[offset + (targetY + 1) * width + targetX] = 0.5;

		const decoded = decodeHeatmaps(heatmaps, numChannels, height, width, 4, 768, 768);

		assert.equal(decoded.length, 29);
		const pt0 = decoded[0]!;
		assert.ok(pt0.confidence > 0.9);

		// With stride 4, center 50 -> 200, but right offset pulls it slightly higher than 200
		assert.ok(pt0.x >= 200 && pt0.x <= 204);
		assert.ok(pt0.y >= 320 && pt0.y <= 324);
	});

	it("converts image coordinates to canvas viewBox (object-contain) and back bidirectionally", () => {
		const imgWidth = 1200;
		const imgHeight = 896;
		const viewBoxWidth = 800;
		const viewBoxHeight = 700;

		const originalPoints: Partial<Record<LandmarkKey, Point2D>> = {
			S: { x: 625.2, y: 303.3 },
			N: { x: 956.1, y: 238.1 },
			A: { x: 974.9, y: 508.6 },
			B: { x: 956.5, y: 718.7 },
		};

		const viewBoxPoints = mapImageLandmarksToViewBox(
			originalPoints,
			imgWidth,
			imgHeight,
			viewBoxWidth,
			viewBoxHeight,
		);

		// Verify Sella is within viewBox bounds
		assert.ok(viewBoxPoints.S);
		assert.ok(viewBoxPoints.S.x > 0 && viewBoxPoints.S.x < viewBoxWidth);
		assert.ok(viewBoxPoints.S.y > 0 && viewBoxPoints.S.y < viewBoxHeight);

		// Convert back to image space
		const restoredImagePoints = mapViewBoxLandmarksToImage(
			viewBoxPoints,
			imgWidth,
			imgHeight,
			viewBoxWidth,
			viewBoxHeight,
		);

		// Must match original image points within 0.2px rounding tolerance
		assert.ok(Math.abs(restoredImagePoints.S!.x - originalPoints.S!.x) < 0.25);
		assert.ok(Math.abs(restoredImagePoints.S!.y - originalPoints.S!.y) < 0.25);
		assert.ok(Math.abs(restoredImagePoints.N!.x - originalPoints.N!.x) < 0.25);
		assert.ok(Math.abs(restoredImagePoints.N!.y - originalPoints.N!.y) < 0.25);
	});

	it("maps all 16 clinical landmarks from Cepha29 manifest to DENTE landmarks", () => {
		const keys = Object.keys(CLINICAL_16_CHANNELS) as LandmarkKey[];
		assert.equal(keys.length, 16);

		const expectedKeys: LandmarkKey[] = [
			"S", "N", "Or", "Po", "ANS", "PNS",
			"A", "B", "Pog", "Gn", "Me", "Go",
			"U1t", "U1a", "L1t", "L1a",
		];

		for (const expected of expectedKeys) {
			assert.ok(CLINICAL_16_CHANNELS[expected], `Missing channel mapping for ${expected}`);
			assert.ok(SAMPLE_VALIDATION_COORDINATES_1200_896[expected], `Missing sample validation for ${expected}`);
		}
	});

	it("runs full inference pipeline and feeds landmarks into cephalometric diagnostic math", async () => {
		// Run inference on sample cephalogram image
		const result = await cephAiInferenceService.runInference(
			"/radiology/sample_trg_cephalogram.jpg",
			{
				backend: "auto",
				targetImageWidth: 1200,
				targetImageHeight: 896,
				viewBoxWidth: 800,
				viewBoxHeight: 700,
			},
		);

		assert.ok(result.latencyMs >= 0);
		assert.ok(result.backendLabel.length > 0);
		assert.equal(result.confidenceSummary.allPlaced, true);
		assert.equal(Object.keys(result.landmarks).length, 16);

		// Verify every single required clinical landmark is present
		for (const key of Object.keys(CLINICAL_16_CHANNELS) as LandmarkKey[]) {
			assert.ok(result.landmarks[key], `Landmark ${key} must be detected`);
			assert.ok(result.rawLandmarks[key], `Raw landmark ${key} must be detected`);
			assert.ok(result.rawLandmarks[key].confidence >= 0.8, `Confidence for ${key} must be >= 0.8`);
		}

		// Feed detected landmarks directly into calculateCephalometrics (Steiner / Tweed / Downs)
		const analysis = calculateCephalometrics(result.landmarks);

		assert.equal(analysis.isComplete, true);
		assert.equal(analysis.placedCount, 16);

		// Verify key clinical angles
		const sna = analysis.measurements.find((m) => m.id === "SNA");
		const snb = analysis.measurements.find((m) => m.id === "SNB");
		const anb = analysis.measurements.find((m) => m.id === "ANB");
		const fma = analysis.measurements.find((m) => m.id === "FMA");

		assert.ok(sna && sna.value !== null);
		assert.ok(snb && snb.value !== null);
		assert.ok(anb && anb.value !== null);
		assert.ok(fma && fma.value !== null);

		// Sample radiograph validation targets: SNA ~ 82.8°, SNB ~ 78.9°, ANB ~ 3.9° (Class I)
		assert.ok(sna.value >= 81 && sna.value <= 84.5, `SNA ${sna.value} should be in [81, 84.5]`);
		assert.ok(snb.value >= 77 && snb.value <= 80.5, `SNB ${snb.value} should be in [77, 80.5]`);
		assert.ok(anb.value >= 3.0 && anb.value <= 4.8, `ANB ${anb.value} should be in [3.0, 4.8]`);
		assert.equal(analysis.diagnosis.skeletalClass, "Class I");
	});

	it("supports manual backend switching without losing state or throwing", () => {
		const service = cephAiInferenceService;

		service.setBackendPreference("webgpu");
		assert.equal(service.getBackendPreference(), "webgpu");

		service.setBackendPreference("webgl");
		assert.equal(service.getBackendPreference(), "webgl");

		service.setBackendPreference("wasm");
		assert.equal(service.getBackendPreference(), "wasm");
		assert.equal(service.getActiveBackendInfo().backend, "wasm");

		service.setBackendPreference("auto");
		assert.equal(service.getBackendPreference(), "auto");
	});
});
