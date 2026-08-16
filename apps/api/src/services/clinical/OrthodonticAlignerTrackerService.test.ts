import { OrthodonticAlignerTrackerService } from "./OrthodonticAlignerTrackerService.js";
import { test } from "node:test";
import assert from "node:assert";

test("OrthodonticAlignerTrackerService: compliance evaluation", () => {
    const c1 = OrthodonticAlignerTrackerService.evaluateCompliance(23);
    assert.strictEqual(c1.status, "compliant");

    const c2 = OrthodonticAlignerTrackerService.evaluateCompliance(20);
    assert.strictEqual(c2.status, "at_risk");

    const c3 = OrthodonticAlignerTrackerService.evaluateCompliance(15);
    assert.strictEqual(c3.status, "relapse_warning");
});

test("OrthodonticAlignerTrackerService: progress validation", () => {
    const p1 = OrthodonticAlignerTrackerService.validateProgress(14, 28);
    assert.strictEqual(p1.currentStep, 14);
    assert.strictEqual(p1.totalSteps, 28);
});

test("OrthodonticAlignerTrackerService: IPR calculation", () => {
    const pct = OrthodonticAlignerTrackerService.calculateIprCompletion(0.5, 0.25);
    assert.strictEqual(pct, 50);
});
