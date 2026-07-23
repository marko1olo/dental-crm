import { test, describe } from 'node:test';
import assert from 'node:assert';
import { db } from '../db/client.js';
import * as workerModule from './notificationWorker.js';

describe('startNotificationWorker', () => {
  test('calls setInterval with correct timing and handles queue processing', async (t) => {
    let capturedCallback: Function | undefined;
    const setIntervalMock = t.mock.method(global, 'setInterval', (cb: Function) => {
      capturedCallback = cb;
      return 123;
    });

    const dbSelectMock = t.mock.method(db, 'select', () => {
      return {
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([])
          })
        })
      };
    });

    workerModule.startNotificationWorker();

    assert.strictEqual(setIntervalMock.mock.callCount(), 1);
    const args = setIntervalMock.mock.calls[0].arguments;
    assert.strictEqual(args[1], 10000);
    assert.strictEqual(typeof args[0], 'function');

    assert.ok(capturedCallback);
    await capturedCallback();

    assert.strictEqual(dbSelectMock.mock.callCount(), 1);
  });
});
