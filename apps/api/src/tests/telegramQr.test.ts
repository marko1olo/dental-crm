import { test, describe } from 'node:test';
import assert from 'node:assert';
import { createTelegramQrSvg } from '../telegramQr.js';

describe('createTelegramQrSvg', () => {
  test('returns null for null payload', () => {
    assert.strictEqual(createTelegramQrSvg(null), null);
  });

  test('returns null for empty payload', () => {
    assert.strictEqual(createTelegramQrSvg(''), null);
  });

  test('returns null for payload exceeding MAX_QR_BYTES (78 bytes)', () => {
    // 79 bytes payload
    const longPayload = 'a'.repeat(79);
    assert.strictEqual(createTelegramQrSvg(longPayload), null);
  });

  test('returns SVG string for valid payload', () => {
    const payload = 'https://t.me/examplebot?start=12345';
    const svg = createTelegramQrSvg(payload);

    assert.ok(svg);
    assert.strictEqual(typeof svg, 'string');
    assert.ok(svg.startsWith('<svg'));
    assert.ok(svg.endsWith('</svg>'));
    assert.ok(svg.includes('aria-label="DENTE Telegram QR"'));
  });

  test('handles maximum valid payload length (78 bytes)', () => {
    const maxPayload = 'a'.repeat(78);
    const svg = createTelegramQrSvg(maxPayload);

    assert.ok(svg);
    assert.strictEqual(typeof svg, 'string');
    assert.ok(svg.startsWith('<svg'));
    assert.ok(svg.endsWith('</svg>'));
  });
});
