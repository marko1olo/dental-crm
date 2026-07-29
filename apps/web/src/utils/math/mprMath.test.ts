import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { clampMprSlabMm, polylineLengthMm } from "./mprMath.js";
import type { DicomViewerToolStatePoint } from "@dental/shared";

const createPoint = (
  x: number,
  y: number,
  z: number,
): DicomViewerToolStatePoint => ({
  world: [x, y, z],
  canvas: null,
  plane: null,
  sourceIndex: 0,
});

describe("polylineLengthMm", () => {
  it("should return null for an empty array", () => {
    assert.equal(polylineLengthMm([]), null);
  });

  it("should return null for an array with a single point", () => {
    assert.equal(polylineLengthMm([createPoint(0, 0, 0)]), null);
  });

  it("should calculate the correct length for two points (3-4-5 triangle)", () => {
    const points = [createPoint(0, 0, 0), createPoint(3, 4, 0)];
    assert.equal(polylineLengthMm(points), 5);
  });

  it("should calculate the correct cumulative length for multiple points", () => {
    const points = [
      createPoint(0, 0, 0),
      createPoint(3, 0, 0),
      createPoint(3, 4, 0),
      createPoint(0, 4, 0),
    ];
    // 3 + 4 + 3 = 10
    assert.equal(polylineLengthMm(points), 10);
  });

  it("should handle non-finite values by returning null", () => {
    const points = [createPoint(0, 0, 0), createPoint(NaN, 4, 0)];
    assert.equal(polylineLengthMm(points), null);

    const points2 = [createPoint(0, 0, 0), createPoint(Infinity, 4, 0)];
    assert.equal(polylineLengthMm(points2), null);
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
