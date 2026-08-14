import assert from "node:assert/strict";
import { describe, it } from "node:test";
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

		assert.ok(result.schneiderAngleDeg > 0);
		assert.ok(result.curvatureRadiusMm > 0);
		assert.ok(result.riskCategory);
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

		assert.ok(rotary.deltaPhi > 0);
		assert.ok(recip.deltaPhi < rotary.deltaPhi);
		assert.ok(Math.abs(recip.deltaPhi - rotary.deltaPhi * 0.4) < 0.005);
	});

	it("enforces hard digital lockout when cumulative fatigue Phi >= 1.00", () => {
		const activeEval = NiTiFileFatigueEngine.evaluateFileLifeStatus(0.35, 0.15);
		assert.equal(activeEval.newPhi, 0.5);
		assert.equal(activeEval.newStatus, "active");
		assert.equal(activeEval.isLockoutRequired, false);

		const warningEval = NiTiFileFatigueEngine.evaluateFileLifeStatus(
			0.75,
			0.12,
		);
		assert.equal(warningEval.newPhi, 0.87);
		assert.equal(warningEval.newStatus, "warning_near_fatigue");

		const lockedEval = NiTiFileFatigueEngine.evaluateFileLifeStatus(0.9, 0.15);
		assert.equal(lockedEval.newPhi, 1.05);
		assert.equal(lockedEval.newStatus, "locked_disposed");
		assert.equal(lockedEval.isLockoutRequired, true);
		assert.ok(lockedEval.lockoutReason);
		assert.ok(lockedEval.lockoutReason.includes("Исчерпан ресурс"));
	});
});
