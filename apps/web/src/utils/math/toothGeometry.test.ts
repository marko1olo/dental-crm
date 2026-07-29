import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getAngulationWarning } from "./toothGeometry.js";

describe("getAngulationWarning", () => {
  it("should not warn for angles exactly at the boundary (dirZ = 1, -1)", () => {
    const result1 = getAngulationWarning(1);
    assert.equal(result1.isWarning, false);
    assert.equal(result1.angleDeg, 0);

    const result2 = getAngulationWarning(-1);
    assert.equal(result2.isWarning, false);
    assert.equal(result2.angleDeg, 0);
  });

  it("should not warn for angles within the 15 degree limit", () => {
    const dirZ = Math.cos(10 * Math.PI / 180);
    const result = getAngulationWarning(dirZ);
    assert.equal(result.isWarning, false);
    assert.ok(Math.abs(result.angleDeg - 10) < 1e-9);
  });

  it("should not warn for angles exactly at the 15 degree limit", () => {
    const dirZ = Math.cos(15 * Math.PI / 180);
    const result = getAngulationWarning(dirZ);
    assert.equal(result.isWarning, false);
    assert.ok(Math.abs(result.angleDeg - 15) < 1e-9);
  });

  it("should warn for angles exceeding the 15 degree limit", () => {
    const dirZ = Math.cos(20 * Math.PI / 180);
    const result = getAngulationWarning(dirZ);
    assert.equal(result.isWarning, true);
    assert.ok(Math.abs(result.angleDeg - 20) < 1e-9);
    assert.match(result.message || "", /угол наклона оси имплантата слишком велик \(20\.0°\)/);
  });

  it("should clamp out-of-bounds input values to [-1, 1]", () => {
    const result1 = getAngulationWarning(2);
    assert.equal(result1.isWarning, false);
    assert.equal(result1.angleDeg, 0);

    const result2 = getAngulationWarning(-2);
    assert.equal(result2.isWarning, false);
    assert.equal(result2.angleDeg, 0);
  });
});
