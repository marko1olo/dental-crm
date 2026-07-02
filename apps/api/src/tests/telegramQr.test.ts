import { test, describe } from 'node:test';
import assert from 'node:assert';
import { createTelegramQrSvg } from '../telegramQr.js';

describe('createTelegramQrSvg', () => {
  test('returns null for null payload', () => {
    assert.strictEqual(createTelegramQrSvg(null), null);
  });

  test('returns null for empty string payload', () => {
    assert.strictEqual(createTelegramQrSvg(''), null);
  });

  test('returns null for payload exceeding MAX_QR_BYTES (78 bytes)', () => {
    const longPayload = 'a'.repeat(79);
    assert.strictEqual(createTelegramQrSvg(longPayload), null);
  });

  test('returns valid SVG string for valid payload', () => {
    const payload = 'https://t.me/dente_bot?start=12345';
    const svg = createTelegramQrSvg(payload);

    assert.ok(svg);
    assert.strictEqual(typeof svg, 'string');
    assert.ok(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"'));
    assert.ok(svg.endsWith('</svg>'));
    assert.ok(svg.includes('viewBox="0 0 41 41"'));
    assert.ok(svg.includes('aria-label="DENTE Telegram QR"'));
    assert.ok(svg.includes('<rect width="100%" height="100%" fill="#fff"/>'));
    assert.ok(svg.includes('<path fill="#111827" d="M'));
  });

  test('generates deterministic SVG for same payload', () => {
    const payload = 'https://t.me/test_bot';
    const svg1 = createTelegramQrSvg(payload);
    const svg2 = createTelegramQrSvg(payload);

    assert.strictEqual(svg1, svg2);
  });
});
