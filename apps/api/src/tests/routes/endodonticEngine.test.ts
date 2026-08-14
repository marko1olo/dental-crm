import { describe, expect, it } from "vitest";
import {
	NiTiFileFatigueEngine,
	SchneiderCurvatureCalculator,
} from "@dental/shared";

describe("Endodontics, Schneider Curvature & NiTi Fatigue Lifespan Engine", () => {
	it("calculates accurate Schneider curvature angle and radius", () => {
		const result = SchneiderCurvatureCalculator.calculateAngleAndRadius({
			orificePoint: { x: 0, y: 0 },
			departurePoint: { x: 0, y: 10 },
			apicalPoint: { x: 5, y: 18 },
		});

		expect(result.schneiderAngleDeg).toBeGreaterThan(0);
		expect(result.curvatureRadiusMm).toBeGreaterThan(0);
		expect(result.riskCategory).toBeDefined();
	});

	it("computes incremental fatigue accumulation (Delta Phi) with kinematic factors", () => {
		// Continuous rotary file
		const rotary = NiTiFileFatigueEngine.computeIncrementalFatigue({
			durationSeconds: 60,
			fatigueCapSeconds: 600,
			schneiderAngleDeg: 28,
			schneiderRadiusMm: 5.0,
			kinematics: "continuous_rotary",
			isoTipSize: 25,
			taper: 0.06,
		});

		// Reciprocating file (40% stress reduction factor)
		const recip = NiTiFileFatigueEngine.computeIncrementalFatigue({
			durationSeconds: 60,
			fatigueCapSeconds: 600,
			schneiderAngleDeg: 28,
			schneiderRadiusMm: 5.0,
			kinematics: "reciprocating",
			isoTipSize: 25,
			taper: 0.06,
		});

		expect(rotary.deltaPhi).toBeGreaterThan(0);
		expect(recip.deltaPhi).toBeLessThan(rotary.deltaPhi);
		expect(recip.deltaPhi).toBeCloseTo(rotary.deltaPhi * 0.4, 2);
	});

	it("enforces hard digital lockout when cumulative fatigue Phi >= 1.00", () => {
		const activeEval = NiTiFileFatigueEngine.evaluateFileLifeStatus(
			0.35,
			0.15,
		);
		expect(activeEval.newPhi).toBe(0.5);
		expect(activeEval.newStatus).toBe("active");
		expect(activeEval.isLockoutRequired).toBe(false);

		const warningEval = NiTiFileFatigueEngine.evaluateFileLifeStatus(
			0.75,
			0.12,
		);
		expect(warningEval.newPhi).toBe(0.87);
		expect(warningEval.newStatus).toBe("warning_near_fatigue");

		const lockedEval = NiTiFileFatigueEngine.evaluateFileLifeStatus(0.9, 0.15);
		expect(lockedEval.newPhi).toBe(1.05);
		expect(lockedEval.newStatus).toBe("locked_disposed");
		expect(lockedEval.isLockoutRequired).toBe(true);
		expect(lockedEval.lockoutReason).toContain("Исчерпан ресурс");
	});
});
