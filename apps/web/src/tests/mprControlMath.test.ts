import { test, describe } from 'node:test';
import assert from 'node:assert';
import { clampMprAxisDeg, clampMprSlabMm, clampMprSliceIndex } from '../mprControlMath.js';

describe('mprControlMath bounds logic', () => {
  describe('clampMprAxisDeg', () => {
    test('returns value within bounds (-90 to 90)', () => {
      assert.strictEqual(clampMprAxisDeg(0), 0);
      assert.strictEqual(clampMprAxisDeg(45), 45);
      assert.strictEqual(clampMprAxisDeg(-45), -45);
      assert.strictEqual(clampMprAxisDeg(90), 90);
      assert.strictEqual(clampMprAxisDeg(-90), -90);
    });

    test('rounds decimal values to nearest integer', () => {
      assert.strictEqual(clampMprAxisDeg(45.4), 45);
      assert.strictEqual(clampMprAxisDeg(45.5), 46);
      assert.strictEqual(clampMprAxisDeg(-45.4), -45);
      assert.strictEqual(clampMprAxisDeg(-45.5), -45); // Math.round(-45.5) = -45
      assert.strictEqual(clampMprAxisDeg(-45.6), -46);
    });

    test('clamps values below min to -90', () => {
      assert.strictEqual(clampMprAxisDeg(-91), -90);
      assert.strictEqual(clampMprAxisDeg(-1000), -90);
    });

    test('clamps values above max to 90', () => {
      assert.strictEqual(clampMprAxisDeg(91), 90);
      assert.strictEqual(clampMprAxisDeg(1000), 90);
    });

    test('returns fallback (0) for non-finite numbers', () => {
      assert.strictEqual(clampMprAxisDeg(NaN), 0);
      assert.strictEqual(clampMprAxisDeg(Infinity), 0);
      assert.strictEqual(clampMprAxisDeg(-Infinity), 0);
    });
  });

  describe('clampMprSlabMm', () => {
    test('returns value within bounds (1 to 30)', () => {
      assert.strictEqual(clampMprSlabMm(1), 1);
      assert.strictEqual(clampMprSlabMm(15), 15);
      assert.strictEqual(clampMprSlabMm(30), 30);
    });

    test('rounds decimal values to nearest integer', () => {
      assert.strictEqual(clampMprSlabMm(15.4), 15);
      assert.strictEqual(clampMprSlabMm(15.5), 16);
    });

    test('clamps values below min to 1', () => {
      assert.strictEqual(clampMprSlabMm(0.9), 1);
      assert.strictEqual(clampMprSlabMm(0), 1);
      assert.strictEqual(clampMprSlabMm(-10), 1);
    });

    test('clamps values above max to 30', () => {
      assert.strictEqual(clampMprSlabMm(30.1), 30);
      assert.strictEqual(clampMprSlabMm(100), 30);
    });

    test('returns fallback (1) for non-finite numbers', () => {
      assert.strictEqual(clampMprSlabMm(NaN), 1);
      assert.strictEqual(clampMprSlabMm(Infinity), 1);
      assert.strictEqual(clampMprSlabMm(-Infinity), 1);
    });
  });

  describe('clampMprSliceIndex', () => {
    test('returns value within bounds (0 to maxIndex)', () => {
      assert.strictEqual(clampMprSliceIndex(0, 100), 0);
      assert.strictEqual(clampMprSliceIndex(50, 100), 50);
      assert.strictEqual(clampMprSliceIndex(100, 100), 100);
    });

    test('rounds decimal values to nearest integer', () => {
      assert.strictEqual(clampMprSliceIndex(50.4, 100), 50);
      assert.strictEqual(clampMprSliceIndex(50.5, 100), 51);
    });

    test('clamps values below 0 to 0', () => {
      assert.strictEqual(clampMprSliceIndex(-1, 100), 0);
      assert.strictEqual(clampMprSliceIndex(-50, 100), 0);
    });

    test('clamps values above maxIndex to maxIndex (rounded)', () => {
      assert.strictEqual(clampMprSliceIndex(101, 100), 100);
      assert.strictEqual(clampMprSliceIndex(50, 45.4), 45);
      assert.strictEqual(clampMprSliceIndex(50, 45.5), 46);
    });

    test('returns fallback (0) for non-finite values', () => {
      assert.strictEqual(clampMprSliceIndex(NaN, 100), 0);
      assert.strictEqual(clampMprSliceIndex(Infinity, 100), 0);
      assert.strictEqual(clampMprSliceIndex(-Infinity, 100), 0);
    });

    test('handles non-finite maxIndex by defaulting to 0', () => {
      assert.strictEqual(clampMprSliceIndex(50, NaN), 0);
      assert.strictEqual(clampMprSliceIndex(50, Infinity), 0);
      assert.strictEqual(clampMprSliceIndex(50, -Infinity), 0);
    });
  });
});
