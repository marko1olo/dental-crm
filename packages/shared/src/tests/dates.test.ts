import { describe, test } from 'node:test';
import assert from 'node:assert';
import { normalizeDate } from '../utils/dates.js';

describe('normalizeDate', () => {
  test('returns null for null or empty values', () => {
    assert.strictEqual(normalizeDate(null), null);
    assert.strictEqual(normalizeDate(''), null);
  });

  test('trims whitespace', () => {
    assert.strictEqual(normalizeDate('  12/05/2023  '), '2023-05-12');
    assert.strictEqual(normalizeDate(' 01/01/2023 '), '2023-01-01');
  });

  test('normalizes dates with different delimiters', () => {
    assert.strictEqual(normalizeDate('12/05/2023'), '2023-05-12');
    assert.strictEqual(normalizeDate('12.05.2023'), '2023-05-12');
    assert.strictEqual(normalizeDate('12-05-2023'), '2023-05-12');
    assert.strictEqual(normalizeDate('15.04.2024'), '2024-04-15');
  });

  test('pads single-digit day and month with zero', () => {
    assert.strictEqual(normalizeDate('1/5/2023'), '2023-05-01');
    assert.strictEqual(normalizeDate('01/5/2023'), '2023-05-01');
    assert.strictEqual(normalizeDate('1/05/2023'), '2023-05-01');
    assert.strictEqual(normalizeDate('1/2/2023'), '2023-02-01');
  });

  test('returns trimmed input if format does not match', () => {
    assert.strictEqual(normalizeDate('invalid date'), 'invalid date');
    assert.strictEqual(normalizeDate('  invalid date  '), 'invalid date');
    assert.strictEqual(normalizeDate('2023-05-12'), '2023-05-12'); // format is YYYY-MM-DD
    assert.strictEqual(normalizeDate('12/05/23'), '12/05/23'); // year has 2 digits
    assert.strictEqual(normalizeDate('123/05/2023'), '123/05/2023'); // day has 3 digits
    assert.strictEqual(normalizeDate('15/04'), '15/04');
    assert.strictEqual(normalizeDate('2024'), '2024');
    assert.strictEqual(normalizeDate('15_04_2024'), '15_04_2024');
    assert.strictEqual(normalizeDate('abc'), 'abc');
  });
});
