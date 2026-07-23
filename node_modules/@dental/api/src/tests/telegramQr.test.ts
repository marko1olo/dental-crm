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

  test('returns null if payload exceeds MAX_QR_BYTES (78 bytes)', () => {
    const longPayload = 'a'.repeat(79);
    assert.strictEqual(createTelegramQrSvg(longPayload), null);
  });

  test('generates valid SVG for normal payload', () => {
    const svg = createTelegramQrSvg('https://t.me/example');
    assert.ok(svg !== null);
    assert.ok(svg.startsWith('<svg'));
    assert.ok(svg.endsWith('</svg>'));
    assert.ok(svg.includes('role="img"'));
    assert.ok(svg.includes('aria-label="DENTE Telegram QR"'));
    assert.ok(svg.includes('<rect width="100%" height="100%" fill="#fff"/>'));
    assert.ok(svg.includes('<path fill="#111827" d="M'));
  });

  test('handles exact max byte limit payload (78 bytes)', () => {
    const maxPayload = 'a'.repeat(78);
    const svg = createTelegramQrSvg(maxPayload);
    assert.ok(svg !== null);
    assert.ok(svg.startsWith('<svg'));
  });

  test('handles multibyte characters within limit', () => {
    // A single emoji can be 4 bytes
    const emojiPayload = '😀'.repeat(19); // 19 * 4 = 76 bytes
    const svg = createTelegramQrSvg(emojiPayload);
    assert.ok(svg !== null);
  });

  test('fails for multibyte characters exceeding limit', () => {
    const emojiPayload = '😀'.repeat(20); // 20 * 4 = 80 bytes
    assert.strictEqual(createTelegramQrSvg(emojiPayload), null);
  });
});
