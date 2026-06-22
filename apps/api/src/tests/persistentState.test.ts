import { test, describe, mock, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import { loadPersistentState } from '../persistentState.js';

describe('loadPersistentState', () => {
  const originalPersistenceEnv = process.env.DENTAL_STATE_PERSISTENCE;

  afterEach(() => {
    mock.restoreAll();
    if (originalPersistenceEnv !== undefined) {
      process.env.DENTAL_STATE_PERSISTENCE = originalPersistenceEnv;
    } else {
      delete process.env.DENTAL_STATE_PERSISTENCE;
    }
  });

  test('returns null when file system access throws an error', () => {
    mock.method(fs, 'existsSync', () => true);
    mock.method(fs, 'readFileSync', () => {
      throw new Error('EACCES: permission denied');
    });
    mock.method(console, 'warn', () => {}); // Suppress expected warning

    process.env.DENTAL_STATE_PERSISTENCE = 'on';

    const result = loadPersistentState();

    assert.strictEqual(result, null);
  });
});
