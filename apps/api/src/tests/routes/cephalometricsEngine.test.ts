import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	CephalometricEngine,
	type CephalometricLandmarksInput,
} from "@dental/shared";

describe("Orthodontic Cephalometric Tracing & Craniofacial Analysis Engine", () => {
	// Standard Class I Orthognathic Patient Landmark Set
	const standardClass1Landmarks: CephalometricLandmarksInput = {
		S: { x: 100, y: 100 },
		N: { x: 200, y: 80 },
		Po: { x: 80, y: 150 },
		Or: { x: 180, y: 140 },
		ANS: { x: 210, y: 180 },
		PNS: { x: 130, y: 180 },
		A: { x: 205, y: 200 },
		B: { x: 195, y: 250 },
		Pog: { x: 200, y: 280 },
		Gn: { x: 190, y: 295 },
		Me: { x: 180, y: 300 },
		Go: { x: 100, y: 260 },
		U1_apex: { x: 195, y: 190 },
		U1_tip: { x: 215, y: 230 },
		L1_apex: { x: 185, y: 270 },
		L1_tip: { x: 205, y: 235 },
		Occ_ant: { x: 215, y: 232 },
		Occ_post: { x: 140, y: 220 },
		Prn: { x: 250, y: 160 },
		Sn: { x: 220, y: 190 },
		Ls: { x: 225, y: 210 },
		Li: { x: 220, y: 240 },
		Pog_s: { x: 215, y: 285 },
	};

	it("computes accurate Steiner SNA, SNB, and ANB angles", () => {
		const result = CephalometricEngine.runFullAnalysis(
			standardClass1Landmarks,
			0.2,
		);

		assert.ok(result.steiner.snaDeg > 70);
		assert.ok(result.steiner.snaDeg < 100);
		assert.ok(result.steiner.snbDeg > 65);
		assert.ok(result.steiner.snbDeg < 95);

		// ANB = SNA - SNB
		const calculatedAnb = Number(
			(result.steiner.snaDeg - result.steiner.snbDeg).toFixed(2),
		);
		assert.equal(result.steiner.anbDeg, calculatedAnb);
	});

	it("strictly satisfies the Tweed Diagnostic Triangle Invariant (FMA + IMPA + FMIA = 180.0°)", () => {
		const result = CephalometricEngine.runFullAnalysis(
			standardClass1Landmarks,
			0.2,
		);

		assert.equal(result.tweed.triangleSumDeg, 180.0);
		assert.ok(result.tweed.fmaDeg > 0);
		assert.ok(result.tweed.impaDeg > 0);
		assert.ok(result.tweed.fmiaDeg > 0);
	});

	it("computes Jacobson Wits linear appraisal projection on functional occlusal plane", () => {
		const result = CephalometricEngine.runFullAnalysis(
			standardClass1Landmarks,
			0.2,
		);

		assert.equal(typeof result.wits.witsAoBoMm, "number");
		assert.ok(result.classifications.skeletalClass);
		assert.ok(result.classifications.facialBiotype);
		assert.ok(result.clinicalInterpretation.length > 50);
	});
});
