import { test, describe, it } from 'node:test';
import assert from 'node:assert';
import { resolveMprKeyboardAdjustment, mprSliceIndexFromFraction, formatMprSliceFractionLabel } from '../mprControlMath.js';

describe('resolveMprKeyboardAdjustment', () => {
  const defaultInput = {
    shiftKey: false,
    axisDeg: 0,
    slabMm: 15,
    sliceIndex: 50,
    maxIndex: 100
  };

  test('handles unknown keys by returning null', () => {
    assert.strictEqual(resolveMprKeyboardAdjustment({ ...defaultInput, key: 'a' }), null);
    assert.strictEqual(resolveMprKeyboardAdjustment({ ...defaultInput, key: 'Enter' }), null);
    assert.strictEqual(resolveMprKeyboardAdjustment({ ...defaultInput, key: '' }), null);
  });

  describe('ArrowLeft and ArrowRight (axis adjustment)', () => {
    test('decreases axis without shift (step 1)', () => {
      assert.deepStrictEqual(resolveMprKeyboardAdjustment({ ...defaultInput, key: 'ArrowLeft' }), { kind: 'axis', value: -1 });
    });

    test('increases axis without shift (step 1)', () => {
      assert.deepStrictEqual(resolveMprKeyboardAdjustment({ ...defaultInput, key: 'ArrowRight' }), { kind: 'axis', value: 1 });
    });

    test('decreases axis with shift (step 5)', () => {
      assert.deepStrictEqual(resolveMprKeyboardAdjustment({ ...defaultInput, key: 'ArrowLeft', shiftKey: true }), { kind: 'axis', value: -5 });
    });

    test('increases axis with shift (step 5)', () => {
      assert.deepStrictEqual(resolveMprKeyboardAdjustment({ ...defaultInput, key: 'ArrowRight', shiftKey: true }), { kind: 'axis', value: 5 });
    });

    test('clamps axis to minimum (-90)', () => {
      assert.deepStrictEqual(resolveMprKeyboardAdjustment({ ...defaultInput, key: 'ArrowLeft', shiftKey: true, axisDeg: -88 }), { kind: 'axis', value: -90 });
      assert.deepStrictEqual(resolveMprKeyboardAdjustment({ ...defaultInput, key: 'ArrowLeft', shiftKey: true, axisDeg: -95 }), { kind: 'axis', value: -90 });
    });

    test('clamps axis to maximum (90)', () => {
      assert.deepStrictEqual(resolveMprKeyboardAdjustment({ ...defaultInput, key: 'ArrowRight', shiftKey: true, axisDeg: 88 }), { kind: 'axis', value: 90 });
      assert.deepStrictEqual(resolveMprKeyboardAdjustment({ ...defaultInput, key: 'ArrowRight', shiftKey: true, axisDeg: 95 }), { kind: 'axis', value: 90 });
    });
  });

  describe('PageDown and PageUp (slab adjustment)', () => {
    test('decreases slab without shift (step 1)', () => {
      assert.deepStrictEqual(resolveMprKeyboardAdjustment({ ...defaultInput, key: 'PageDown' }), { kind: 'slab', value: 14 });
    });

    test('increases slab without shift (step 1)', () => {
      assert.deepStrictEqual(resolveMprKeyboardAdjustment({ ...defaultInput, key: 'PageUp' }), { kind: 'slab', value: 16 });
    });

    test('decreases slab with shift (step 5)', () => {
      assert.deepStrictEqual(resolveMprKeyboardAdjustment({ ...defaultInput, key: 'PageDown', shiftKey: true }), { kind: 'slab', value: 10 });
    });

    test('increases slab with shift (step 5)', () => {
      assert.deepStrictEqual(resolveMprKeyboardAdjustment({ ...defaultInput, key: 'PageUp', shiftKey: true }), { kind: 'slab', value: 20 });
    });

    test('clamps slab to minimum (1)', () => {
      assert.deepStrictEqual(resolveMprKeyboardAdjustment({ ...defaultInput, key: 'PageDown', shiftKey: true, slabMm: 4 }), { kind: 'slab', value: 1 });
      assert.deepStrictEqual(resolveMprKeyboardAdjustment({ ...defaultInput, key: 'PageDown', shiftKey: true, slabMm: 0 }), { kind: 'slab', value: 1 });
    });

    test('clamps slab to maximum (30)', () => {
      assert.deepStrictEqual(resolveMprKeyboardAdjustment({ ...defaultInput, key: 'PageUp', shiftKey: true, slabMm: 28 }), { kind: 'slab', value: 30 });
      assert.deepStrictEqual(resolveMprKeyboardAdjustment({ ...defaultInput, key: 'PageUp', shiftKey: true, slabMm: 35 }), { kind: 'slab', value: 30 });
    });
  });

  describe('ArrowDown and ArrowUp (slice adjustment)', () => {
    test('decreases slice without shift (step 1)', () => {
      assert.deepStrictEqual(resolveMprKeyboardAdjustment({ ...defaultInput, key: 'ArrowDown' }), { kind: 'slice', value: 49 });
    });

    test('increases slice without shift (step 1)', () => {
      assert.deepStrictEqual(resolveMprKeyboardAdjustment({ ...defaultInput, key: 'ArrowUp' }), { kind: 'slice', value: 51 });
    });

    test('decreases slice with shift (step 10)', () => {
      assert.deepStrictEqual(resolveMprKeyboardAdjustment({ ...defaultInput, key: 'ArrowDown', shiftKey: true }), { kind: 'slice', value: 40 });
    });

    test('increases slice with shift (step 10)', () => {
      assert.deepStrictEqual(resolveMprKeyboardAdjustment({ ...defaultInput, key: 'ArrowUp', shiftKey: true }), { kind: 'slice', value: 60 });
    });

    test('clamps slice to minimum (0)', () => {
      assert.deepStrictEqual(resolveMprKeyboardAdjustment({ ...defaultInput, key: 'ArrowDown', shiftKey: true, sliceIndex: 5 }), { kind: 'slice', value: 0 });
      assert.deepStrictEqual(resolveMprKeyboardAdjustment({ ...defaultInput, key: 'ArrowDown', shiftKey: true, sliceIndex: -5 }), { kind: 'slice', value: 0 });
    });

    test('clamps slice to maximum (maxIndex)', () => {
      assert.deepStrictEqual(resolveMprKeyboardAdjustment({ ...defaultInput, key: 'ArrowUp', shiftKey: true, sliceIndex: 95, maxIndex: 100 }), { kind: 'slice', value: 100 });
      assert.deepStrictEqual(resolveMprKeyboardAdjustment({ ...defaultInput, key: 'ArrowUp', shiftKey: true, sliceIndex: 105, maxIndex: 100 }), { kind: 'slice', value: 100 });
    });
  });

  describe('Home and End (slice limits)', () => {
    test('Home jumps to start of slice (0)', () => {
      assert.deepStrictEqual(resolveMprKeyboardAdjustment({ ...defaultInput, key: 'Home' }), { kind: 'slice', value: 0 });
      assert.deepStrictEqual(resolveMprKeyboardAdjustment({ ...defaultInput, key: 'Home', shiftKey: true }), { kind: 'slice', value: 0 });
    });

    test('End jumps to end of slice (maxIndex)', () => {
      assert.deepStrictEqual(resolveMprKeyboardAdjustment({ ...defaultInput, key: 'End' }), { kind: 'slice', value: 100 });
      assert.deepStrictEqual(resolveMprKeyboardAdjustment({ ...defaultInput, key: 'End', shiftKey: true }), { kind: 'slice', value: 100 });
    });
  });
});

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

describe('formatMprSliceFractionLabel', () => {
  test('returns "срез к началу серии" for fractions <= 0.12', () => {
    assert.strictEqual(formatMprSliceFractionLabel(0), "срез к началу серии");
    assert.strictEqual(formatMprSliceFractionLabel(0.05), "срез к началу серии");
    assert.strictEqual(formatMprSliceFractionLabel(0.12), "срез к началу серии");
  });

  test('returns "срез в первой половине" for fractions > 0.12 and < 0.38', () => {
    assert.strictEqual(formatMprSliceFractionLabel(0.13), "срез в первой половине");
    assert.strictEqual(formatMprSliceFractionLabel(0.25), "срез в первой половине");
    assert.strictEqual(formatMprSliceFractionLabel(0.37), "срез в первой половине");
  });

  test('returns "срез по центру серии" for fractions >= 0.38 and <= 0.62', () => {
    assert.strictEqual(formatMprSliceFractionLabel(0.38), "срез по центру серии");
    assert.strictEqual(formatMprSliceFractionLabel(0.5), "срез по центру серии");
    assert.strictEqual(formatMprSliceFractionLabel(0.62), "срез по центру серии");
  });

  test('returns "срез во второй половине" for fractions > 0.62 and < 0.88', () => {
    assert.strictEqual(formatMprSliceFractionLabel(0.63), "срез во второй половине");
    assert.strictEqual(formatMprSliceFractionLabel(0.75), "срез во второй половине");
    assert.strictEqual(formatMprSliceFractionLabel(0.87), "срез во второй половине");
  });

  test('returns "срез к концу серии" for fractions >= 0.88', () => {
    assert.strictEqual(formatMprSliceFractionLabel(0.88), "срез к концу серии");
    assert.strictEqual(formatMprSliceFractionLabel(0.95), "срез к концу серии");
    assert.strictEqual(formatMprSliceFractionLabel(1), "срез к концу серии");
  });

  test('handles edge cases (negative values)', () => {
    // Negative values should be clamped to 0
    assert.strictEqual(formatMprSliceFractionLabel(-1), "срез к началу серии");
    assert.strictEqual(formatMprSliceFractionLabel(-0.5), "срез к началу серии");
  });

  test('handles edge cases (values > 1)', () => {
    // Values > 1 should be clamped to 1
    assert.strictEqual(formatMprSliceFractionLabel(2), "срез к концу серии");
    assert.strictEqual(formatMprSliceFractionLabel(1.5), "срез к концу серии");
  });

  test('handles edge cases (invalid numerics)', () => {
    // NaN and Infinity should fall back to 0.5
    assert.strictEqual(formatMprSliceFractionLabel(NaN), "срез по центру серии");
    assert.strictEqual(formatMprSliceFractionLabel(Infinity), "срез по центру серии");
    assert.strictEqual(formatMprSliceFractionLabel(-Infinity), "срез по центру серии");
  });
});
import { test, describe } from 'node:test';
import { clampMprAxisDeg, clampMprSlabMm, clampMprSliceIndex } from '../mprControlMath.js';

describe('mprControlMath bounds logic', () => {
  describe('clampMprAxisDeg', () => {
    test('returns value within bounds (-90 to 90)', () => {
      assert.strictEqual(clampMprAxisDeg(0), 0);
      assert.strictEqual(clampMprAxisDeg(45), 45);
      assert.strictEqual(clampMprAxisDeg(-45), -45);
      assert.strictEqual(clampMprAxisDeg(90), 90);
      assert.strictEqual(clampMprAxisDeg(-90), -90);

    test('rounds decimal values to nearest integer', () => {
      assert.strictEqual(clampMprAxisDeg(45.4), 45);
      assert.strictEqual(clampMprAxisDeg(45.5), 46);
      assert.strictEqual(clampMprAxisDeg(-45.4), -45);
      assert.strictEqual(clampMprAxisDeg(-45.5), -45); // Math.round(-45.5) = -45
      assert.strictEqual(clampMprAxisDeg(-45.6), -46);

    test('clamps values below min to -90', () => {
      assert.strictEqual(clampMprAxisDeg(-91), -90);
      assert.strictEqual(clampMprAxisDeg(-1000), -90);

    test('clamps values above max to 90', () => {
      assert.strictEqual(clampMprAxisDeg(91), 90);
      assert.strictEqual(clampMprAxisDeg(1000), 90);

    test('returns fallback (0) for non-finite numbers', () => {
      assert.strictEqual(clampMprAxisDeg(NaN), 0);
      assert.strictEqual(clampMprAxisDeg(Infinity), 0);
      assert.strictEqual(clampMprAxisDeg(-Infinity), 0);

  describe('clampMprSlabMm', () => {
    test('returns value within bounds (1 to 30)', () => {
      assert.strictEqual(clampMprSlabMm(1), 1);
      assert.strictEqual(clampMprSlabMm(15), 15);
      assert.strictEqual(clampMprSlabMm(30), 30);

    test('rounds decimal values to nearest integer', () => {
      assert.strictEqual(clampMprSlabMm(15.4), 15);
      assert.strictEqual(clampMprSlabMm(15.5), 16);

    test('clamps values below min to 1', () => {
      assert.strictEqual(clampMprSlabMm(0.9), 1);
      assert.strictEqual(clampMprSlabMm(0), 1);
      assert.strictEqual(clampMprSlabMm(-10), 1);

    test('clamps values above max to 30', () => {
      assert.strictEqual(clampMprSlabMm(30.1), 30);
      assert.strictEqual(clampMprSlabMm(100), 30);

    test('returns fallback (1) for non-finite numbers', () => {
      assert.strictEqual(clampMprSlabMm(NaN), 1);
      assert.strictEqual(clampMprSlabMm(Infinity), 1);
      assert.strictEqual(clampMprSlabMm(-Infinity), 1);

  describe('clampMprSliceIndex', () => {
    test('returns value within bounds (0 to maxIndex)', () => {
      assert.strictEqual(clampMprSliceIndex(0, 100), 0);
      assert.strictEqual(clampMprSliceIndex(50, 100), 50);
      assert.strictEqual(clampMprSliceIndex(100, 100), 100);

    test('rounds decimal values to nearest integer', () => {
      assert.strictEqual(clampMprSliceIndex(50.4, 100), 50);
      assert.strictEqual(clampMprSliceIndex(50.5, 100), 51);

    test('clamps values below 0 to 0', () => {
      assert.strictEqual(clampMprSliceIndex(-1, 100), 0);
      assert.strictEqual(clampMprSliceIndex(-50, 100), 0);

    test('clamps values above maxIndex to maxIndex (rounded)', () => {
      assert.strictEqual(clampMprSliceIndex(101, 100), 100);
      assert.strictEqual(clampMprSliceIndex(50, 45.4), 45);
      assert.strictEqual(clampMprSliceIndex(50, 45.5), 46);

    test('returns fallback (0) for non-finite values', () => {
      assert.strictEqual(clampMprSliceIndex(NaN, 100), 0);
      assert.strictEqual(clampMprSliceIndex(Infinity, 100), 0);
      assert.strictEqual(clampMprSliceIndex(-Infinity, 100), 0);

    test('handles non-finite maxIndex by defaulting to 0', () => {
      assert.strictEqual(clampMprSliceIndex(50, NaN), 0);
      assert.strictEqual(clampMprSliceIndex(50, Infinity), 0);
      assert.strictEqual(clampMprSliceIndex(50, -Infinity), 0);
