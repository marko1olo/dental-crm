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
  });

  test('normalizes dates with different delimiters', () => {
    assert.strictEqual(normalizeDate('12/05/2023'), '2023-05-12');
    assert.strictEqual(normalizeDate('12.05.2023'), '2023-05-12');
    assert.strictEqual(normalizeDate('12-05-2023'), '2023-05-12');
  });

  test('pads single-digit day and month with zero', () => {
    assert.strictEqual(normalizeDate('1/5/2023'), '2023-05-01');
    assert.strictEqual(normalizeDate('01/5/2023'), '2023-05-01');
    assert.strictEqual(normalizeDate('1/05/2023'), '2023-05-01');
  });

  test('returns trimmed input if format does not match', () => {
    assert.strictEqual(normalizeDate('invalid date'), 'invalid date');
    assert.strictEqual(normalizeDate('  invalid date  '), 'invalid date');
    assert.strictEqual(normalizeDate('2023-05-12'), '2023-05-12'); // format is YYYY-MM-DD, our regex expects DD-MM-YYYY
    assert.strictEqual(normalizeDate('12/05/23'), '12/05/23'); // year has 2 digits, our regex expects 4
    assert.strictEqual(normalizeDate('123/05/2023'), '123/05/2023'); // day has 3 digits
  });
});
