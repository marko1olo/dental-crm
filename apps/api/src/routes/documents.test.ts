import { test, describe } from 'node:test';
import assert from 'node:assert';
import { normalizedTaxpayerInn } from './documents.js';

describe('normalizedTaxpayerInn', () => {
  test('returns only digits from a string with mixed characters', () => {
    assert.strictEqual(normalizedTaxpayerInn('123-456'), '123456');
    assert.strictEqual(normalizedTaxpayerInn('abc123def456'), '123456');
    assert.strictEqual(normalizedTaxpayerInn('  123 456  '), '123456');
  });

  test('returns empty string for null', () => {
    assert.strictEqual(normalizedTaxpayerInn(null), '');
  });

  test('returns empty string for undefined', () => {
    assert.strictEqual(normalizedTaxpayerInn(undefined), '');
  });

  test('returns empty string for empty string input', () => {
    assert.strictEqual(normalizedTaxpayerInn(''), '');
  });

  test('returns empty string for string with no digits', () => {
    assert.strictEqual(normalizedTaxpayerInn('abcdef'), '');
    assert.strictEqual(normalizedTaxpayerInn('!@#$%^'), '');
    assert.strictEqual(normalizedTaxpayerInn('   '), '');
  });

  test('returns the same string if it contains only digits', () => {
    assert.strictEqual(normalizedTaxpayerInn('1234567890'), '1234567890');
  });
});
