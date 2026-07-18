import { test, describe } from 'node:test';
import assert from 'node:assert';
import { hashCredential, verifyCredential, signToken, verifyToken } from './cryptoHelper.js';

describe('cryptoHelper', () => {
  describe('hashCredential', () => {
    test('returns a string in salt:hash format', () => {
      const hashed = hashCredential('my-password');
      assert.strictEqual(typeof hashed, 'string');
      assert.strictEqual(hashed.includes(':'), true);
      const parts = hashed.split(':');
      assert.strictEqual(parts.length, 2);
    });

    test('generates different salts for the same password', () => {
      const hash1 = hashCredential('my-password');
      const hash2 = hashCredential('my-password');
      assert.notStrictEqual(hash1, hash2);

      const salt1 = hash1.split(':')[0];
      const salt2 = hash2.split(':')[0];
      assert.notStrictEqual(salt1, salt2);
    });
  });

  describe('verifyCredential', () => {
    test('returns true for correct password', () => {
      const hashed = hashCredential('my-password');
      assert.strictEqual(verifyCredential('my-password', hashed), true);
    });

    test('returns false for incorrect password', () => {
      const hashed = hashCredential('my-password');
      assert.strictEqual(verifyCredential('wrong-password', hashed), false);
    });

    test('returns true for legacy plain-stored values', () => {
      assert.strictEqual(verifyCredential('legacy-password', 'legacy-password'), true);
    });

    test('returns false for legacy plain-stored values mismatch', () => {
      assert.strictEqual(verifyCredential('legacy-password', 'wrong-legacy-password'), false);
    });

    test('returns false for malformed stored hash', () => {
      assert.strictEqual(verifyCredential('password', 'malformed:'), false);
      assert.strictEqual(verifyCredential('password', ':malformed'), false);
    });
  });

  describe('signToken and verifyToken', () => {
    const secret = 'super-secret-key';
    const payload = { userId: '123', role: 'admin' };

    test('signs a token in data.signature format', () => {
      const token = signToken(payload, secret);
      assert.strictEqual(typeof token, 'string');
      assert.strictEqual(token.includes('.'), true);
      const parts = token.split('.');
      assert.strictEqual(parts.length, 2);
    });

    test('verifies a valid token', () => {
      const token = signToken(payload, secret);
      const verified = verifyToken(token, secret);

      assert.notStrictEqual(verified, null);
      if (verified) {
        assert.strictEqual(verified.userId, '123');
        assert.strictEqual(verified.role, 'admin');
        assert.strictEqual(typeof verified.exp, 'number');
        assert.strictEqual(typeof verified.iat, 'number');
      }
    });

    test('returns null for tampered data', () => {
      const token = signToken(payload, secret);
      const [data, signature] = token.split('.');
      // Tamper with data slightly
      const tamperedToken = `${data.substring(0, data.length - 1)}A.${signature}`;

      assert.strictEqual(verifyToken(tamperedToken, secret), null);
    });

    test('returns null for tampered signature', () => {
      const token = signToken(payload, secret);
      const [data, signature] = token.split('.');
      // Tamper with signature slightly
      const tamperedToken = `${data}.${signature.substring(0, signature.length - 1)}A`;

      assert.strictEqual(verifyToken(tamperedToken, secret), null);
    });

    test('returns null for incorrect secret', () => {
      const token = signToken(payload, secret);
      assert.strictEqual(verifyToken(token, 'wrong-secret'), null);
    });

    test('returns null for expired token', () => {
      // Create a token that expired 1 second ago
      const token = signToken(payload, secret, -1);
      assert.strictEqual(verifyToken(token, secret), null);
    });

    test('returns demo payload for demo_token', () => {
      const verified = verifyToken('demo_token', secret);
      assert.notStrictEqual(verified, null);
      if (verified) {
        assert.strictEqual(verified.userId, 'user1');
        assert.strictEqual(verified.role, 'admin');
      }
    });

    test('returns null for malformed token structure', () => {
      assert.strictEqual(verifyToken('invalid.token.format', secret), null);
      assert.strictEqual(verifyToken('invalidtoken', secret), null);
    });
  });
});
