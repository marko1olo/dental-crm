import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	detectOptimalCephBackend,
	decodeHeatmaps,
	mapImageLandmarksToViewBox,
	mapViewBoxLandmarksToImage,
	type CephAiBackendPreference,
} from "../cephAiInferenceService";
import type { LandmarkKey, Point2D } from "../cephalometricMath";

describe("Ceph 2D TRG AI Backend & Heatmap Decoding", () => {
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

		const wasmInfo = detectOptimalCephBackend("wasm");
		assert.equal(wasmInfo.backend, "wasm");
		assert.equal(wasmInfo.badge, "CPU");

		const autoInfo = detectOptimalCephBackend("auto");
		assert.ok(["webgpu", "webgl", "wasm"].includes(autoInfo.backend));
	});

	it("accurately decodes heatmaps with local weighted centroid subpixel refinement", () => {
		const numChannels = 29;
		const width = 192;
		const height = 192;
		const planeSize = width * height;
		const heatmaps = new Float32Array(numChannels * planeSize);

		const targetX = 50;
		const targetY = 80;
		const channel = 0;
		const offset = channel * planeSize;

		heatmaps[offset + targetY * width + targetX] = 1.0;
		heatmaps[offset + targetY * width + (targetX + 1)] = 0.8;
		heatmaps[offset + targetY * width + (targetX - 1)] = 0.2;
		heatmaps[offset + (targetY + 1) * width + targetX] = 0.5;

		const decoded = decodeHeatmaps(heatmaps, numChannels, height, width, 4, 768, 768);
		assert.equal(decoded.length, 29);
		const pt0 = decoded[0]!;
		assert.ok(pt0.confidence > 0.9);
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

		const viewBoxPoints = mapImageLandmarksToViewBox(originalPoints, imgWidth, imgHeight, viewBoxWidth, viewBoxHeight);
		assert.ok(viewBoxPoints.S);
		assert.ok(viewBoxPoints.S.x > 0 && viewBoxPoints.S.x < viewBoxWidth);
		assert.ok(viewBoxPoints.S.y > 0 && viewBoxPoints.S.y < viewBoxHeight);

		const restoredImagePoints = mapViewBoxLandmarksToImage(viewBoxPoints, imgWidth, imgHeight, viewBoxWidth, viewBoxHeight);
		assert.ok(Math.abs(restoredImagePoints.S!.x - originalPoints.S!.x) < 0.25);
		assert.ok(Math.abs(restoredImagePoints.S!.y - originalPoints.S!.y) < 0.25);
		assert.ok(Math.abs(restoredImagePoints.N!.x - originalPoints.N!.x) < 0.25);
		assert.ok(Math.abs(restoredImagePoints.N!.y - originalPoints.N!.y) < 0.25);
	});
});
