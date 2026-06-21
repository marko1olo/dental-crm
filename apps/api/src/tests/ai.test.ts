import { test, describe, afterEach, beforeEach } from 'node:test';
import assert from 'node:assert';
import { createDenteApiApp } from '../server.js';

describe('AI Routes Integration', () => {
  let app: Awaited<ReturnType<typeof createDenteApiApp>>;

  beforeEach(async () => {
    process.env.DENTE_CLINICAL_ADMIN_SECRET = 'test-secret';
    app = await createDenteApiApp({ startTelegramWorker: false });
  });

  afterEach(async () => {
    await app.close();
    delete process.env.DENTE_CLINICAL_ADMIN_SECRET;
  });

  describe('POST /api/ai/visit-note-draft', () => {
    test('handles missing patient (404)', async () => {
      const response = await app.inject({
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
