import { describe, test, afterEach, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { buildPersistentStateExport } from '../persistentState.js';

describe('buildPersistentStateExport', () => {
  let tempDir: string;
  let originalStateFileEnv: string | undefined;
  let originalPersistenceEnv: string | undefined;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dental-state-test-'));
    originalStateFileEnv = process.env.DENTAL_STATE_FILE;
    originalPersistenceEnv = process.env.DENTAL_STATE_PERSISTENCE;

    process.env.DENTAL_STATE_FILE = path.join(tempDir, 'state.json');
    process.env.DENTAL_STATE_PERSISTENCE = 'on'; // enable persistence so getPersistentStateMeta enabled is true
  });

  afterEach(() => {
    mock.restoreAll();
    fs.rmSync(tempDir, { recursive: true, force: true });

    // Clean up env vars correctly based on memory guidance
    if (originalStateFileEnv !== undefined) {
      process.env.DENTAL_STATE_FILE = originalStateFileEnv;
    } else {
      delete process.env.DENTAL_STATE_FILE;
    }

    if (originalPersistenceEnv !== undefined) {
      process.env.DENTAL_STATE_PERSISTENCE = originalPersistenceEnv;
    } else {
      delete process.env.DENTAL_STATE_PERSISTENCE;
    }
  });

  test('happy path - builds export with valid state file', () => {
    const stateFilePath = process.env.DENTAL_STATE_FILE as string;
    const mockState = { someData: 123 };
    const version = 1;
    const payloadCore = {
      version,
      savedAt: new Date().toISOString(),
      state: mockState
    };

    const checksum = crypto.createHash("sha256").update(JSON.stringify(payloadCore)).digest("hex");

    const payload = {
      ...payloadCore,
      checksum
    };

    fs.writeFileSync(stateFilePath, JSON.stringify(payload));

    const result = buildPersistentStateExport();

    assert.strictEqual(result.exportKind, "dental-crm-prototype-state");
    assert.strictEqual(result.exportVersion, 1);
    assert.strictEqual(result.error, null);
    assert.deepStrictEqual(result.payload, payload);
    assert.ok(result.exportedAt);
    assert.ok(result.integrity);
    assert.strictEqual(result.integrity.ok, true);
    assert.strictEqual(result.integrity.meta.exists, true);
  });

  test('error path - file missing', () => {
    // We intentionally do not create the file

    const result = buildPersistentStateExport();

    assert.strictEqual(result.exportKind, "dental-crm-prototype-state");
    assert.strictEqual(result.exportVersion, 1);
    assert.strictEqual(result.payload, null);
    assert.strictEqual(
      result.error,
      "Файл состояния еще не создан; выполните рабочее изменение и повторите проверку резервной копии." // persistenceWarningText("state_file_missing")
    );
    assert.ok(result.integrity);
    assert.strictEqual(result.integrity.ok, false);
    assert.strictEqual(result.integrity.meta.exists, false);
    assert.strictEqual(result.integrity.warnings.length > 0, true);
  });

  test('error path - invalid JSON', () => {
    const stateFilePath = process.env.DENTAL_STATE_FILE as string;
    mock.method(console, 'warn', () => {}); // Suppress expected warning from readPersistedState called via meta

    // Write invalid JSON
    fs.writeFileSync(stateFilePath, "{ invalid_json: true");

    const result = buildPersistentStateExport();

    assert.strictEqual(result.exportKind, "dental-crm-prototype-state");
    assert.strictEqual(result.exportVersion, 1);
    assert.strictEqual(result.payload, null);
    assert.strictEqual(
      result.error,
      "Файл состояния не читается; используйте последнюю читаемую резервную копию и проверьте права сервера." // persistenceWarningText("state_file_unreadable")
    );
    assert.ok(result.integrity);
    assert.strictEqual(result.integrity.ok, false);
    assert.strictEqual(result.integrity.meta.exists, true); // file exists
    assert.strictEqual(result.integrity.warnings.length > 0, true);
  });
});
