import { test, describe, mock, afterEach } from 'node:test';
import assert from 'node:assert';
import { fetchWithProviderTimeout, SpeechProviderRequestError } from '../speech/keyPool.js';

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
