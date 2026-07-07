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
        test('returns null for empty payload', () => {
            test('returns null for payload exceeding MAX_QR_BYTES (78 bytes)', () => {
                // 79 bytes payload
                test('returns null when payload is null', () => {
                    test('returns null when payload is an empty string', () => {
                        test('returns null when payload exceeds MAX_QR_BYTES (78 bytes)', () => {
                            const longPayload = 'a'.repeat(79);
                            assert.strictEqual(createTelegramQrSvg(longPayload), null);
                        });
                        test('generates valid SVG for normal payload', () => {
                            const svg = createTelegramQrSvg('https://t.me/example');
                            test('returns valid SVG for normal payload', () => {
                                const payload = 'https://t.me/example';
                                const svg = createTelegramQrSvg(payload);
                                assert.ok(svg !== null);
                                assert.ok(svg.startsWith('<svg'));
                                assert.ok(svg.endsWith('</svg>'));
                                assert.ok(svg.includes('role="img"'));
                                test('returns valid SVG string for valid payload', () => {
                                    const payload = 'https://t.me/dente_bot?start=12345';
                                    const svg = createTelegramQrSvg(payload);
                                    assert.ok(svg);
                                    assert.strictEqual(typeof svg, 'string');
                                    assert.ok(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"'));
                                    assert.ok(svg.includes('viewBox="0 0 41 41"'));
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
                                    test('returns SVG string for valid payload', () => {
                                        const payload = 'https://t.me/examplebot?start=12345';
                                        const svg = createTelegramQrSvg(payload);
                                        assert.ok(svg);
                                        assert.strictEqual(typeof svg, 'string');
                                        test('handles maximum valid payload length (78 bytes)', () => {
                                            assert.ok(svg);
                                            assert.strictEqual(typeof svg, 'string');
                                            test('generates deterministic SVG for same payload', () => {
                                                const payload = 'https://t.me/test_bot';
                                                const svg1 = createTelegramQrSvg(payload);
                                                const svg2 = createTelegramQrSvg(payload);
                                                assert.strictEqual(svg1, svg2);
                                                test('returns consistent SVG for same payload', () => {
                                                    const payload = 'https://t.me/example_bot?start=12345';
                                                    test('returns null for payload exceeding 78 bytes', () => {
                                                        // 78 bytes is the MAX_QR_BYTES for version 4 QR codes
                                                        const largePayload = 'a'.repeat(79);
                                                        assert.strictEqual(createTelegramQrSvg(largePayload), null);
                                                        test('handles exact maximum length payload (78 bytes)', () => {
                                                            test('handles cyrillic characters correctly', () => {
                                                                // UTF-8 cyrillic characters take 2 bytes each
                                                                const cyrillicPayload = 'Привет'; // 6 chars * 2 bytes = 12 bytes
                                                                const svg = createTelegramQrSvg(cyrillicPayload);
                                                                test('returns null for cyrillic payload exceeding 78 bytes', () => {
                                                                    // 40 cyrillic chars = 80 bytes
                                                                    const largeCyrillicPayload = 'а'.repeat(40);
                                                                    assert.strictEqual(createTelegramQrSvg(largeCyrillicPayload), null);
                                                                    test('successfully generates an SVG for a valid payload', () => {
                                                                        const validPayload = 't.me/examplebot?start=123';
                                                                        const result = createTelegramQrSvg(validPayload);
                                                                        assert.notStrictEqual(result, null);
                                                                        assert.ok(result?.startsWith('<svg xmlns="http://www.w3.org/2000/svg"'));
                                                                        assert.ok(result?.includes('<path fill="#111827" d="'));
                                                                        assert.ok(result?.includes('role="img" aria-label="DENTE Telegram QR"'));
                                                                    });
                                                                });
                                                            });
                                                        });
                                                    });
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});
