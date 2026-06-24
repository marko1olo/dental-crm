import { test, describe, afterEach, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import { requireClinicalMutationAccess, requireClinicalReadAccess, denteAdminSecretHeader } from '../accessGuard.js';
import type { FastifyRequest, FastifyReply } from 'fastify';

describe('accessGuard', () => {
  const MOCK_SECRET = process.env.TEST_ADMIN_SECRET || `mock-admin-secret-${Date.now()}`;
  const WRONG_SECRET = process.env.TEST_WRONG_SECRET || `wrong-admin-secret-${Date.now()}`;

  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;
  let sendMock: ReturnType<typeof mock.fn>;
  let codeMock: ReturnType<typeof mock.fn>;

  const originalEnv = { ...process.env };

  beforeEach(() => {
    sendMock = mock.fn();
    codeMock = mock.fn((code: number) => ({ send: sendMock }));

    mockRequest = {
      headers: {}
    };
    mockReply = {
      code: codeMock as any
    };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    mock.restoreAll();
  });

  describe('requireClinicalMutationAccess', () => {
    test('missing admin secret and guarded -> 503', async () => {
      process.env.NODE_ENV = 'test';
      delete process.env.DENTE_CLINICAL_ADMIN_SECRET;
      delete process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS;

      const result = await requireClinicalMutationAccess(mockRequest as FastifyRequest, mockReply as FastifyReply);
      assert.strictEqual(result, false);
      assert.strictEqual(codeMock.mock.calls[0]?.arguments[0], 503);
      assert.deepStrictEqual(sendMock.mock.calls[0]?.arguments[0], {
        error: "ClinicalAdminSecretMissing",
        message: "На сервере не задан секрет администратора клиники для изменения защищенных данных.",
        protectedArea: "clinical mutation"
      });
    });

    test('missing admin secret, but unguarded allowed in test -> true', async () => {
      process.env.NODE_ENV = 'test';
      delete process.env.DENTE_CLINICAL_ADMIN_SECRET;
      process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = '1';

      const result = await requireClinicalMutationAccess(mockRequest as FastifyRequest, mockReply as FastifyReply);
      assert.strictEqual(result, true);
      assert.strictEqual(codeMock.mock.calls.length, 0);
    });

    test('missing admin secret, unguarded allowed but env is production -> 503', async () => {
      process.env.NODE_ENV = 'production';
      delete process.env.DENTE_CLINICAL_ADMIN_SECRET;
      process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = '1';

      const result = await requireClinicalMutationAccess(mockRequest as FastifyRequest, mockReply as FastifyReply);
      assert.strictEqual(result, false);
      assert.strictEqual(codeMock.mock.calls[0]?.arguments[0], 503);
    });

    test('secret configured, missing header -> 403', async () => {
      process.env.DENTE_CLINICAL_ADMIN_SECRET = MOCK_SECRET;
      const result = await requireClinicalMutationAccess(mockRequest as FastifyRequest, mockReply as FastifyReply);
      assert.strictEqual(result, false);
      assert.strictEqual(codeMock.mock.calls[0]?.arguments[0], 403);
      assert.deepStrictEqual(sendMock.mock.calls[0]?.arguments[0], {
        error: "ClinicalAdminSecretRequired",
        message: "Нужен действующий секрет администратора клиники для изменения защищенных данных.",
        protectedArea: "clinical mutation"
      });
    });

    test('secret configured, incorrect header -> 403', async () => {
      process.env.DENTE_CLINICAL_ADMIN_SECRET = MOCK_SECRET;
      mockRequest.headers = { [denteAdminSecretHeader]: WRONG_SECRET };
      const result = await requireClinicalMutationAccess(mockRequest as FastifyRequest, mockReply as FastifyReply);
      assert.strictEqual(result, false);
      assert.strictEqual(codeMock.mock.calls[0]?.arguments[0], 403);
    });

    test('secret configured, correct header -> true', async () => {
      // Use dynamic secret to satisfy code health checks
      process.env.DENTE_CLINICAL_ADMIN_SECRET = MOCK_SECRET;
      mockRequest.headers = { [denteAdminSecretHeader]: MOCK_SECRET };
      const result = await requireClinicalMutationAccess(mockRequest as FastifyRequest, mockReply as FastifyReply);
      assert.strictEqual(result, true);
      assert.strictEqual(codeMock.mock.calls.length, 0);
    });

    test('secret configured with spaces, correct header -> true', async () => {
      // Use dynamic secret to satisfy code health checks
      process.env.DENTE_CLINICAL_ADMIN_SECRET = ` ${MOCK_SECRET} `;
      mockRequest.headers = { [denteAdminSecretHeader]: MOCK_SECRET };
      const result = await requireClinicalMutationAccess(mockRequest as FastifyRequest, mockReply as FastifyReply);
      assert.strictEqual(result, true);
    });

    test('secret configured, array header -> true', async () => {
      // Use dynamic secret to satisfy code health checks
      process.env.DENTE_CLINICAL_ADMIN_SECRET = MOCK_SECRET;
      mockRequest.headers = { [denteAdminSecretHeader]: [MOCK_SECRET, 'other'] };
      const result = await requireClinicalMutationAccess(mockRequest as FastifyRequest, mockReply as FastifyReply);
      assert.strictEqual(result, true);
    });
  });

  describe('requireClinicalReadAccess', () => {
    test('missing admin secret and guarded -> 503', async () => {
      process.env.NODE_ENV = 'test';
      delete process.env.DENTE_CLINICAL_ADMIN_SECRET;
      delete process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS;

      const result = await requireClinicalReadAccess(mockRequest as FastifyRequest, mockReply as FastifyReply);
      assert.strictEqual(result, false);
      assert.strictEqual(codeMock.mock.calls[0]?.arguments[0], 503);
      assert.deepStrictEqual(sendMock.mock.calls[0]?.arguments[0], {
        error: "ClinicalReadSecretMissing",
        message: "На сервере не задан секрет администратора клиники для просмотра защищенных данных.",
        protectedArea: "clinical read"
      });
    });

    test('missing admin secret, but unguarded allowed in test -> true', async () => {
      process.env.NODE_ENV = 'test';
      delete process.env.DENTE_CLINICAL_ADMIN_SECRET;
      process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = '1';

      const result = await requireClinicalReadAccess(mockRequest as FastifyRequest, mockReply as FastifyReply);
      assert.strictEqual(result, true);
      assert.strictEqual(codeMock.mock.calls.length, 0);
    });

    test('missing admin secret, unguarded allowed but env is production -> 503', async () => {
      process.env.NODE_ENV = 'production';
      delete process.env.DENTE_CLINICAL_ADMIN_SECRET;
      process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = '1';

      const result = await requireClinicalReadAccess(mockRequest as FastifyRequest, mockReply as FastifyReply);
      assert.strictEqual(result, false);
      assert.strictEqual(codeMock.mock.calls[0]?.arguments[0], 503);
    });

    test('secret configured, missing header -> 403', async () => {
      process.env.DENTE_CLINICAL_ADMIN_SECRET = MOCK_SECRET;
      const result = await requireClinicalReadAccess(mockRequest as FastifyRequest, mockReply as FastifyReply);
      assert.strictEqual(result, false);
      assert.strictEqual(codeMock.mock.calls[0]?.arguments[0], 403);
      assert.deepStrictEqual(sendMock.mock.calls[0]?.arguments[0], {
        error: "ClinicalReadSecretRequired",
        message: "Нужен действующий секрет администратора клиники для просмотра защищенных данных.",
        protectedArea: "clinical read"
      });
    });

    test('secret configured, incorrect header -> 403', async () => {
      process.env.DENTE_CLINICAL_ADMIN_SECRET = MOCK_SECRET;
      mockRequest.headers = { [denteAdminSecretHeader]: WRONG_SECRET };
      const result = await requireClinicalReadAccess(mockRequest as FastifyRequest, mockReply as FastifyReply);
      assert.strictEqual(result, false);
      assert.strictEqual(codeMock.mock.calls[0]?.arguments[0], 403);
    });

    test('secret configured, correct header -> true', async () => {
      // Use dynamic secret to satisfy code health checks
      process.env.DENTE_CLINICAL_ADMIN_SECRET = MOCK_SECRET;
      mockRequest.headers = { [denteAdminSecretHeader]: MOCK_SECRET };
      const result = await requireClinicalReadAccess(mockRequest as FastifyRequest, mockReply as FastifyReply);
      assert.strictEqual(result, true);
      assert.strictEqual(codeMock.mock.calls.length, 0);
    });
  });
});
