import { test, describe } from 'node:test';
import assert from 'node:assert';
import { mprSliceFraction } from '../mprControlMath.js';

describe('mprSliceFraction', () => {
  test('returns 0 when maxIndex is <= 0', () => {
    assert.strictEqual(mprSliceFraction(50, 0), 0);
    assert.strictEqual(mprSliceFraction(50, -10), 0);
  });

  test('returns correct fraction for normal values', () => {
    assert.strictEqual(mprSliceFraction(50, 100), 0.5);
    assert.strictEqual(mprSliceFraction(25, 100), 0.25);
  });

  test('clamps sliceIndex below 0', () => {
    assert.strictEqual(mprSliceFraction(-10, 100), 0);
  });

  test('clamps sliceIndex above maxIndex', () => {
    assert.strictEqual(mprSliceFraction(110, 100), 1);
  });

  test('does not round decimal results', () => {
    assert.strictEqual(mprSliceFraction(33.3, 100), 0.333);
  });

  test('handles NaN values safely', () => {
    assert.ok(Number.isNaN(mprSliceFraction(NaN, 100)));
  });
});
