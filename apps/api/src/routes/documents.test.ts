import { test, describe } from 'node:test';
import assert from 'node:assert';
import { documentChainDateRangeIsChronological } from './documents.js';

describe('documentChainDateRangeIsChronological', () => {
  test('returns true for chronological dates', () => {
    assert.strictEqual(documentChainDateRangeIsChronological('2023-01-01', '2023-12-31'), true);
    assert.strictEqual(documentChainDateRangeIsChronological('2023-01-01', '2023-01-02'), true);
  });

  test('returns true for identical dates', () => {
    assert.strictEqual(documentChainDateRangeIsChronological('2023-01-01', '2023-01-01'), true);
  });

  test('returns false for reverse chronological dates', () => {
    assert.strictEqual(documentChainDateRangeIsChronological('2023-12-31', '2023-01-01'), false);
    assert.strictEqual(documentChainDateRangeIsChronological('2023-01-02', '2023-01-01'), false);
  });

  test('returns true when one or both dates are null or undefined', () => {
    assert.strictEqual(documentChainDateRangeIsChronological(null, null), true);
    assert.strictEqual(documentChainDateRangeIsChronological(undefined, undefined), true);
    assert.strictEqual(documentChainDateRangeIsChronological('2023-01-01', null), true);
    assert.strictEqual(documentChainDateRangeIsChronological(null, '2023-01-01'), true);
  });

  test('returns true when one or both dates are empty strings', () => {
    assert.strictEqual(documentChainDateRangeIsChronological('', ''), true);
    assert.strictEqual(documentChainDateRangeIsChronological('  ', '   '), true);
    assert.strictEqual(documentChainDateRangeIsChronological('2023-01-01', ''), true);
    assert.strictEqual(documentChainDateRangeIsChronological('', '2023-01-01'), true);
  });

  test('returns false if start date is invalid format', () => {
    assert.strictEqual(documentChainDateRangeIsChronological('invalid', '2023-01-01'), false);
    assert.strictEqual(documentChainDateRangeIsChronological('2023-13-01', '2023-12-31'), false);
    assert.strictEqual(documentChainDateRangeIsChronological('2023-01-32', '2023-12-31'), false);
  });

  test('returns false if end date is invalid format', () => {
    assert.strictEqual(documentChainDateRangeIsChronological('2023-01-01', 'invalid'), false);
    assert.strictEqual(documentChainDateRangeIsChronological('2023-01-01', '2023-13-01'), false);
    assert.strictEqual(documentChainDateRangeIsChronological('2023-01-01', '2023-01-32'), false);
  });

  test('returns false if both dates are invalid', () => {
    assert.strictEqual(documentChainDateRangeIsChronological('invalid', 'invalid'), false);
  });

  test('handles dates with time correctly by prefix matching', () => {
    assert.strictEqual(documentChainDateRangeIsChronological('2023-01-01T10:00:00Z', '2023-12-31T10:00:00Z'), true);
    assert.strictEqual(documentChainDateRangeIsChronological('2023-12-31T10:00:00Z', '2023-01-01T10:00:00Z'), false);
  });
});
