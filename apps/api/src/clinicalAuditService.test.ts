import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import {
  writeClinicalAuditLog,
  auditFromRequest,
  assertTenantMatch,
  ClinicalAuditInput
} from './clinicalAuditService.js';
import { db } from './db/client.js';

describe('clinicalAuditService', () => {
  let mockConsoleError: any;

  beforeEach((t) => {
    // Mock console.error
    mockConsoleError = t.mock.method(console, 'error', () => {});
  });

  afterEach((t) => {
    t.mock.restoreAll();
  });

  describe('writeClinicalAuditLog', () => {
    test('successfully writes an audit log', async (t) => {
      const input: ClinicalAuditInput = {
        organizationId: 'org-123',
        userId: 'user-123',
        patientId: 'patient-123',
        action: 'VIEW_PATIENT',
        entityType: 'patient',
        entityId: 'patient-123',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent'
      };

      const mockValues = t.mock.fn(async () => {});
      t.mock.method(db, 'insert', () => ({
        values: mockValues
      }));

      await writeClinicalAuditLog(input);

      assert.strictEqual(mockValues.mock.callCount(), 1);
      assert.deepStrictEqual(mockValues.mock.calls[0].arguments[0], {
        organizationId: 'org-123',
        userId: 'user-123',
        patientId: 'patient-123',
        action: 'VIEW_PATIENT',
        entityType: 'patient',
        entityId: 'patient-123',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent'
      });
      assert.strictEqual(mockConsoleError.mock.callCount(), 0);
    });

    test('replaces undefined fields with null', async (t) => {
      const input: ClinicalAuditInput = {
        organizationId: 'org-123',
        action: 'VIEW_PATIENT',
        entityType: 'patient',
        entityId: 'patient-123'
      };

      const mockValues = t.mock.fn(async () => {});
      t.mock.method(db, 'insert', () => ({
        values: mockValues
      }));

      await writeClinicalAuditLog(input);

      assert.strictEqual(mockValues.mock.callCount(), 1);
      assert.deepStrictEqual(mockValues.mock.calls[0].arguments[0], {
        organizationId: 'org-123',
        userId: null,
        patientId: null,
        action: 'VIEW_PATIENT',
        entityType: 'patient',
        entityId: 'patient-123',
        ipAddress: null,
        userAgent: null
      });
    });

    test('catches and logs errors without throwing (fire-and-forget)', async (t) => {
      const input: ClinicalAuditInput = {
        organizationId: 'org-123',
        action: 'VIEW_PATIENT',
        entityType: 'patient',
        entityId: 'patient-123'
      };

      const error = new Error('Database insertion failed');
      const mockValues = t.mock.fn(async () => {
        throw error;
      });
      t.mock.method(db, 'insert', () => ({
        values: mockValues
      }));

      // Should not throw
      await writeClinicalAuditLog(input);

      assert.strictEqual(mockValues.mock.callCount(), 1);
      assert.strictEqual(mockConsoleError.mock.callCount(), 1);
      assert.strictEqual(mockConsoleError.mock.calls[0].arguments[0], '[ClinicalAudit] Failed to write audit log:');
      assert.strictEqual(mockConsoleError.mock.calls[0].arguments[1], error);
    });
  });

  describe('auditFromRequest', () => {
    test('extracts IP from x-forwarded-for header', async (t) => {
      const request = {
        headers: {
          'x-forwarded-for': '192.168.1.1, 10.0.0.1',
          'user-agent': 'browser'
        },
        ip: '127.0.0.1'
      } as any;

      const payload = {
        organizationId: 'org-123',
        action: 'VIEW_PATIENT' as const,
        entityType: 'patient',
        entityId: 'patient-123'
      };

      const mockValues = t.mock.fn(async () => {});
      t.mock.method(db, 'insert', () => ({
        values: mockValues
      }));

      await auditFromRequest(request, payload);

      assert.strictEqual(mockValues.mock.callCount(), 1);
      assert.strictEqual(mockValues.mock.calls[0].arguments[0].ipAddress, '192.168.1.1');
      assert.strictEqual(mockValues.mock.calls[0].arguments[0].userAgent, 'browser');
    });

    test('extracts IP from request.ip if x-forwarded-for is missing', async (t) => {
      const request = {
        headers: {
          'user-agent': 'browser'
        },
        ip: '127.0.0.1'
      } as any;

      const payload = {
        organizationId: 'org-123',
        action: 'VIEW_PATIENT' as const,
        entityType: 'patient',
        entityId: 'patient-123'
      };

      const mockValues = t.mock.fn(async () => {});
      t.mock.method(db, 'insert', () => ({
        values: mockValues
      }));

      await auditFromRequest(request, payload);

      assert.strictEqual(mockValues.mock.callCount(), 1);
      assert.strictEqual(mockValues.mock.calls[0].arguments[0].ipAddress, '127.0.0.1');
    });
  });

  describe('assertTenantMatch', () => {
    test('returns true when organization IDs match', () => {
      assert.strictEqual(assertTenantMatch('org-1', 'org-1'), true);
    });

    test('returns false when organization IDs mismatch', () => {
      assert.strictEqual(assertTenantMatch('org-1', 'org-2'), false);
    });
  });
});
