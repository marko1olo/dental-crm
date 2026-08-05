import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { db } from './db/client.js';
import type { auditEvents } from './db/schema.js';
import { recordAuditEvent } from './audit.js';

/**
 * Настоящий параметр db.insert(auditEvents).values() — строка вставки в
 * audit_events.
 *
 * Без него mock.fn(async () => {}) объявлял подменённую функцию вообще без
 * параметров, тип arguments выводился как пустой кортеж [], и обращение к
 * arguments[0] не компилировалось. Тип взят из самой таблицы, поэтому расходиться
 * со схемой он не может.
 */
type AuditEventInsert = typeof auditEvents.$inferInsert;

describe('recordAuditEvent', () => {
  beforeEach(() => {
    // node:test mock reset isn't strictly necessary per-test if we use t.mock
  });

  test('inserts audit event with provided organizationId', async (t) => {
    const valuesMock = t.mock.fn(async (_values: AuditEventInsert) => {});
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
    const insertCall = valuesMock.mock.calls[0];
    assert.ok(insertCall);
    assert.deepStrictEqual(insertCall.arguments[0], {
      organizationId: 'org-123',
      actorUserId: null,
      entityType: 'User',
      entityId: 'user-456',
      action: 'LOGIN',
      reason: 'Successful login'
    });
  });

  test('записывает автора события, когда вызывающий его передал', async (t) => {
    const valuesMock = t.mock.fn(async (_values: AuditEventInsert) => {});
    t.mock.method(db, 'insert', () => ({
      values: valuesMock
    }));
    t.mock.method(db, 'select', () => ({}));

    await recordAuditEvent({
      organizationId: 'org-123',
      actorUserId: 'user-789',
      entityType: 'document',
      entityId: 'doc-1',
      action: 'document_voided',
      reason: null
    });

    const insertCall = valuesMock.mock.calls[0];
    assert.ok(insertCall);
    assert.strictEqual(insertCall.arguments[0].actorUserId, 'user-789');
  });

  test('fetches first organization when organizationId is missing', async (t) => {
    const valuesMock = t.mock.fn(async (_values: AuditEventInsert) => {});
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
    const insertCall = valuesMock.mock.calls[0];
    assert.ok(insertCall);
    assert.deepStrictEqual(insertCall.arguments[0], {
      organizationId: 'org-fallback',
      actorUserId: null,
      entityType: 'Post',
      entityId: 'post-1',
      action: 'CREATE',
      reason: undefined
    });
  });

  /*
   * БЫЛО: тест назывался «returns early without inserting if no organization is
   * found» и утверждал, что при неопределённой клинике функция ТИХО возвращается,
   * не записав событие и не сообщив об этом никому. Он закреплял дефект как
   * контракт: операция с медданными или документом проходила, а следа в журнале
   * не оставалось — при этом вызывающий получал успех.
   *
   * СТАЛО: пустая клиника — это отказ. Пустой `orgId` при fail-closed RLS
   * (миграция 0157) означает «арендатор не установлен», а в таком контексте
   * INSERT в audit_events всё равно отвергается политикой (SQLSTATE 42501,
   * замерено 2026-08-06). Тихий возврат не спасал операцию — он прятал отказ.
   */
  test('при неопределённой клинике бросает ошибку, а не молчит', async (t) => {
    const valuesMock = t.mock.fn(async (_values: AuditEventInsert) => {});
    t.mock.method(db, 'insert', () => ({
      values: valuesMock
    }));

    const limitMock = t.mock.fn(async () => []); // Returns empty array
    t.mock.method(db, 'select', () => ({
      from: () => ({
        limit: limitMock
      })
    }));

    await assert.rejects(
      () =>
        recordAuditEvent({
          entityType: 'Comment',
          entityId: 'comment-1',
          action: 'DELETE'
        }),
      /клиника не определена/
    );

    assert.strictEqual(limitMock.mock.calls.length, 1);
    assert.strictEqual(valuesMock.mock.calls.length, 0);
  });

  test('отказ базы пробрасывается вызывающему, а не проглатывается', async (t) => {
    const failure = new Error('row violates row-level security policy');
    t.mock.method(db, 'insert', () => ({
      values: async () => {
        throw failure;
      }
    }));
    t.mock.method(db, 'select', () => ({}));

    await assert.rejects(
      () =>
        recordAuditEvent({
          organizationId: 'org-123',
          entityType: 'document',
          entityId: 'doc-1',
          action: 'document_issued'
        }),
      (error: unknown) => error === failure
    );
  });
});
