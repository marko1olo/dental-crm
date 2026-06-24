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

  test('returns valid SVG for normal payload', () => {
    const payload = 'https://t.me/example';
    const svg = createTelegramQrSvg(payload);
    assert.ok(svg !== null);
    assert.ok(svg.startsWith('<svg'));
    assert.ok(svg.endsWith('</svg>'));
    assert.ok(svg.includes('role="img"'));
    assert.ok(svg.includes('aria-label="DENTE Telegram QR"'));
  });

  test('returns consistent SVG for same payload', () => {
    const payload = 'https://t.me/example_bot?start=12345';
    const svg1 = createTelegramQrSvg(payload);
    const svg2 = createTelegramQrSvg(payload);
    assert.strictEqual(svg1, svg2);
  });

  test('returns null for payload exceeding 78 bytes', () => {
    // 78 bytes is the MAX_QR_BYTES for version 4 QR codes
    const largePayload = 'a'.repeat(79);
    assert.strictEqual(createTelegramQrSvg(largePayload), null);
  });

  test('handles exact maximum length payload (78 bytes)', () => {
    const maxPayload = 'a'.repeat(78);
    const svg = createTelegramQrSvg(maxPayload);
    assert.ok(svg !== null);
  });

  test('handles cyrillic characters correctly', () => {
    // UTF-8 cyrillic characters take 2 bytes each
    const cyrillicPayload = 'Привет'; // 6 chars * 2 bytes = 12 bytes
    const svg = createTelegramQrSvg(cyrillicPayload);
    assert.ok(svg !== null);
  });

  test('returns null for cyrillic payload exceeding 78 bytes', () => {
    // 40 cyrillic chars = 80 bytes
    const largeCyrillicPayload = 'а'.repeat(40);
    assert.strictEqual(createTelegramQrSvg(largeCyrillicPayload), null);
  });
});
