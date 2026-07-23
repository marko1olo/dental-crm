import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { db } from './db/client.js';
import { recordAuditEvent } from './audit.js';

describe('recordAuditEvent', () => {
  beforeEach(() => {
    // node:test mock reset isn't strictly necessary per-test if we use t.mock
  });

  test('inserts audit event with provided organizationId', async (t) => {
    const valuesMock = t.mock.fn(async () => {});
    t.mock.method(db, 'insert', () => ({
      values: valuesMock
    }));

    // Also mock select just in case, though it shouldn't be called
    const selectMock = t.mock.method(db, 'select', () => ({}));

    await recordAuditEvent({
      organizationId: 'org-123  ', // also tests trim
      entityType: 'User',
      entityId: 'user-456',
      action: 'LOGIN',
      reason: 'Successful login'
    });

    assert.strictEqual(selectMock.mock.calls.length, 0);
    assert.strictEqual(valuesMock.mock.calls.length, 1);
    assert.deepStrictEqual(valuesMock.mock.calls[0].arguments[0], {
      organizationId: 'org-123',
      entityType: 'User',
      entityId: 'user-456',
      action: 'LOGIN',
      reason: 'Successful login'
    });
  });

  test('fetches first organization when organizationId is missing', async (t) => {
    const valuesMock = t.mock.fn(async () => {});
    t.mock.method(db, 'insert', () => ({
      values: valuesMock
    }));

    const limitMock = t.mock.fn(async () => [{ id: 'org-fallback' }]);
    t.mock.method(db, 'select', () => ({
      from: () => ({
        limit: limitMock
      })
    }));

    await recordAuditEvent({
      entityType: 'Post',
      entityId: 'post-1',
      action: 'CREATE'
    });

    assert.strictEqual(limitMock.mock.calls.length, 1);
    assert.strictEqual(valuesMock.mock.calls.length, 1);
    assert.deepStrictEqual(valuesMock.mock.calls[0].arguments[0], {
      organizationId: 'org-fallback',
      entityType: 'Post',
      entityId: 'post-1',
      action: 'CREATE',
      reason: undefined
    });
  });

  test('returns early without inserting if no organization is found', async (t) => {
    const valuesMock = t.mock.fn(async () => {});
    t.mock.method(db, 'insert', () => ({
      values: valuesMock
    }));

    const limitMock = t.mock.fn(async () => []); // Returns empty array
    t.mock.method(db, 'select', () => ({
      from: () => ({
        limit: limitMock
      })
    }));

    await recordAuditEvent({
      entityType: 'Comment',
      entityId: 'comment-1',
      action: 'DELETE'
    });

    assert.strictEqual(limitMock.mock.calls.length, 1);
    assert.strictEqual(valuesMock.mock.calls.length, 0);
  });
});
