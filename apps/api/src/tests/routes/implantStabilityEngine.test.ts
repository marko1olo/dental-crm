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

	it("generates mathematical stability trajectory combining primary decay and secondary sigmoidal osseogenesis", () => {
		const curve = ImplantStabilityCalculator.calculateStabilityCurve(75, 90);
		assert.ok(curve.length > 15);

		const [initial] = curve;
		assert.ok(initial);
		assert.equal(initial.day, 0);
		assert.equal(initial.primaryStability, 75);

		const day30 = curve.find((point) => point.day === 30);
		assert.ok(day30);
		assert.ok(day30.primaryStability < 20);
		assert.ok(day30.secondaryStability > 45);
	});

	it("evaluates All-on-X AP-Spread, cantilever safety limit, and Multi-Unit Abutment angles", () => {
		const implants = [
			{
				toothNumberFdi: 36,
				positionWorldMm: { x: -18, y: -10, z: 0 },
				axisVector: { x: -0.5, y: 0, z: 0.866 },
				insertionTorqueNcm: 45,
				baselineIsq: 75,
			},
			{
				toothNumberFdi: 32,
				positionWorldMm: { x: -6, y: 5, z: 0 },
				axisVector: { x: 0, y: 0, z: 1 },
				insertionTorqueNcm: 40,
				baselineIsq: 72,
			},
			{
				toothNumberFdi: 42,
				positionWorldMm: { x: 6, y: 5, z: 0 },
				axisVector: { x: 0, y: 0, z: 1 },
				insertionTorqueNcm: 40,
				baselineIsq: 74,
			},
			{
				toothNumberFdi: 46,
				positionWorldMm: { x: 18, y: -10, z: 0 },
				axisVector: { x: 0.5, y: 0, z: 0.866 },
				insertionTorqueNcm: 45,
				baselineIsq: 76,
			},
		];

		const evalMandible = ImplantStabilityCalculator.evaluateAllOnXGeometry(
			"mandible",
			implants,
			14,
		);

		assert.equal(evalMandible.apSpreadMm, 15);
		assert.equal(evalMandible.maxSafeCantileverMm, 18);
		assert.equal(evalMandible.isCantileverSafe, true);
		assert.equal(evalMandible.immediateLoadingPass, true);
		assert.equal(evalMandible.abutmentPlan.length, 4);

		const [firstAbutment, secondAbutment] = evalMandible.abutmentPlan;
		assert.ok(firstAbutment);
		assert.ok(secondAbutment);
		assert.equal(firstAbutment.recommendedAbutmentAngle, "30");
		assert.equal(secondAbutment.recommendedAbutmentAngle, "0");
	});
});
