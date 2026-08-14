import { describe, expect, it } from "vitest";
import { ImplantStabilityCalculator } from "@dental/shared";

describe("Dental Implantology & RFA ISQ Biomechanical Engine", () => {
	it("calculates multi-vector ISQ mean and anisotropy delta", () => {
		const result2D = ImplantStabilityCalculator.calculateMeanIsq(74, 78);
		expect(result2D.isqMean).toBe(76.0);
		expect(result2D.isqAnisotropyDelta).toBe(4);

		const result3D = ImplantStabilityCalculator.calculateMeanIsq(70, 68, 72);
		expect(result3D.isqMean).toBe(70.0);
		expect(result3D.isqAnisotropyDelta).toBe(4);
	});

	it("evaluates immediate loading protocol on day 0 when ISQ >= 70 and Torque >= 35 N·cm", () => {
		const evalHigh = ImplantStabilityCalculator.evaluateLoadingProtocol(
			75,
			40,
			0,
		);
		expect(evalHigh.protocol).toBe("immediate_functional_loading");
		expect(evalHigh.status).toBe("primary_mechanical_high");
		expect(evalHigh.isBiologicalDip).toBe(false);

		const evalLow = ImplantStabilityCalculator.evaluateLoadingProtocol(
			55,
			20,
			0,
		);
		expect(evalLow.protocol).toBe("submerged_two_stage");
	});

	it("detects biological stability dip during weeks 2-4 (days 14-30)", () => {
		const evalDip = ImplantStabilityCalculator.evaluateLoadingProtocol(
			63,
			45,
			21, // 3 weeks post-op
		);
		expect(evalDip.status).toBe("biological_dip_phase");
		expect(evalDip.isBiologicalDip).toBe(true);
	});

	it("evaluates secondary osseointegration maturation after week 6", () => {
		const evalIntegrated = ImplantStabilityCalculator.evaluateLoadingProtocol(
			78,
			35,
			56, // 8 weeks post-op
		);
		expect(evalIntegrated.protocol).toBe("immediate_functional_loading");
		expect(evalIntegrated.status).toBe("secondary_osseointegrated");
	});

	it("generates mathematical stability trajectory combining primary decay and secondary sigmoidal osseogenesis", () => {
		const curve = ImplantStabilityCalculator.calculateStabilityCurve(75, 90);
		expect(curve.length).toBeGreaterThan(15);
		expect(curve[0].day).toBe(0);
		expect(curve[0].primaryStability).toBe(75);
		// As days increase, primary decay drops while secondary increases
		const day30 = curve.find((c) => c.day === 30);
		expect(day30).toBeDefined();
		expect(day30!.primaryStability).toBeLessThan(20);
		expect(day30!.secondaryStability).toBeGreaterThan(45);
	});

	it("evaluates All-on-X AP-Spread, cantilever safety limit, and Multi-Unit Abutment angles", () => {
		const implants = [
			{
				toothNumberFdi: 36,
				positionWorldMm: { x: -18, y: -10, z: 0 },
				axisVector: { x: -0.5, y: 0, z: 0.866 }, // ~30 deg tilt
				insertionTorqueNcm: 45,
				baselineIsq: 75,
			},
			{
				toothNumberFdi: 32,
				positionWorldMm: { x: -6, y: 5, z: 0 },
				axisVector: { x: 0, y: 0, z: 1.0 }, // 0 deg
				insertionTorqueNcm: 40,
				baselineIsq: 72,
			},
			{
				toothNumberFdi: 42,
				positionWorldMm: { x: 6, y: 5, z: 0 },
				axisVector: { x: 0, y: 0, z: 1.0 }, // 0 deg
				insertionTorqueNcm: 40,
				baselineIsq: 74,
			},
			{
				toothNumberFdi: 46,
				positionWorldMm: { x: 18, y: -10, z: 0 },
				axisVector: { x: 0.5, y: 0, z: 0.866 }, // ~30 deg tilt
				insertionTorqueNcm: 45,
				baselineIsq: 76,
			},
		];

		const evalMandible = ImplantStabilityCalculator.evaluateAllOnXGeometry(
			"mandible",
			implants,
			14.0, // 14mm planned cantilever
		);

		expect(evalMandible.apSpreadMm).toBe(15.0); // 5 - (-10) = 15.0
		expect(evalMandible.maxSafeCantileverMm).toBe(18.0); // capped at 18.0 mm
		expect(evalMandible.isCantileverSafe).toBe(true);
		expect(evalMandible.immediateLoadingPass).toBe(true);
		expect(evalMandible.abutmentPlan.length).toBe(4);
		expect(evalMandible.abutmentPlan[0].recommendedAbutmentAngle).toBe("30");
		expect(evalMandible.abutmentPlan[1].recommendedAbutmentAngle).toBe("0");
	});
});
