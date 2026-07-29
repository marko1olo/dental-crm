import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { clampMprSlabMm, clampMprAxisDeg } from "./mprMath.js";

describe("clampMprAxisDeg", () => {
  it("should return the value correctly rounded if within bounds [-90, 90]", () => {
    assert.equal(clampMprAxisDeg(45), 45);
    assert.equal(clampMprAxisDeg(45.1), 45);
    assert.equal(clampMprAxisDeg(45.5), 46);
    assert.equal(clampMprAxisDeg(-45.5), -45);
    assert.equal(clampMprAxisDeg(-90), -90);
    assert.equal(clampMprAxisDeg(90), 90);
  });

  it("should clamp values below the minimum bound (-90)", () => {
    assert.equal(clampMprAxisDeg(-91), -90);
    assert.equal(clampMprAxisDeg(-100), -90);
    assert.equal(clampMprAxisDeg(-90.5), -90);
  });

  it("should clamp values above the maximum bound (90)", () => {
    assert.equal(clampMprAxisDeg(91), 90);
    assert.equal(clampMprAxisDeg(100), 90);
    assert.equal(clampMprAxisDeg(90.5), 90);
  });

  it("should handle non-finite values by returning the fallback value (0)", () => {
    assert.equal(clampMprAxisDeg(NaN), 0);
    assert.equal(clampMprAxisDeg(Infinity), 0);
    assert.equal(clampMprAxisDeg(-Infinity), 0);
  });
});

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
