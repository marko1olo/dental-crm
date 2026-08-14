import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ImplantStabilityCalculator } from "@dental/shared";

describe("Dental Implantology & RFA ISQ Biomechanical Engine", () => {
	it("calculates multi-vector ISQ mean and anisotropy delta", () => {
		const result2D = ImplantStabilityCalculator.calculateMeanIsq(74, 78);
		assert.equal(result2D.isqMean, 76);
		assert.equal(result2D.isqAnisotropyDelta, 4);

		const result3D = ImplantStabilityCalculator.calculateMeanIsq(70, 68, 72);
		assert.equal(result3D.isqMean, 70);
		assert.equal(result3D.isqAnisotropyDelta, 4);
	});

	it("evaluates immediate loading protocol on day 0 when ISQ >= 70 and Torque >= 35 N·cm", () => {
		const evalHigh = ImplantStabilityCalculator.evaluateLoadingProtocol(
			75,
			40,
			0,
		);
		assert.equal(evalHigh.protocol, "immediate_functional_loading");
		assert.equal(evalHigh.status, "primary_mechanical_high");
		assert.equal(evalHigh.isBiologicalDip, false);

		const evalLow = ImplantStabilityCalculator.evaluateLoadingProtocol(
			55,
			20,
			0,
		);
		assert.equal(evalLow.protocol, "submerged_two_stage");
	});

	it("detects biological stability dip during weeks 2-4 (days 14-30)", () => {
		const evalDip = ImplantStabilityCalculator.evaluateLoadingProtocol(
			63,
			45,
			21,
		);
		assert.equal(evalDip.status, "biological_dip_phase");
		assert.equal(evalDip.isBiologicalDip, true);
	});

	it("evaluates secondary osseointegration maturation after week 6", () => {
		const evalIntegrated = ImplantStabilityCalculator.evaluateLoadingProtocol(
			78,
			35,
			56,
		);
		assert.equal(evalIntegrated.protocol, "immediate_functional_loading");
		assert.equal(evalIntegrated.status, "secondary_osseointegrated");
	});
});
