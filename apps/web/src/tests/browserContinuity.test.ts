import { test, describe } from 'node:test';
import assert from 'node:assert';
import { formatByteSize, formatMegabytes } from '../browserContinuity.js';

describe('formatMegabytes', () => {
  test('returns "н/д" when value is null', () => {
    assert.strictEqual(formatMegabytes(null), 'н/д');
  });

  test('formats regular integers correctly with ru-RU locale', () => {
    assert.strictEqual(formatMegabytes(0), '0 МБ');
    assert.strictEqual(formatMegabytes(10), '10 МБ');
    assert.strictEqual(formatMegabytes(999), '999 МБ');
  });

  test('formats numbers > 999 with thousand separators', () => {
    // Check against dynamically generated localized strings for cross-environment resilience
    assert.strictEqual(formatMegabytes(1000), `${(1000).toLocaleString('ru-RU')} МБ`);
    assert.strictEqual(formatMegabytes(1234567), `${(1234567).toLocaleString('ru-RU')} МБ`);
  });

  test('formats negative numbers', () => {
    assert.strictEqual(formatMegabytes(-5), '-5 МБ');
    assert.strictEqual(formatMegabytes(-1000), `${(-1000).toLocaleString('ru-RU')} МБ`);
  });

  test('formats decimal numbers', () => {
    assert.strictEqual(formatMegabytes(1.5), '1,5 МБ');
    assert.strictEqual(formatMegabytes(1234.56), `${(1234.56).toLocaleString('ru-RU')} МБ`);
  });
});

describe('formatByteSize', () => {
  test('returns "н/д" for non-numbers, null, and undefined', () => {
    assert.strictEqual(formatByteSize(null), 'н/д');
    assert.strictEqual(formatByteSize(undefined), 'н/д');
    assert.strictEqual(formatByteSize('100' as any), 'н/д');
  });

  test('returns "н/д" for non-finite numbers', () => {
    assert.strictEqual(formatByteSize(Infinity), 'н/д');
    assert.strictEqual(formatByteSize(-Infinity), 'н/д');
    assert.strictEqual(formatByteSize(NaN), 'н/д');
  });

  test('returns "0 МБ" for 0 or negative values', () => {
    assert.strictEqual(formatByteSize(0), '0 МБ');
    assert.strictEqual(formatByteSize(-100), '0 МБ');
    assert.strictEqual(formatByteSize(-1024 * 1024), '0 МБ');
  });

  test('returns "<0,1 МБ" for values between 0 and 0.1 MB (exclusive)', () => {
    assert.strictEqual(formatByteSize(1), '<0,1 МБ');
    assert.strictEqual(formatByteSize(1024), '<0,1 МБ');
    // 0.099 MB
    assert.strictEqual(formatByteSize(0.099 * 1024 * 1024), '<0,1 МБ');
  });

  test('formats values >= 0.1 MB correctly rounded to 1 decimal place', () => {
    // 0.1 MB -> 0,1 МБ
    assert.strictEqual(formatByteSize(0.1 * 1024 * 1024), '0,1 МБ');
    // 0.15 MB -> 0.2 MB (rounded) -> 0,2 МБ
    assert.strictEqual(formatByteSize(0.15 * 1024 * 1024), '0,2 МБ');
    // 1 MB -> 1 МБ
    assert.strictEqual(formatByteSize(1 * 1024 * 1024), '1 МБ');
    // 1.5 MB -> 1,5 МБ
    assert.strictEqual(formatByteSize(1.5 * 1024 * 1024), '1,5 МБ');
  });

  test('formats large values using ru-RU locale formatting', () => {
    // 1234.5 MB -> 1 234,5 МБ
    assert.strictEqual(formatByteSize(1234.5 * 1024 * 1024), `${(1234.5).toLocaleString('ru-RU')} МБ`);
    // 99999.9 MB -> 99 999,9 МБ
    assert.strictEqual(formatByteSize(99999.94 * 1024 * 1024), `${(99999.9).toLocaleString('ru-RU')} МБ`);
  });
});
