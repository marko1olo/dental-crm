import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mprSliceIndexFromFraction } from "../mprControlMath.js";

describe("mprSliceIndexFromFraction", () => {
  it("calculates index for standard fractions", () => {
    assert.equal(mprSliceIndexFromFraction(0, 100), 0);
    assert.equal(mprSliceIndexFromFraction(0.5, 100), 50);
    assert.equal(mprSliceIndexFromFraction(1, 100), 100);
    assert.equal(mprSliceIndexFromFraction(0.25, 100), 25);
    assert.equal(mprSliceIndexFromFraction(0.75, 100), 75);
  });

  it("handles out of bound fractions by clamping", () => {
    assert.equal(mprSliceIndexFromFraction(-0.5, 100), 0);
    assert.equal(mprSliceIndexFromFraction(1.5, 100), 100);
    assert.equal(mprSliceIndexFromFraction(-1, 100), 0);
    assert.equal(mprSliceIndexFromFraction(2, 100), 100);
  });

  it("handles edge case maxIndex", () => {
    assert.equal(mprSliceIndexFromFraction(0.5, 0), 0);
    assert.equal(mprSliceIndexFromFraction(0.5, -10), 0);
  });

  it("rounds correctly", () => {
    assert.equal(mprSliceIndexFromFraction(0.333, 100), 33);
    assert.equal(mprSliceIndexFromFraction(0.336, 100), 34);
  });
});
