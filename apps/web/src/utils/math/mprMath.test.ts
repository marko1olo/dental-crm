import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { clampMprSlabMm, formatMprSlabBadge } from "./mprMath.js";

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

describe("formatMprSlabBadge", () => {
  it('should return "слой --" when canOpenMpr is false', () => {
    assert.equal(formatMprSlabBadge(15, false), "слой --");
    assert.equal(formatMprSlabBadge(-10, false), "слой --");
    assert.equal(formatMprSlabBadge(50, false), "слой --");
  });

  it('should format valid slabMm correctly when canOpenMpr is true (or omitted)', () => {
    assert.equal(formatMprSlabBadge(15, true), "15 мм");
    assert.equal(formatMprSlabBadge(15), "15 мм"); // Default parameter check
    assert.equal(formatMprSlabBadge(30), "30 мм");
    assert.equal(formatMprSlabBadge(1), "1 мм");
  });

  it('should format clamped slabMm when out of bounds or non-finite', () => {
    assert.equal(formatMprSlabBadge(-10), "1 мм"); // Clamped to 1
    assert.equal(formatMprSlabBadge(0), "1 мм");   // Clamped to 1
    assert.equal(formatMprSlabBadge(50), "30 мм"); // Clamped to 30
    assert.equal(formatMprSlabBadge(NaN), "1 мм"); // NaN handled
    assert.equal(formatMprSlabBadge(Infinity), "1 мм");
    assert.equal(formatMprSlabBadge(-Infinity), "1 мм");
  });

  it('should format rounded slabMm correctly', () => {
    assert.equal(formatMprSlabBadge(15.1), "15 мм");
    assert.equal(formatMprSlabBadge(15.5), "16 мм");
  });
});
