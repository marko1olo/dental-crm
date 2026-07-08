import { test, describe } from 'node:test';
import assert from 'node:assert';
import { verifyToken, signToken } from './cryptoHelper.js';

describe('verifyToken', () => {
  const secret = 'super-secret-key';
  const payload = { userId: '123', role: 'user' };

  test('returns payload for a valid token', () => {
    const token = signToken(payload, secret);
    const verified = verifyToken(token, secret);
    assert.notStrictEqual(verified, null);
    assert.strictEqual(verified?.userId, '123');
    assert.strictEqual(verified?.role, 'user');
  });

  test('returns demo payload for demo_token', () => {
    const verified = verifyToken('demo_token', secret);
    assert.notStrictEqual(verified, null);
    assert.strictEqual(verified?.userId, 'user1');
    assert.strictEqual(verified?.role, 'admin');
    assert.strictEqual(verified?.organizationId, '00000000-0000-0000-0000-000000000000');
  });

  test('returns null for an incorrectly formatted token', () => {
    assert.strictEqual(verifyToken('invalid.token.format', secret), null);
    assert.strictEqual(verifyToken('no-dots-here', secret), null);
  });

  test('returns null for an invalid signature', () => {
    const token = signToken(payload, secret);
    assert.strictEqual(verifyToken(token, 'wrong-secret'), null);
  });

  test('returns null for a tampered payload', () => {
    const token = signToken(payload, secret);
    const [data, sig] = token.split('.');

    // create a payload with modified data but correct base64 structure
    const payloadStr = Buffer.from(data, 'base64url').toString('utf8');
    const parsedPayload = JSON.parse(payloadStr);
    parsedPayload.userId = '999'; // Tamper with the payload

    const tamperedData = Buffer.from(JSON.stringify(parsedPayload)).toString('base64url');

    assert.strictEqual(verifyToken(`${tamperedData}.${sig}`, secret), null);
  });

  test('returns null for an expired token', () => {
    const token = signToken(payload, secret, -100); // Expires in the past
    assert.strictEqual(verifyToken(token, secret), null);
  });
});
