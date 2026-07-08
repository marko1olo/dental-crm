import { test, describe, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert';
import { startRecallWorker, processOverdueRecalls, createRecallTask, buildPatientMessage } from '../recallWorker.js';
import { db } from '../../db/client.js';

describe('recallWorker', () => {
  beforeEach(() => {
    mock.timers.enable({ apis: ['setInterval'] });
  });

  afterEach(() => {
    mock.timers.reset();
    mock.restoreAll();
  });

  describe('startRecallWorker', () => {
    test('should call processOverdueRecalls immediately and setup interval', async (t) => {
      const dbSelectMock = t.mock.method(db, 'select', () => ({
        from: () => ({
          where: async () => []
        })
      }));

      const timeout = startRecallWorker();
      await new Promise(resolve => setImmediate(resolve));
      assert.strictEqual(dbSelectMock.mock.calls.length, 1);

      mock.timers.tick(1000 * 60 * 15);
      await new Promise(resolve => setImmediate(resolve));
      assert.strictEqual(dbSelectMock.mock.calls.length, 2);

      clearInterval(timeout);
    });
  });

  describe('buildPatientMessage', () => {
    test('should build correct message for upper jaw', () => {
      const msg = buildPatientMessage('Иван Иванов', 'верхней челюсти');
      assert.ok(msg.includes('Уважаемый(ая) Иван Иванов!'));
      assert.ok(msg.includes('верхней челюсти'));
    });

    test('should build correct message for lower jaw', () => {
      const msg = buildPatientMessage('Анна', 'нижней челюсти');
      assert.ok(msg.includes('Уважаемый(ая) Анна!'));
      assert.ok(msg.includes('нижней челюсти'));
    });
  });

  describe('processOverdueRecalls', () => {
    test('should do nothing if no overdue records', async (t) => {
      const dbSelectMock = t.mock.method(db, 'select', () => ({
        from: () => ({
          where: async () => []
        })
      }));

      await processOverdueRecalls();
      assert.strictEqual(dbSelectMock.mock.calls.length, 1);
    });

    test('should create recall tasks for overdue records', async (t) => {
      const overdue = [{
        reservationId: 'res-1',
        patientId: 'pat-1',
        organizationId: 'org-1',
        jawLocation: 'upper',
        recallDueAt: new Date()
      }];

      let selectCallCount = 0;
      const dbSelectMock = t.mock.method(db, 'select', () => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: () => ({
              where: async () => overdue
            })
          };
        } else {
          return {
            from: () => ({
              where: () => ({
                limit: async () => [{ fullName: 'Test Patient' }]
              })
            })
          };
        }
      });

      const dbInsertMock = t.mock.method(db, 'insert', () => ({
        values: async () => {}
      }));

      const dbUpdateMock = t.mock.method(db, 'update', () => ({
        set: () => ({
          where: async () => {}
        })
      }));

      await processOverdueRecalls();

      assert.strictEqual(dbSelectMock.mock.calls.length, 2);
      assert.strictEqual(dbInsertMock.mock.calls.length, 1);
      assert.strictEqual(dbUpdateMock.mock.calls.length, 1);
    });
  });

  describe('createRecallTask', () => {
    test('should handle missing patient name gracefully', async (t) => {
      const candidate = {
        reservationId: 'res-1',
        patientId: 'pat-1',
        organizationId: 'org-1',
        jawLocation: 'upper',
        recallDueAt: new Date()
      };

      const dbSelectMock = t.mock.method(db, 'select', () => ({
        from: () => ({
          where: () => ({
            limit: async () => [] // Missing patient
          })
        })
      }));

      const dbInsertMock = t.mock.method(db, 'insert', () => ({
        values: async (vals: any) => {
          assert.ok(vals.title.includes('Пациент'));
        }
      }));

      const dbUpdateMock = t.mock.method(db, 'update', () => ({
        set: () => ({
          where: async () => {}
        })
      }));

      await createRecallTask(candidate, new Date());

      assert.strictEqual(dbSelectMock.mock.calls.length, 1);
      assert.strictEqual(dbInsertMock.mock.calls.length, 1);
      assert.strictEqual(dbUpdateMock.mock.calls.length, 1);
    });

    test('should log error on failure', async (t) => {
      const candidate = {
        reservationId: 'res-1',
        patientId: 'pat-1',
        organizationId: 'org-1',
        jawLocation: 'upper',
        recallDueAt: new Date()
      };

      const consoleErrorMock = t.mock.method(console, 'error', () => {});

      t.mock.method(db, 'select', () => ({
        from: () => ({
          where: () => ({
            limit: async () => { throw new Error('DB Error'); }
          })
        })
      }));

      await createRecallTask(candidate, new Date());

      assert.strictEqual(consoleErrorMock.mock.calls.length, 1);
      assert.ok(consoleErrorMock.mock.calls[0].arguments[0].includes('Failed for res-1'));
    });
  });
});
