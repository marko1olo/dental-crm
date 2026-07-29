import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { clampMprSlabMm, mprSliceFraction } from "./mprMath.js";

describe("clampMprSlabMm", () => {
  it("should return the value correctly rounded if within bounds [1, 30]", () => {
    assert.equal(clampMprSlabMm(15), 15);
    assert.equal(clampMprSlabMm(15.1), 15);
    assert.equal(clampMprSlabMm(15.5), 16);
    assert.equal(clampMprSlabMm(1), 1);
    assert.equal(clampMprSlabMm(30), 30);
  });

  it("should clamp values below the minimum bound (1)", () => {
    assert.equal(clampMprSlabMm(0), 1);
    assert.equal(clampMprSlabMm(-10), 1);
    assert.equal(clampMprSlabMm(0.4), 1);
  });

  it("should clamp values above the maximum bound (30)", () => {
    assert.equal(clampMprSlabMm(31), 30);
    assert.equal(clampMprSlabMm(100), 30);
    assert.equal(clampMprSlabMm(30.5), 30);
  });

  it("should handle non-finite values by returning the fallback value (1)", () => {
    assert.equal(clampMprSlabMm(NaN), 1);
    assert.equal(clampMprSlabMm(Infinity), 1);
    assert.equal(clampMprSlabMm(-Infinity), 1);
  });
});

describe("mprSliceFraction", () => {
  it("should return 0.5 for invalid maxIndex values", () => {
    assert.equal(mprSliceFraction(0, 0), 0.5);
    assert.equal(mprSliceFraction(5, -5), 0.5);
    assert.equal(mprSliceFraction(5, NaN), 0.5);
    assert.equal(mprSliceFraction(5, Infinity), 0.5);
  });

  it("should handle out-of-bounds sliceIndex correctly", () => {
    assert.equal(mprSliceFraction(-5, 10), 0);
    assert.equal(mprSliceFraction(15, 10), 1);
    assert.equal(mprSliceFraction(NaN, 10), 0);
  });

  it("should snap to preset fractions if within tolerance", () => {
    // maxIndex = 10, snapTolerance = 0.5 / 10 = 0.05
    // presets: 0, 0.25, 0.5, 0.75, 1.0

    // sliceIndex = 2 -> fraction 0.2. abs(0.2 - 0.25) = 0.05 <= 0.05, snaps to 0.25
    assert.equal(mprSliceFraction(2, 10), 0.25);

    // sliceIndex = 3 -> fraction 0.3. abs(0.3 - 0.25) = 0.05 <= 0.05, snaps to 0.25
    assert.equal(mprSliceFraction(3, 10), 0.25);

    // sliceIndex = 5 -> fraction 0.5. Snaps to 0.5
    assert.equal(mprSliceFraction(5, 10), 0.5);

    // sliceIndex = 8 -> fraction 0.8. abs(0.8 - 0.75) = 0.05 <= 0.05, snaps to 0.75
    assert.equal(mprSliceFraction(8, 10), 0.75);
  });

  it("should return exact fraction if not within preset tolerance", () => {
    // maxIndex = 100, snapTolerance = 0.5 / 100 = 0.005

    // sliceIndex = 25 -> fraction 0.25. Snaps to 0.25
    assert.equal(mprSliceFraction(25, 100), 0.25);

    // sliceIndex = 26 -> fraction 0.26. abs(0.26 - 0.25) = 0.01 > 0.005, doesn't snap
    assert.equal(mprSliceFraction(26, 100), 0.26);

    // sliceIndex = 30 -> fraction 0.3. doesn't snap
    assert.equal(mprSliceFraction(30, 100), 0.3);
  });

  it("should properly round sliceIndex and maxIndex", () => {
    // maxIndex = 10.4 -> 10. sliceIndex = 4.6 -> 5. Fraction = 5/10 = 0.5
    assert.equal(mprSliceFraction(4.6, 10.4), 0.5);

    // maxIndex = 10.4 -> 10. sliceIndex = 2.4 -> 2. Fraction = 2/10 = 0.2 (snaps to 0.25)
    assert.equal(mprSliceFraction(2.4, 10.4), 0.25);
  });
});
