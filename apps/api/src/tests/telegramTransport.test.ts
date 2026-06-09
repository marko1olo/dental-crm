import { test, describe, mock, afterEach } from 'node:test';
import assert from 'node:assert';
import { sendTelegramTextMessage } from '../telegramTransport.js';

describe('sendTelegramTextMessage', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    mock.restoreAll();
  });

  const baseInput = {
    botToken: 'fake_bot_token',
    chatId: 'fake_chat_id',
    text: 'Hello, World!'
  };

  test('handles successful response', async () => {
    globalThis.fetch = mock.fn(async () => {
      return new Response(JSON.stringify({ result: { message_id: 12345 } }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    }) as any;

    const result = await sendTelegramTextMessage(baseInput);

    assert.deepStrictEqual(result, {
      ok: true,
      telegramMessageId: 12345,
      retryAfterSeconds: null,
      errorCode: null,
      errorClass: null
    });
  });

  test('handles rate limit error (429) with retry_after', async () => {
    globalThis.fetch = mock.fn(async () => {
      return new Response(JSON.stringify({ parameters: { retry_after: 42 } }), {
        status: 429,
        headers: { 'content-type': 'application/json' }
      });
    }) as any;

    const result = await sendTelegramTextMessage(baseInput);

    assert.deepStrictEqual(result, {
      ok: false,
      telegramMessageId: null,
      retryAfterSeconds: 42,
      errorCode: 429,
      errorClass: 'rate_limited'
    });
  });

  test('handles auth error (401)', async () => {
    globalThis.fetch = mock.fn(async () => {
      return new Response(JSON.stringify({}), {
        status: 401,
        headers: { 'content-type': 'application/json' }
      });
    }) as any;

    const result = await sendTelegramTextMessage(baseInput);

    assert.deepStrictEqual(result, {
      ok: false,
      telegramMessageId: null,
      retryAfterSeconds: null,
      errorCode: 401,
      errorClass: 'auth'
    });
  });

  test('handles timeout error (AbortError)', async () => {
    globalThis.fetch = mock.fn(async () => {
      const error = new DOMException('The operation was aborted', 'AbortError');
      throw error;
    }) as any;

    const result = await sendTelegramTextMessage(baseInput);

    assert.deepStrictEqual(result, {
      ok: false,
      telegramMessageId: null,
      retryAfterSeconds: null,
      errorCode: null,
      errorClass: 'timeout'
    });
  });

  test('handles generic network error', async () => {
    globalThis.fetch = mock.fn(async () => {
      throw new Error('Network failure');
    }) as any;

    const result = await sendTelegramTextMessage(baseInput);

    assert.deepStrictEqual(result, {
      ok: false,
      telegramMessageId: null,
      retryAfterSeconds: null,
      errorCode: null,
      errorClass: 'network'
    });
  });
});
