import { describe, it } from "node:test";
import assert from "node:assert";
import { clampMprAxisDeg } from "./mprMath.js";

describe("clampMprAxisDeg", () => {
  it("should return the value if within bounds (-90 to 90)", () => {
    assert.strictEqual(clampMprAxisDeg(0), 0);
    assert.strictEqual(clampMprAxisDeg(45), 45);
    assert.strictEqual(clampMprAxisDeg(-45), -45);
    assert.strictEqual(clampMprAxisDeg(90), 90);
    assert.strictEqual(clampMprAxisDeg(-90), -90);
  });

  it("should clamp values above the maximum bound (90)", () => {
    assert.strictEqual(clampMprAxisDeg(91), 90);
    assert.strictEqual(clampMprAxisDeg(100), 90);
    assert.strictEqual(clampMprAxisDeg(1000), 90);
  });

  it("should clamp values below the minimum bound (-90)", () => {
    assert.strictEqual(clampMprAxisDeg(-91), -90);
    assert.strictEqual(clampMprAxisDeg(-100), -90);
    assert.strictEqual(clampMprAxisDeg(-1000), -90);
  });

  it("should round fractional values to the nearest integer", () => {
    assert.strictEqual(clampMprAxisDeg(45.4), 45);
    assert.strictEqual(clampMprAxisDeg(45.5), 46);
    assert.strictEqual(clampMprAxisDeg(45.6), 46);
    assert.strictEqual(clampMprAxisDeg(-45.4), -45);
    assert.strictEqual(clampMprAxisDeg(-45.5), -45);
    assert.strictEqual(clampMprAxisDeg(-45.6), -46);
  });

  it("should fallback to 0 for non-finite values", () => {
    assert.strictEqual(clampMprAxisDeg(NaN), 0);
    assert.strictEqual(clampMprAxisDeg(Infinity), 0);
    assert.strictEqual(clampMprAxisDeg(-Infinity), 0);
  });
});
