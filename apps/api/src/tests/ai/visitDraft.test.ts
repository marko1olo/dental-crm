import { test, describe, afterEach, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import { buildVisitDraftFromTranscript } from '../../ai/visitDraft.js';

describe('buildVisitDraftFromTranscript AI Errors', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    mock.restoreAll();
  });

  test('falls back to rule-based parser when AI returns empty/non-string content', async () => {
    process.env.DENTAL_AI_NEURAL_DRAFT = '1';
    process.env.DENTAL_SPEECH_POLISH_PROVIDER = 'custom';
    process.env.DENTAL_SPEECH_POLISH_BASE_URL = 'http://localhost:9999/dummy';
    process.env.DENTAL_SPEECH_POLISH_API_KEY = 'test-key';
    process.env.DENTAL_SPEECH_POLISH_MODEL = 'test-model';

    mock.method(globalThis, 'fetch', async () => {
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: null } }]
        })
      } as any;
    });

    const transcript = 'Жалобы пациента на острую боль в области 36 зуба.';
    const result = await buildVisitDraftFromTranscript(transcript, 'universal');

    assert.ok(result.warnings);
    assert.ok(result.warnings.some(w => w.includes('ИИ-генерация черновика не выполнена')));
    assert.strictEqual(result.complaint, 'пациента на острую боль в области 36 зуба');
  });

  test('falls back to rule-based parser when AI returns invalid JSON', async () => {
    process.env.DENTAL_AI_NEURAL_DRAFT = '1';
    process.env.DENTAL_SPEECH_POLISH_PROVIDER = 'custom';
    process.env.DENTAL_SPEECH_POLISH_BASE_URL = 'http://localhost:9999/dummy';
    process.env.DENTAL_SPEECH_POLISH_API_KEY = 'test-key';
    process.env.DENTAL_SPEECH_POLISH_MODEL = 'test-model';

    mock.method(globalThis, 'fetch', async () => {
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "This is not JSON" } }]
        })
      } as any;
    });

    const transcript = 'Жалобы пациента на острую боль в области 36 зуба.';
    const result = await buildVisitDraftFromTranscript(transcript, 'universal');

    assert.ok(result.warnings);
    assert.ok(result.warnings.some(w => w.includes('ИИ-генерация черновика не выполнена')));
    assert.strictEqual(result.complaint, 'пациента на острую боль в области 36 зуба');
  });

  test('falls back to rule-based parser on fetch network error', async () => {
    process.env.DENTAL_AI_NEURAL_DRAFT = '1';
    process.env.DENTAL_SPEECH_POLISH_PROVIDER = 'custom';
    process.env.DENTAL_SPEECH_POLISH_BASE_URL = 'http://localhost:9999/dummy';
    process.env.DENTAL_SPEECH_POLISH_API_KEY = 'test-key';
    process.env.DENTAL_SPEECH_POLISH_MODEL = 'test-model';

    mock.method(globalThis, 'fetch', async () => {
      throw new Error('fetch failed');
    });

    const transcript = 'Жалобы пациента на острую боль в области 36 зуба.';
    const result = await buildVisitDraftFromTranscript(transcript, 'universal');

    assert.ok(result.warnings);
    assert.ok(result.warnings.some(w => w.includes('ИИ-генерация черновика не выполнена')));
    assert.strictEqual(result.complaint, 'пациента на острую боль в области 36 зуба');
  });
});
