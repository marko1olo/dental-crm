import { describe, test } from 'node:test';
import assert from 'node:assert';
import { normalizeDate } from '../utils/dates.js';

describe('normalizeDate', () => {
  test('returns null for null or empty values', () => {
    assert.strictEqual(normalizeDate(null), null);
    assert.strictEqual(normalizeDate(''), null);
  });

  test('trims whitespace', () => {
    assert.strictEqual(normalizeDate(' 01/01/2023 '), '2023-01-01');
  });

  test('normalizes single digit day and month', () => {
    assert.strictEqual(normalizeDate('1/2/2023'), '2023-02-01');
    assert.strictEqual(normalizeDate('01/02/2023'), '2023-02-01');
  });

  test('handles different delimiters', () => {
    assert.strictEqual(normalizeDate('15.04.2024'), '2024-04-15');
    assert.strictEqual(normalizeDate('15-04-2024'), '2024-04-15');
    assert.strictEqual(normalizeDate('15/04/2024'), '2024-04-15');
  });

  test('returns original string for invalid formats', () => {
    // Missing parts
    assert.strictEqual(normalizeDate('15/04'), '15/04');
    assert.strictEqual(normalizeDate('2024'), '2024');

    // YYYY-MM-DD (already formatted or unhandled format)
    assert.strictEqual(normalizeDate('2024-04-15'), '2024-04-15');

    // Invalid delimiters
    assert.strictEqual(normalizeDate('15_04_2024'), '15_04_2024');

    // Invalid character
    assert.strictEqual(normalizeDate('abc'), 'abc');
  });
});
