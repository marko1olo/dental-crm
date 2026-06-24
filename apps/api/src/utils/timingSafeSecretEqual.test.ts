import { test, describe } from 'node:test';
import assert from 'node:assert';
import { timingSafeSecretEqual } from './timingSafeSecretEqual.js';

describe('timingSafeSecretEqual', () => {
  test('returns true when secrets match', () => {
    const secret = 'my-super-secret-string';
    assert.strictEqual(timingSafeSecretEqual(secret, secret), true);
  });

  test('returns false when provided secret is null', () => {
    assert.strictEqual(timingSafeSecretEqual(null, 'expected-secret'), false);
  });

  test('returns false when provided secret is empty', () => {
    assert.strictEqual(timingSafeSecretEqual('', 'expected-secret'), false);
  });

  test('returns false when secrets have different lengths', () => {
    assert.strictEqual(timingSafeSecretEqual('short', 'longer-secret'), false);
  });

  test('returns false when secrets have the same length but differ', () => {
    assert.strictEqual(timingSafeSecretEqual('secretA', 'secretB'), false);
  });
});
