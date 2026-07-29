import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { DicomViewerToolStatePoint } from "@dental/shared";
import { clampMprSlabMm, distanceMm } from "./mprMath.js";

function createPoint(
  x: number,
  y: number,
  z: number,
): DicomViewerToolStatePoint {
  return {
    world: [x, y, z],
    canvas: null,
    plane: null,
    sourceIndex: 0,
  };
}

describe("distanceMm", () => {
  it("should return 0 for identical points", () => {
    const p1 = createPoint(1, 2, 3);
    const p2 = createPoint(1, 2, 3);
    assert.equal(distanceMm(p1, p2), 0);
  });

  it("should calculate distance along a single axis", () => {
    const p1 = createPoint(0, 0, 0);
    const p2X = createPoint(5, 0, 0);
    const p2Y = createPoint(0, 7, 0);
    const p2Z = createPoint(0, 0, 9);

    assert.equal(distanceMm(p1, p2X), 5);
    assert.equal(distanceMm(p1, p2Y), 7);
    assert.equal(distanceMm(p1, p2Z), 9);
  });

  it("should calculate distance in 3D space", () => {
    const p1 = createPoint(0, 0, 0);
    const p2 = createPoint(1, 2, 2); // 1^2 + 2^2 + 2^2 = 1 + 4 + 4 = 9, sqrt(9) = 3
    assert.equal(distanceMm(p1, p2), 3);
  });

  it("should calculate distance with negative coordinates", () => {
    const p1 = createPoint(-1, -2, -2);
    const p2 = createPoint(2, 2, 10);

    // dx = -1 - 2 = -3
    // dy = -2 - 2 = -4
    // dz = -2 - 10 = -12
    // dist = sqrt((-3)^2 + (-4)^2 + (-12)^2) = sqrt(9 + 16 + 144) = sqrt(169) = 13
    assert.equal(distanceMm(p1, p2), 13);
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
