import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  clampMprSlabMm,
  clampMprAxisDeg,
  clampMprSliceIndex,
} from "./mprMath.js";

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

describe("clampMprAxisDeg", () => {
  it("should return the value correctly rounded if within bounds [-90, 90]", () => {
    assert.equal(clampMprAxisDeg(0), 0);
    assert.equal(clampMprAxisDeg(45.1), 45);
    assert.equal(clampMprAxisDeg(45.5), 46);
    assert.equal(clampMprAxisDeg(-45.5), -45);
    assert.equal(clampMprAxisDeg(-90), -90);
    assert.equal(clampMprAxisDeg(90), 90);
  });

  it("should clamp values below the minimum bound (-90)", () => {
    assert.equal(clampMprAxisDeg(-91), -90);
    assert.equal(clampMprAxisDeg(-100), -90);
  });

  it("should clamp values above the maximum bound (90)", () => {
    assert.equal(clampMprAxisDeg(91), 90);
    assert.equal(clampMprAxisDeg(100), 90);
  });

  it("should handle non-finite values by returning the fallback value (0)", () => {
    assert.equal(clampMprAxisDeg(NaN), 0);
    assert.equal(clampMprAxisDeg(Infinity), 0);
    assert.equal(clampMprAxisDeg(-Infinity), 0);
  });
});

describe("clampMprSliceIndex", () => {
  it("should return the value correctly rounded if within bounds [0, maxIndex]", () => {
    assert.equal(clampMprSliceIndex(5, 10), 5);
    assert.equal(clampMprSliceIndex(5.1, 10), 5);
    assert.equal(clampMprSliceIndex(5.5, 10), 6);
    assert.equal(clampMprSliceIndex(0, 10), 0);
    assert.equal(clampMprSliceIndex(10, 10), 10);
  });

  it("should clamp values below the minimum bound (0)", () => {
    assert.equal(clampMprSliceIndex(-1, 10), 0);
    assert.equal(clampMprSliceIndex(-10, 10), 0);
  });

  it("should clamp values above the maximum bound (maxIndex)", () => {
    assert.equal(clampMprSliceIndex(11, 10), 10);
    assert.equal(clampMprSliceIndex(100, 10), 10);
  });

  it("should handle non-finite value by returning the fallback value (0)", () => {
    assert.equal(clampMprSliceIndex(NaN, 10), 0);
    assert.equal(clampMprSliceIndex(Infinity, 10), 0);
    assert.equal(clampMprSliceIndex(-Infinity, 10), 0);
  });

  it("should handle non-finite or negative maxIndex by clamping it to 0", () => {
    assert.equal(clampMprSliceIndex(5, -5), 0);
    assert.equal(clampMprSliceIndex(5, NaN), 0);
    assert.equal(clampMprSliceIndex(5, Infinity), 0);
    assert.equal(clampMprSliceIndex(5, -Infinity), 0);
  });
});
