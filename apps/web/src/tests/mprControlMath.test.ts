import { test, describe } from 'node:test';
import assert from 'node:assert';
import { formatMprSliceFractionLabel } from '../mprControlMath.js';

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
