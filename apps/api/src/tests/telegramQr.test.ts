import { test, describe } from 'node:test';
import assert from 'node:assert';
import { createTelegramQrSvg } from '../telegramQr.js';

describe('createTelegramQrSvg', () => {
  test('returns null when payload is null', () => {
    assert.strictEqual(createTelegramQrSvg(null), null);
  });

  test('returns null when payload is an empty string', () => {
    assert.strictEqual(createTelegramQrSvg(''), null);
  });

  test('returns null when payload exceeds MAX_QR_BYTES (78 bytes)', () => {
    const longPayload = 'a'.repeat(79);
    assert.strictEqual(createTelegramQrSvg(longPayload), null);
  });

  test('successfully generates an SVG for a valid payload', () => {
    const validPayload = 't.me/examplebot?start=123';
    const result = createTelegramQrSvg(validPayload);

    assert.notStrictEqual(result, null);
    assert.ok(result?.startsWith('<svg xmlns="http://www.w3.org/2000/svg"'));
    assert.ok(result?.includes('<path fill="#111827" d="'));
    assert.ok(result?.includes('role="img" aria-label="DENTE Telegram QR"'));
  });
});
