import { describe, test } from 'node:test';
import assert from 'node:assert';
import { normalizeDate } from '../utils/dates.js';

describe('normalizeDate', () => {
  test('returns null for empty values', () => {
    assert.strictEqual(normalizeDate(null), null);
    assert.strictEqual(normalizeDate(''), null);
  });

  test('trims whitespace', () => {
    assert.strictEqual(normalizeDate('   1/2/2023  '), '2023-02-01');
  });

  test('pads single digit days and months with zero', () => {
    assert.strictEqual(normalizeDate('1/2/2023'), '2023-02-01');
    assert.strictEqual(normalizeDate('01/02/2023'), '2023-02-01');
    assert.strictEqual(normalizeDate('1/12/2023'), '2023-12-01');
    assert.strictEqual(normalizeDate('12/1/2023'), '2023-01-12');
  });

  test('handles different separators', () => {
    assert.strictEqual(normalizeDate('1/2/2023'), '2023-02-01');
    assert.strictEqual(normalizeDate('1.2.2023'), '2023-02-01');
    assert.strictEqual(normalizeDate('1-2-2023'), '2023-02-01');
  });

  test('returns original trimmed string if format does not match', () => {
    assert.strictEqual(normalizeDate('invalid date'), 'invalid date');
    assert.strictEqual(normalizeDate('2023-02-01'), '2023-02-01');
    assert.strictEqual(normalizeDate('1/2/23'), '1/2/23');
  });
});
