import { test, describe, afterEach, beforeEach } from 'node:test';
import assert from 'node:assert';
import { createDenteApiApp } from '../server.js';
import type { FastifyInstance } from 'fastify';
import { buildVisitDraftFromTranscript } from '../ai/visitDraft.js';

const TEST_SECRET = 'test-secret-value';

/**
 * Маршруты /api/ai раньше определяли организацию через
 * getDefaultOrganizationId() — «первая строка таблицы organizations», поэтому
 * запрос вообще без контекста арендатора всё равно получал какую-то клинику.
 * Теперь организация приходит из подписанного токена, и тестам нужен явный
 * контекст. Схема та же, что в tests/routes/clinical.test.ts: заголовок
 * x-organization-id принимается только при DENTE_DEV_ALLOW_HEADER_ORG=1 и вне
 * production.
 */
const TEST_ORG_ID = '00000000-0000-0000-0000-000000000001';
const ORG_HEADERS = { 'x-organization-id': TEST_ORG_ID };

describe('AI Routes', () => {
  const originalReadsAllowed = process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS;
  const originalSecret = process.env.DENTE_CLINICAL_ADMIN_SECRET;
  const originalHeaderOrg = process.env.DENTE_DEV_ALLOW_HEADER_ORG;
  let app: FastifyInstance | null = null;

  afterEach(async () => {
    if (originalHeaderOrg !== undefined) {
      process.env.DENTE_DEV_ALLOW_HEADER_ORG = originalHeaderOrg;
    } else {
      delete process.env.DENTE_DEV_ALLOW_HEADER_ORG;
    }
    if (originalReadsAllowed !== undefined) {
      process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = originalReadsAllowed;
    } else {
      delete process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS;
    }

    if (originalSecret !== undefined) {
      process.env.DENTE_CLINICAL_ADMIN_SECRET = originalSecret;
    } else {
      delete process.env.DENTE_CLINICAL_ADMIN_SECRET;
    }

    if (app) {
      await app.close();
      app = null;
    }
  });

  test('POST /api/ai/visit-note-draft returns 400 on validation error', async () => {
    // Bypass requireClinicalReadAccess guard by allowing unguarded reads
    process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = '1';
    process.env.DENTE_DEV_ALLOW_HEADER_ORG = '1';
    delete process.env.DENTE_CLINICAL_ADMIN_SECRET;

    app = await createDenteApiApp({ startTelegramWorker: false });

    const response = await app.inject({
      method: 'POST',
      url: '/api/ai/visit-note-draft',
      headers: ORG_HEADERS,
      payload: {
        // Missing required fields 'transcript' and 'specialty'
      }
    });

    assert.strictEqual(response.statusCode, 400);
    const json = response.json();
    assert.strictEqual(json.error, 'VisitNoteDraftValidationError');
  });
});

describe('AI Routes Integration', () => {
  let integrationApp: Awaited<ReturnType<typeof createDenteApiApp>>;

  beforeEach(async () => {
    process.env.DENTE_CLINICAL_ADMIN_SECRET = TEST_SECRET;
    process.env.DENTE_DEV_ALLOW_HEADER_ORG = '1';
    integrationApp = await createDenteApiApp({ startTelegramWorker: false });
  });

  afterEach(async () => {
    await integrationApp.close();
    delete process.env.DENTE_CLINICAL_ADMIN_SECRET;
    delete process.env.DENTE_DEV_ALLOW_HEADER_ORG;
  });

  describe('POST /api/ai/visit-note-draft', () => {
    test('handles missing patient (404)', async () => {
      const response = await integrationApp.inject({
        method: 'POST',
        url: '/api/ai/visit-note-draft',
        headers: {
          'x-dente-admin-secret': TEST_SECRET,
          ...ORG_HEADERS,
        },
        payload: {
          patientId: '11111111-1111-4111-8111-111111111111',
          transcript: 'Жалобы на боль при накусывании.',
          specialty: 'therapist',
          source: 'voice',
        },
      });

      assert.strictEqual(response.statusCode, 404);

      const body = response.json();
      assert.strictEqual(body.error, 'VisitNoteDraftScopeError');
      assert.strictEqual(body.message, 'Пациент не найден. Выберите пациента из актуальной карты.');
    });
  });
});

describe('buildVisitDraftFromTranscript', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test('falls back to rule-based parser on AI JSON parsing error', async () => {
    process.env.DENTAL_AI_NEURAL_DRAFT = 'true';
    process.env.DENTAL_SPEECH_POLISH_PROVIDER = 'custom';
    process.env.DENTAL_SPEECH_POLISH_BASE_URL = 'http://localhost:9999';
    process.env.DENTAL_SPEECH_POLISH_API_KEY = 'fake';
    process.env.DENTAL_SPEECH_POLISH_MODEL = 'test-model';

    const originalFetch = global.fetch;
    global.fetch = async () => {
      return new Response('{ malformed: json', {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    try {
      const result = await buildVisitDraftFromTranscript('Пациент жалуется на боль в 36 зубе.', 'universal');
      const hasWarning = result.warnings.some(w => w.includes('ИИ-генерация черновика не выполнена, применен локальный разбор'));
      assert.strictEqual(hasWarning, true, 'Expected fallback warning to be present');
    } finally {
      global.fetch = originalFetch;
    }
  });
});
