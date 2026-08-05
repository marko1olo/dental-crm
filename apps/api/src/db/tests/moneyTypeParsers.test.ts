import { test, describe } from 'node:test';
import assert from 'node:assert';
import { parseNumericMoney } from '../moneyTypeParsers.js';

describe('parseNumericMoney', () => {
  test('returns null for null or undefined', () => {
    assert.strictEqual(parseNumericMoney(null), null);
    // @ts-expect-error - testing undefined input even if types don't strictly allow it
    assert.strictEqual(parseNumericMoney(undefined), null);
  });

  test('returns original trimmed string for empty or whitespace-only strings', () => {
    assert.strictEqual(parseNumericMoney(''), '');
    assert.strictEqual(parseNumericMoney('   '), '');
  });

  test('returns original string for invalid numeric formats', () => {
    assert.strictEqual(parseNumericMoney('NaN'), 'NaN');
    assert.strictEqual(parseNumericMoney('Infinity'), 'Infinity');
    assert.strictEqual(parseNumericMoney('-Infinity'), '-Infinity');
    assert.strictEqual(parseNumericMoney('123a'), '123a');
    assert.strictEqual(parseNumericMoney('123.45.67'), '123.45.67');
    assert.strictEqual(parseNumericMoney('1,234.56'), '1,234.56'); // commas not supported
  });

  test('successfully parses valid numbers into numbers', () => {
    assert.strictEqual(parseNumericMoney('0'), 0);
    assert.strictEqual(parseNumericMoney('42'), 42);
    assert.strictEqual(parseNumericMoney('-42'), -42);
    assert.strictEqual(parseNumericMoney('1500.50'), 1500.50);
    assert.strictEqual(parseNumericMoney('0.00'), 0);
    assert.strictEqual(parseNumericMoney('-1500.50'), -1500.50);
    assert.strictEqual(parseNumericMoney('0.10'), 0.1);
  });

  test('successfully parses valid numbers with leading zeros into numbers', () => {
    assert.strictEqual(parseNumericMoney('0042'), 42);
    assert.strictEqual(parseNumericMoney('-0042'), -42);
    assert.strictEqual(parseNumericMoney('01500.50'), 1500.50);
    assert.strictEqual(parseNumericMoney('-01500.50'), -1500.50);
  });

  test('returns original string if value exceeds safe precision limit', () => {
    // SAFE_KOPECKS = Number.MAX_SAFE_INTEGER = 9007199254740991
    // Safe money limit is roughly 90071992547409.91

    // Within limits
    assert.strictEqual(parseNumericMoney('90071992547409.91'), 90071992547409.91);

    // Exceeds limits
    assert.strictEqual(parseNumericMoney('90071992547409.92'), '90071992547409.92'); // 90071992547409.92 * 100 > SAFE_KOPECKS
    assert.strictEqual(parseNumericMoney('90071992547410.00'), '90071992547410.00');
    assert.strictEqual(parseNumericMoney('-90071992547410.00'), '-90071992547410.00');
  });

  test('returns original string if round-trip precision is lost', () => {
    // Some values cannot be represented exactly in IEEE 754 and might fail the round-trip check
    assert.strictEqual(parseNumericMoney('90071992547409.9100000001'), '90071992547409.9100000001');
  });
});
