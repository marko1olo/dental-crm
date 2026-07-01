import { describe, test } from 'node:test';
import assert from 'node:assert';
import { normalizeDate } from '../utils/dates.js';

describe('normalizeDate', () => {
  test('returns null for falsy values', () => {
    assert.strictEqual(normalizeDate(null), null);
    assert.strictEqual(normalizeDate(''), null);
  });

  test('normalizes dates with . delimiter', () => {
    assert.strictEqual(normalizeDate('01.12.2023'), '2023-12-01');
    assert.strictEqual(normalizeDate('31.01.2024'), '2024-01-31');
  });

  test('normalizes dates with - delimiter', () => {
    assert.strictEqual(normalizeDate('01-12-2023'), '2023-12-01');
    assert.strictEqual(normalizeDate('15-05-2022'), '2022-05-15');
  });

  test('normalizes dates with / delimiter', () => {
    assert.strictEqual(normalizeDate('01/12/2023'), '2023-12-01');
    assert.strictEqual(normalizeDate('28/02/2021'), '2021-02-28');
  });

  test('pads single digit days and months', () => {
    assert.strictEqual(normalizeDate('1.2.2023'), '2023-02-01');
    assert.strictEqual(normalizeDate('5-9-1999'), '1999-09-05');
    assert.strictEqual(normalizeDate('9/1/2000'), '2000-01-09');
  });

  test('trims whitespace', () => {
    assert.strictEqual(normalizeDate('  01.12.2023  '), '2023-12-01');
    assert.strictEqual(normalizeDate('\t1.2.2023\n'), '2023-02-01');
  });

  test('returns original trimmed string for invalid formats', () => {
    assert.strictEqual(normalizeDate('invalid date'), 'invalid date');
    assert.strictEqual(normalizeDate('2023-12-01'), '2023-12-01'); // Already in YYYY-MM-DD
    assert.strictEqual(normalizeDate('01.12.23'), '01.12.23'); // 2-digit year
    assert.strictEqual(normalizeDate('1/2'), '1/2'); // Missing year
  });
});
