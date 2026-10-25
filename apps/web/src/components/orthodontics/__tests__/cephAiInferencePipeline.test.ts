import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	cephAiInferenceService,
	CLINICAL_16_CHANNELS,
	SAMPLE_VALIDATION_COORDINATES_1200_896,
} from "../cephAiInferenceService";
import { calculateCephalometrics, type LandmarkKey } from "../cephalometricMath";

describe("Ceph 2D TRG AI Inference Pipeline", () => {
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
		const result = await cephAiInferenceService.runInference(
			"/radiology/sample_trg_cephalogram.jpg",
			{ backend: "auto", targetImageWidth: 1200, targetImageHeight: 896, viewBoxWidth: 800, viewBoxHeight: 700 },
		);

		assert.ok(result.latencyMs >= 0);
		assert.ok(result.backendLabel.length > 0);
		assert.equal(result.confidenceSummary.allPlaced, true);
		assert.equal(Object.keys(result.landmarks).length, 16);

		for (const key of Object.keys(CLINICAL_16_CHANNELS) as LandmarkKey[]) {
			assert.ok(result.landmarks[key], `Landmark ${key} must be detected`);
			assert.ok(result.rawLandmarks[key], `Raw landmark ${key} must be detected`);
			assert.ok(result.rawLandmarks[key].confidence >= 0.8, `Confidence for ${key} must be >= 0.8`);
		}

		const analysis = calculateCephalometrics(result.landmarks);
		assert.equal(analysis.isComplete, true);
		assert.equal(analysis.placedCount, 16);

		const sna = analysis.measurements.find((m) => m.id === "SNA");
		const snb = analysis.measurements.find((m) => m.id === "SNB");
		const anb = analysis.measurements.find((m) => m.id === "ANB");

		assert.ok(sna && sna.value !== null);
		assert.ok(snb && snb.value !== null);
		assert.ok(anb && anb.value !== null);
	});

	it("handles fallback gracefully when no ONNX session or webgpu context is available", async () => {
		const result = await cephAiInferenceService.runInference(
			"offline_test_fallback.jpg",
			{ allowFallback: true },
		);
		assert.ok(result.landmarks);
		assert.equal(Object.keys(result.landmarks).length, 16);
	});
});
