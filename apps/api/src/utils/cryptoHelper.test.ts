import { test, describe } from 'node:test';
import assert from 'node:assert';
import { signToken, verifyToken, hashCredential, verifyCredential } from './cryptoHelper.js';

describe('cryptoHelper', () => {
  describe('signToken', () => {
    test('returns a correctly formatted token string', () => {
      const token = signToken({ userId: 123 }, 'secret');
      const parts = token.split('.');
      assert.strictEqual(parts.length, 2);
    });

    test('encodes payload correctly', () => {
      const token = signToken({ role: 'admin' }, 'secret');
      const data = token.split('.')[0];
      const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
      assert.strictEqual(payload.role, 'admin');
      assert.ok(payload.iat);
      assert.ok(payload.exp);
    });

    test('respects custom ttlSeconds', () => {
      const token = signToken({ userId: 123 }, 'secret', 3600);
      const data = token.split('.')[0];
      const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
      assert.strictEqual(payload.exp - payload.iat, 3600);
    });
  });

  describe('verifyToken', () => {
    test('verifies a valid token', () => {
      const token = signToken({ userId: 456 }, 'my-secret');
      const payload = verifyToken(token, 'my-secret');
      assert.ok(payload);
      assert.strictEqual(payload.userId, 456);
    });

    test('returns null for invalid signature', () => {
      const token = signToken({ userId: 456 }, 'my-secret');
      const payload = verifyToken(token, 'wrong-secret');
      assert.strictEqual(payload, null);
    });

    test('returns null for expired token', () => {
      const token = signToken({ userId: 456 }, 'my-secret', -10); // expired 10 seconds ago
      const payload = verifyToken(token, 'my-secret');
      assert.strictEqual(payload, null);
    });

    test('returns demo payload for demo_token', () => {
      const payload = verifyToken('demo_token', 'my-secret');
      assert.ok(payload);
      assert.strictEqual(payload.role, 'admin');
    });

    test('returns null for poorly formatted token', () => {
      const payload = verifyToken('bad-format-token', 'my-secret');
      assert.strictEqual(payload, null);
    });

    test('returns null if signature is absent', () => {
      const payload = verifyToken('data-part.', 'my-secret');
      assert.strictEqual(payload, null);
    });
  });

  describe('hashCredential and verifyCredential', () => {
    test('hashes and verifies a credential', () => {
      const hash = hashCredential('my-password');
      assert.ok(hash.includes(':'));

      const isValid = verifyCredential('my-password', hash);
      assert.strictEqual(isValid, true);
    });

    test('returns false for wrong credential', () => {
      const hash = hashCredential('my-password');
      const isValid = verifyCredential('wrong-password', hash);
      assert.strictEqual(isValid, false);
    });

    test('verifies legacy plain credential', () => {
      const isValid = verifyCredential('plain-password', 'plain-password');
      assert.strictEqual(isValid, true);
    });

    test('returns false for invalid hash format (missing salt)', () => {
      const isValid = verifyCredential('my-password', ':hashpart');
      assert.strictEqual(isValid, false);
    });

    test('returns false for invalid hash format (missing hash)', () => {
      const isValid = verifyCredential('my-password', 'saltpart:');
      assert.strictEqual(isValid, false);
    });

    test('returns false when error is thrown (e.g. invalid string)', () => {
      // By passing null, it throws in includes or buffer creation
      // verifyCredential expects string, so we force it with any
      const isValid = verifyCredential('pwd', null as any);
      assert.strictEqual(isValid, false);
    });
  });
});
