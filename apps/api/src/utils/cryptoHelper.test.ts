import { test, describe } from 'node:test';
import assert from 'node:assert';
import { hashCredential, verifyCredential } from './cryptoHelper.js';

describe('cryptoHelper', () => {
  describe('hashCredential', () => {
    test('returns a string in salt:hash format', () => {
      const result = hashCredential('my-password');
      assert.strictEqual(typeof result, 'string');
      assert.strictEqual(result.includes(':'), true);
      const parts = result.split(':');
      assert.strictEqual(parts.length, 2);
      assert.ok(parts[0].length > 0);
      assert.ok(parts[1].length > 0);
    });

    test('generates unique salts for the same input', () => {
      const result1 = hashCredential('password');
      const result2 = hashCredential('password');
      assert.notStrictEqual(result1, result2);

      const salt1 = result1.split(':')[0];
      const salt2 = result2.split(':')[0];
      assert.notStrictEqual(salt1, salt2);
    });
  });

  describe('verifyCredential', () => {
    test('returns true when checking correct plaintext against hashed credential', () => {
      const plaintext = 'my-secret-password';
      const hashed = hashCredential(plaintext);
      assert.strictEqual(verifyCredential(plaintext, hashed), true);
    });

    test('returns false when checking incorrect plaintext against hashed credential', () => {
      const plaintext = 'my-secret-password';
      const hashed = hashCredential(plaintext);
      assert.strictEqual(verifyCredential('wrong-password', hashed), false);
    });

    test('returns true for legacy plain equality', () => {
      assert.strictEqual(verifyCredential('legacy-password', 'legacy-password'), true);
    });

    test('returns false for incorrect legacy plain equality', () => {
      assert.strictEqual(verifyCredential('wrong-password', 'legacy-password'), false);
    });

    test('returns false for incorrectly formatted stored hash (missing hash part)', () => {
      assert.strictEqual(verifyCredential('password', 'salt-only:'), false);
    });

    test('returns false for incorrectly formatted stored hash (missing salt part)', () => {
      assert.strictEqual(verifyCredential('password', ':hash-only'), false);
    });

    test('returns false for invalid hash structure', () => {
      // Something that throws or fails cleanly (e.g., malformed salt or hash)
      assert.strictEqual(verifyCredential('password', 'salt:invalidhash'), false);
    });

    test('returns false when hash and candidate length mismatch', () => {
      const hashed = hashCredential('password');
      // Append extra data to hash
      const tampered = hashed + 'abcd';
      assert.strictEqual(verifyCredential('password', tampered), false);
    });

    test('handles exceptions gracefully', () => {
      // Pass null/undefined as strings (TypeScript would normally block this, but verify the catch block works)
      // verifyCredential expects string, so we'll force a crash if possible, else it just returns false
      assert.strictEqual(verifyCredential(null as any, 'salt:hash'), false);
    });
  });
});
