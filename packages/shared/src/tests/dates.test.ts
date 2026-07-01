import { describe, test } from 'node:test';
import assert from 'node:assert';
import { normalizeDate } from '../utils/dates.js';

describe('normalizeDate', () => {
  test('returns null for null or empty values', () => {
    assert.strictEqual(normalizeDate(null), null);
    assert.strictEqual(normalizeDate(''), null);
  });

  test('normalizes DD/MM/YYYY format', () => {
    assert.strictEqual(normalizeDate('31/12/2023'), '2023-12-31');
    assert.strictEqual(normalizeDate('1/2/2023'), '2023-02-01');
    assert.strictEqual(normalizeDate('01/02/2023'), '2023-02-01');
  });

  test('normalizes DD-MM-YYYY format', () => {
    assert.strictEqual(normalizeDate('31-12-2023'), '2023-12-31');
    assert.strictEqual(normalizeDate('1-2-2023'), '2023-02-01');
  });

  test('normalizes DD.MM.YYYY format', () => {
    assert.strictEqual(normalizeDate('31.12.2023'), '2023-12-31');
    assert.strictEqual(normalizeDate('1.2.2023'), '2023-02-01');
  });

  test('trims whitespace', () => {
    assert.strictEqual(normalizeDate('  31/12/2023  '), '2023-12-31');
  });

  test('returns original string if format does not match', () => {
    assert.strictEqual(normalizeDate('2023-12-31'), '2023-12-31');
    assert.strictEqual(normalizeDate('invalid'), 'invalid');
    assert.strictEqual(normalizeDate('31/12/23'), '31/12/23');
  });
});
