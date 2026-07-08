import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { polylineLengthMm } from "./mprMath.js";
import type { DicomViewerToolStatePoint } from "@dental/shared";

describe("polylineLengthMm", () => {
  const createPoint = (x: number, y: number, z: number): DicomViewerToolStatePoint => ({
    world: [x, y, z],
    canvas: null,
    plane: null,
    sourceIndex: 0
  });

  it("should return null for an empty array", () => {
    assert.equal(polylineLengthMm([]), null);
  });

  it("should return null for an array with 1 point", () => {
    assert.equal(polylineLengthMm([createPoint(0, 0, 0)]), null);
  });

  it("should calculate the correct distance for 2 points", () => {
    const points = [
      createPoint(0, 0, 0),
      createPoint(3, 4, 0) // Distance should be 5
    ];
    assert.equal(polylineLengthMm(points), 5);
  });

  it("should calculate the correct distance for 3 or more points", () => {
    const points = [
      createPoint(0, 0, 0),
      createPoint(0, 10, 0), // Distance from start: 10
      createPoint(10, 10, 0), // Distance from previous: 10
      createPoint(10, 10, 10) // Distance from previous: 10
    ]; // Total should be 30
    assert.equal(polylineLengthMm(points), 30);
  });

  it("should handle rounding to 2 decimal places correctly", () => {
    const points = [
      createPoint(0, 0, 0),
      createPoint(1.111, 2.222, 3.333) // Math.hypot(1.111, 2.222, 3.333) = ~4.156
    ];
    // 4.156 rounded to 2 decimal places is 4.16
    assert.equal(polylineLengthMm(points), 4.16);
  });
});
