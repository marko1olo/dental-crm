import { describe, test } from 'node:test';
import assert from 'node:assert';
import { normalizeDate } from '../utils/dates.js';

describe('normalizeDate', () => {
  test('returns null for falsy values', () => {
    assert.strictEqual(normalizeDate(null), null);
    assert.strictEqual(normalizeDate(''), null);
  });

  test('normalizes dates with various separators', () => {
    assert.strictEqual(normalizeDate('15/04/2023'), '2023-04-15');
    assert.strictEqual(normalizeDate('15.04.2023'), '2023-04-15');
    assert.strictEqual(normalizeDate('15-04-2023'), '2023-04-15');
  });

  test('pads single-digit days and months', () => {
    assert.strictEqual(normalizeDate('5/4/2023'), '2023-04-05');
    assert.strictEqual(normalizeDate('05/04/2023'), '2023-04-05');
  });

  test('trims whitespace', () => {
    assert.strictEqual(normalizeDate('  15/04/2023  '), '2023-04-15');
    assert.strictEqual(normalizeDate(' \t 5/4/2023 \n'), '2023-04-05');
  });

  test('returns trimmed input for non-matching formats', () => {
    assert.strictEqual(normalizeDate('2023/04/15'), '2023/04/15'); // YYYY/MM/DD
    assert.strictEqual(normalizeDate('invalid date'), 'invalid date');
    assert.strictEqual(normalizeDate('15/04/23'), '15/04/23'); // 2-digit year
    assert.strictEqual(normalizeDate('1/2'), '1/2'); // missing year
  });
});
