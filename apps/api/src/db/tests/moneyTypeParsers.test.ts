import { test, describe } from 'node:test';
import assert from 'node:assert';
import { parseNumericMoney, parseBigIntMoney, NUMERIC_OID, BIGINT_OID, registerMoneyTypeParsers } from '../moneyTypeParsers.js';
import pg from 'pg';

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

  test('normalizes -0.00 and -0 to positive 0 number without negative zero defect', () => {
    assert.strictEqual(parseNumericMoney('-0.00'), 0);
    assert.strictEqual(parseNumericMoney('-0'), 0);
    assert.strictEqual(parseNumericMoney('-0.0'), 0);
    assert.strictEqual(Object.is(parseNumericMoney('-0.00'), 0), true);
    assert.strictEqual(Object.is(parseNumericMoney('-0.00'), -0), false);
  });

  test('successfully parses valid numbers with leading zeros into numbers', () => {
    assert.strictEqual(parseNumericMoney('0042'), 42);
    assert.strictEqual(parseNumericMoney('-0042'), -42);
    assert.strictEqual(parseNumericMoney('01500.50'), 1500.50);
    assert.strictEqual(parseNumericMoney('-01500.50'), -1500.50);
  });

  test('does not crash with RangeError when scale > 100 or scale > 20', () => {
    const scale120 = '1.' + '0'.repeat(120);
    // Must return string and not throw RangeError: toFixed() digits argument must be between 0 and 100
    assert.strictEqual(parseNumericMoney(scale120), scale120);
    const scale30 = '1500.' + '1'.repeat(30);
    assert.strictEqual(parseNumericMoney(scale30), scale30);
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

describe('parseBigIntMoney', () => {
  test('returns null for null or undefined', () => {
    assert.strictEqual(parseBigIntMoney(null), null);
    // @ts-expect-error - testing undefined
    assert.strictEqual(parseBigIntMoney(undefined), null);
  });

  test('returns trimmed string for empty or non-numeric values', () => {
    assert.strictEqual(parseBigIntMoney(''), '');
    assert.strictEqual(parseBigIntMoney('  '), '');
    assert.strictEqual(parseBigIntMoney('abc'), 'abc');
    assert.strictEqual(parseBigIntMoney('12.34'), '12.34');
  });

  test('safely parses safe integers to number', () => {
    assert.strictEqual(parseBigIntMoney('0'), 0);
    assert.strictEqual(parseBigIntMoney('-0'), 0);
    assert.strictEqual(parseBigIntMoney('100'), 100);
    assert.strictEqual(parseBigIntMoney('150050'), 150050);
    assert.strictEqual(parseBigIntMoney('-150050'), -150050);
    assert.strictEqual(parseBigIntMoney(String(Number.MAX_SAFE_INTEGER)), Number.MAX_SAFE_INTEGER);
    assert.strictEqual(parseBigIntMoney(String(Number.MIN_SAFE_INTEGER)), Number.MIN_SAFE_INTEGER);
  });

  test('returns string if bigint exceeds MAX_SAFE_INTEGER or MIN_SAFE_INTEGER', () => {
    const huge = '9007199254740992'; // MAX_SAFE_INTEGER + 1
    assert.strictEqual(parseBigIntMoney(huge), huge);
    const hugeNegative = '-9007199254740992';
    assert.strictEqual(parseBigIntMoney(hugeNegative), hugeNegative);
    const superHuge = '9999999999999999999999999';
    assert.strictEqual(parseBigIntMoney(superHuge), superHuge);
  });
});

describe('registerMoneyTypeParsers', () => {
  test('registers both NUMERIC_OID (1700) and BIGINT_OID (20)', () => {
    registerMoneyTypeParsers();
    const numericParser = pg.types.getTypeParser(NUMERIC_OID as never);
    const bigintParser = pg.types.getTypeParser(BIGINT_OID as never);
    assert.strictEqual(typeof numericParser, 'function');
    assert.strictEqual(typeof bigintParser, 'function');
    assert.strictEqual((numericParser as (v: string) => unknown)('1500.50'), 1500.5);
    assert.strictEqual((bigintParser as (v: string) => unknown)('150050'), 150050);
  });
});
