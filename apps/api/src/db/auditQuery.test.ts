import { test, describe, afterEach, mock } from 'node:test';
import assert from 'node:assert';
import { db } from './client.js';
import { recordAuditEventInDb } from './auditQuery.js';

describe('recordAuditEventInDb', () => {
  afterEach(() => {
    mock.restoreAll();
  });

  test('successfully inserts and returns an audit event with all fields', async () => {
    const mockDate = new Date('2024-01-01T00:00:00.000Z');
    mock.method(db, 'insert', () => ({
      values: () => ({
        returning: async () => [{
          id: 'test-id',
          organizationId: 'org-1',
          actorUserId: 'user-1',
          entityType: 'patient',
          entityId: 'patient-1',
          action: 'create',
          reason: 'test reason',
          createdAt: mockDate
        }]
      })
    }));

    const result = await recordAuditEventInDb('org-1', {
      entityType: 'patient',
      entityId: 'patient-1',
      action: 'create',
      reason: 'test reason',
      actorUserId: 'user-1'
    });

    assert.strictEqual(result.id, 'test-id');
    assert.strictEqual(result.organizationId, 'org-1');
    assert.strictEqual(result.actorUserId, 'user-1');
    assert.strictEqual(result.entityType, 'patient');
    assert.strictEqual(result.entityId, 'patient-1');
    assert.strictEqual(result.action, 'create');
    assert.strictEqual(result.reason, 'test reason');
    assert.strictEqual(result.createdAt, mockDate.toISOString());
  });

  test('successfully inserts with minimal required fields', async () => {
    const mockDate = new Date('2024-01-01T00:00:00.000Z');
    mock.method(db, 'insert', () => ({
      values: () => ({
        returning: async () => [{
          id: 'test-id-2',
          organizationId: 'org-2',
          actorUserId: null,
          entityType: 'document',
          entityId: 'doc-1',
          action: 'update',
          reason: null,
          createdAt: mockDate
        }]
      })
    }));

    const result = await recordAuditEventInDb('org-2', {
      entityType: 'document',
      entityId: 'doc-1',
      action: 'update'
    });

    assert.strictEqual(result.id, 'test-id-2');
    assert.strictEqual(result.organizationId, 'org-2');
    assert.strictEqual(result.actorUserId, null);
    assert.strictEqual(result.entityType, 'document');
    assert.strictEqual(result.entityId, 'doc-1');
    assert.strictEqual(result.action, 'update');
    assert.strictEqual(result.reason, null);
    assert.strictEqual(result.createdAt, mockDate.toISOString());
  });

  test('throws an error if insert returns empty array', async () => {
    mock.method(db, 'insert', () => ({
      values: () => ({
        returning: async () => []
      })
    }));

    await assert.rejects(
      async () => {
        await recordAuditEventInDb('org-1', {
          entityType: 'patient',
          entityId: 'patient-1',
          action: 'create'
        });
      },
      (err: Error) => {
        assert.strictEqual(err.message, 'Failed to insert audit event');
        return true;
      }
    );
  });
});
