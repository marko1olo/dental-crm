import { test, describe } from 'node:test';
import assert from 'node:assert';
import { safeDenteTelegramPublicHttpsUrl } from './legacyMocks.js';

describe('safeDenteTelegramPublicHttpsUrl', () => {
  test('returns valid URL string for a valid https URL', () => {
    assert.strictEqual(
      safeDenteTelegramPublicHttpsUrl('testField', 'https://example.com/path'),
      'https://example.com/path'
    );
  });

  test('returns null for an invalid URL string', () => {
    assert.strictEqual(
      safeDenteTelegramPublicHttpsUrl('testField', 'not-a-valid-url'),
      null
    );
  });

  test('returns null for a non-https URL', () => {
    assert.strictEqual(
      safeDenteTelegramPublicHttpsUrl('testField', 'http://example.com/path'),
      null
    );
  });

  test('returns null for empty string or null/undefined', () => {
    assert.strictEqual(safeDenteTelegramPublicHttpsUrl('testField', ''), null);
    assert.strictEqual(safeDenteTelegramPublicHttpsUrl('testField', null), null);
    assert.strictEqual(safeDenteTelegramPublicHttpsUrl('testField', undefined), null);
  });

  test('returns null for URL with username/password', () => {
    assert.strictEqual(
      safeDenteTelegramPublicHttpsUrl('testField', 'https://user:pass@example.com'),
      null
    );
  });
});
