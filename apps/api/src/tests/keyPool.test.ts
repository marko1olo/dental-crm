import { test, describe, mock, afterEach } from 'node:test';
import assert from 'node:assert';
import { fetchWithProviderTimeout, SpeechProviderRequestError, sanitizeProviderErrorMessage } from '../speech/keyPool.js';

describe('fetchWithProviderTimeout', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    mock.restoreAll();
  });

  test('returns successful response', async () => {
    globalThis.fetch = mock.fn(async () => {
      return new Response('ok', { status: 200 });
    }) as any;

    const response = await fetchWithProviderTimeout('https://example.com');
    const text = await response.text();

    assert.strictEqual(response.status, 200);
    assert.strictEqual(text, 'ok');
  });

  test('throws SpeechProviderRequestError on AbortError timeout', async () => {
    globalThis.fetch = mock.fn(async () => {
      throw new DOMException('The operation was aborted', 'AbortError');
    }) as any;

    try {
      await fetchWithProviderTimeout('https://example.com', {}, 5000);
      assert.fail('Should have thrown an error');
    } catch (error) {
      assert.ok(error instanceof SpeechProviderRequestError, 'Expected a SpeechProviderRequestError');
      assert.strictEqual(error.message, 'Источник распознавания не ответил за 5 сек.');
      assert.strictEqual(error.retryable, true);
      assert.strictEqual(error.timedOut, true);
    }
  });

  test('re-throws generic errors without wrapping', async () => {
    const genericError = new Error('Network failure');
    globalThis.fetch = mock.fn(async () => {
      throw genericError;
    }) as any;

    try {
      await fetchWithProviderTimeout('https://example.com');
      assert.fail('Should have thrown an error');
    } catch (error) {
      assert.strictEqual(error, genericError);
    }
  });
});

describe('sanitizeProviderErrorMessage', () => {
  test('redacts Bearer tokens', () => {
    assert.strictEqual(
      sanitizeProviderErrorMessage('Invalid token: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIi...'),
      'Invalid token: Bearer [redacted]'
    );
  });

  test('redacts Token tokens', () => {
    assert.strictEqual(
      sanitizeProviderErrorMessage('Authorization failed. Token abcdef1234567890'),
      'Authorization failed. Token [redacted]'
    );
  });

  test('redacts Authorization headers', () => {
    assert.strictEqual(
      sanitizeProviderErrorMessage('Headers: Authorization: Basic QWxhZGRpbjpvcGVuIHNlc2FtZQ=='),
      'Headers: Authorization: [redacted]'
    );
    assert.strictEqual(
      sanitizeProviderErrorMessage('Request failed: Authorization: Bearer some-secret-token'),
      'Request failed: Authorization: [redacted]'
    );
  });

  test('redacts query parameters (api_key, token, access_token)', () => {
    assert.strictEqual(
      sanitizeProviderErrorMessage('URL: https://api.example.com/v1/data?api_key=secret-key-123 & other=1'),
      'URL: https://api.example.com/v1/data?api_key=[redacted] & other=1'
    );
    assert.strictEqual(
      sanitizeProviderErrorMessage('Error at /endpoint?token=abc-123&foo=bar'),
      'Error at /endpoint?token=[redacted]&foo=bar'
    );
    assert.strictEqual(
      sanitizeProviderErrorMessage('Failed fetching ?access_token=super_secret_token_val'),
      'Failed fetching ?access_token=[redacted]'
    );
  });

  test('redacts secrets, passwords in key=value formats', () => {
    assert.strictEqual(
      sanitizeProviderErrorMessage('Database connection failed: password=supersecretpassword123'),
      'Database connection failed: password=[redacted]'
    );
    assert.strictEqual(
      sanitizeProviderErrorMessage('Error: secret: my-secret-value-12345'),
      'Error: secret=[redacted]'
    );
  });

  test('redacts OpenAI-like keys (sk-...)', () => {
    assert.strictEqual(
      sanitizeProviderErrorMessage('Provider error: Invalid API key sk-ant-api03-abcdef1234567890abcdef1234567890'),
      'Provider error: Invalid API key sk-[redacted]'
    );
  });

  test('redacts long generic tokens (48+ characters)', () => {
    assert.strictEqual(
      sanitizeProviderErrorMessage('Generic error. Token: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6A1B2C3D4E5F6'),
      'Generic error. Token=[redacted]'
    );
    assert.strictEqual(
      sanitizeProviderErrorMessage('Some error a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6A1B2C3D4E5F6'),
      'Some error [redacted]'
    );
  });

  test('truncates the message to 240 characters', () => {
    const longMessage = 'A '.repeat(150); // 300 characters, no continuous block of 48+ chars
    const sanitized = sanitizeProviderErrorMessage(longMessage);
    assert.strictEqual(sanitized.length, 240);
    assert.strictEqual(sanitized, longMessage.slice(0, 240));
  });
});
