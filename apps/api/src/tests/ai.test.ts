import { test, describe, afterEach, beforeEach } from 'node:test';
import assert from 'node:assert';
import { createDenteApiApp } from '../server.js';
import type { FastifyInstance } from 'fastify';

describe('AI Routes', () => {
  const originalReadsAllowed = process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS;
  const originalSecret = process.env.DENTE_CLINICAL_ADMIN_SECRET;
  let app: FastifyInstance | null = null;

  afterEach(async () => {
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
    delete process.env.DENTE_CLINICAL_ADMIN_SECRET;

    app = await createDenteApiApp({ startTelegramWorker: false });

    const response = await app.inject({
      method: 'POST',
      url: '/api/ai/visit-note-draft',
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
    process.env.DENTE_CLINICAL_ADMIN_SECRET = 'test-secret';
    integrationApp = await createDenteApiApp({ startTelegramWorker: false });
  });

  afterEach(async () => {
    await integrationApp.close();
    delete process.env.DENTE_CLINICAL_ADMIN_SECRET;
  });

  describe('POST /api/ai/visit-note-draft', () => {
    test('handles missing patient (404)', async () => {
      const response = await integrationApp.inject({
        method: 'POST',
        url: '/api/ai/visit-note-draft',
        headers: {
          'x-dente-admin-secret': 'test-secret',
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
