import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { clampMprSlabMm, formatMprAxisRangeValue } from "./mprMath.js";

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

describe("formatMprAxisRangeValue", () => {
  it("should return the disabled message when canOpenMpr is false", () => {
    assert.equal(
      formatMprAxisRangeValue({ canOpenMpr: false, axisDeg: 0 }),
      "Ось включится после выбора готовой КЛКТ/КТ-серии.",
    );
  });

  it("should format correctly for axisDeg = 0", () => {
    assert.equal(
      formatMprAxisRangeValue({ canOpenMpr: true, axisDeg: 0 }),
      "ось без наклона, диапазон -90°...+90°.",
    );
  });

  it("should format correctly for positive axisDeg", () => {
    assert.equal(
      formatMprAxisRangeValue({ canOpenMpr: true, axisDeg: 45 }),
      "ось +45° вправо, диапазон -90°...+90°.",
    );
  });

  it("should format correctly for negative axisDeg", () => {
    assert.equal(
      formatMprAxisRangeValue({ canOpenMpr: true, axisDeg: -45 }),
      "ось -45° влево, диапазон -90°...+90°.",
    );
  });

  it("should format correctly clamped when axisDeg is greater than 90", () => {
    assert.equal(
      formatMprAxisRangeValue({ canOpenMpr: true, axisDeg: 120 }),
      "ось +90° вправо, диапазон -90°...+90°.",
    );
  });

  it("should format correctly clamped when axisDeg is less than -90", () => {
    assert.equal(
      formatMprAxisRangeValue({ canOpenMpr: true, axisDeg: -120 }),
      "ось -90° влево, диапазон -90°...+90°.",
    );
  });

  it("should format correctly with rounding for fractional axisDeg", () => {
    assert.equal(
      formatMprAxisRangeValue({ canOpenMpr: true, axisDeg: 45.4 }),
      "ось +45° вправо, диапазон -90°...+90°.",
    );
    assert.equal(
      formatMprAxisRangeValue({ canOpenMpr: true, axisDeg: -45.5 }),
      "ось -45° влево, диапазон -90°...+90°.",
    );
  });
});
