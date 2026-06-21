import { test, describe, afterEach } from 'node:test';
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
