import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { clampMprSlabMm, distancePointToLineSegment } from "./mprMath.js";
import { vec3 } from "gl-matrix";

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

describe("distancePointToLineSegment", () => {
  it("should calculate distance when projection is within the segment", () => {
    const p = vec3.fromValues(1, 1, 0);
    const v = vec3.fromValues(0, 0, 0);
    const w = vec3.fromValues(2, 0, 0);
    // Projection of p onto [v,w] is (1,0,0)
    // Distance from (1,1,0) to (1,0,0) is 1
    assert.equal(distancePointToLineSegment(p, v, w), 1);
  });

  it("should clamp to start point when projection falls before segment (t < 0)", () => {
    const p = vec3.fromValues(-1, 0, 0);
    const v = vec3.fromValues(0, 0, 0);
    const w = vec3.fromValues(2, 0, 0);
    // Projection would be (-1,0,0), t = -0.5, clamped to t=0 => point v (0,0,0)
    // Distance from (-1,0,0) to (0,0,0) is 1
    assert.equal(distancePointToLineSegment(p, v, w), 1);
  });

  it("should clamp to end point when projection falls after segment (t > 1)", () => {
    const p = vec3.fromValues(3, 0, 0);
    const v = vec3.fromValues(0, 0, 0);
    const w = vec3.fromValues(2, 0, 0);
    // Projection would be (3,0,0), t = 1.5, clamped to t=1 => point w (2,0,0)
    // Distance from (3,0,0) to (2,0,0) is 1
    assert.equal(distancePointToLineSegment(p, v, w), 1);
  });

  it("should handle zero length segment (v == w)", () => {
    const p = vec3.fromValues(0, 4, 3); // Distance to (0,0,0) is 5
    const v = vec3.fromValues(0, 0, 0);
    const w = vec3.fromValues(0, 0, 0);
    assert.equal(distancePointToLineSegment(p, v, w), 5);
  });

  it("should return 0 when the point lies exactly on the line segment", () => {
    const p = vec3.fromValues(1, 0, 0);
    const v = vec3.fromValues(0, 0, 0);
    const w = vec3.fromValues(2, 0, 0);
    assert.equal(distancePointToLineSegment(p, v, w), 0);
  });
});
