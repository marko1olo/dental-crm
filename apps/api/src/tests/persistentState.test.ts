import { test, describe, mock, afterEach, beforeEach } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadPersistentState, buildPersistentStateExport } from '../persistentState.js';

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

describe('buildPersistentStateExport', () => {
  let tempDir: string;
  let originalEnv: Record<string, string | undefined>;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dental-state-test-'));
    originalEnv = { ...process.env };

    process.env.DENTAL_STATE_FILE = path.join(tempDir, 'state.json');
    process.env.DENTAL_STATE_BACKUP_DIR = path.join(tempDir, 'backups');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });

    // Restore environment avoiding direct assignment
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    }
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value !== undefined) {
        process.env[key] = value;
      } else {
        delete process.env[key];
      }
    }
  });

  test('returns happy path valid state export when state file is present and valid', () => {
    const mockPayload = { version: 1, state: { clinicProfile: { name: "Test" } } };
    fs.writeFileSync(process.env.DENTAL_STATE_FILE!, JSON.stringify(mockPayload));

    const result = buildPersistentStateExport();

    assert.strictEqual(result.exportKind, "dental-crm-prototype-state");
    assert.strictEqual(result.exportVersion, 1);
    assert.strictEqual(result.error, null);
    assert.ok(result.exportedAt);
    assert.ok(result.integrity);
    assert.deepStrictEqual(result.payload, mockPayload);
  });

  test('returns error when state file is missing', () => {
    const result = buildPersistentStateExport();

    assert.strictEqual(
      result.error,
      "Файл состояния еще не создан; выполните рабочее изменение и повторите проверку резервной копии."
    );
    assert.strictEqual(result.payload, null);
  });

  test('returns error when state file is unreadable (invalid JSON)', () => {
    fs.writeFileSync(process.env.DENTAL_STATE_FILE!, "{invalid json");

    const result = buildPersistentStateExport();

    assert.strictEqual(
      result.error,
      "Файл состояния не читается; используйте последнюю читаемую резервную копию и проверьте права сервера."
    );
    assert.strictEqual(result.payload, null);
  });
});
