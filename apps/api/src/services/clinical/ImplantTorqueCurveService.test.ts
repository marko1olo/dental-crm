import { ImplantTorqueCurveService } from "./ImplantTorqueCurveService.js";
import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("ImplantTorqueCurveService", () => {
  it("should approve immediate loading for D1-D3 with >= 35 Ncm", () => {
    const result = ImplantTorqueCurveService.evaluateImmediateLoadingGate({
      torqueNcm: 40,
      boneDensity: "D2",
    });
    assert.strictEqual(result.isImmediateLoadingApproved, true);
    assert.strictEqual(result.protocolRequired, "immediate_loading");
  });

  it("should reject immediate loading for < 35 Ncm", () => {
    const result = ImplantTorqueCurveService.evaluateImmediateLoadingGate({
      torqueNcm: 30,
      boneDensity: "D2",
    });
    assert.strictEqual(result.isImmediateLoadingApproved, false);
    assert.strictEqual(result.protocolRequired, "two_stage_implantation");
  });

  it("should reject immediate loading for D4 bone", () => {
    const result = ImplantTorqueCurveService.evaluateImmediateLoadingGate({
      torqueNcm: 40,
      boneDensity: "D4",
    });
    assert.strictEqual(result.isImmediateLoadingApproved, false);
    assert.strictEqual(result.protocolRequired, "two_stage_implantation");
  });

  it("should reject immediate loading for D4 bone and < 35 Ncm", () => {
    const result = ImplantTorqueCurveService.evaluateImmediateLoadingGate({
      torqueNcm: 20,
      boneDensity: "D4",
    });
    assert.strictEqual(result.isImmediateLoadingApproved, false);
    assert.strictEqual(result.protocolRequired, "two_stage_implantation");
  });
});
