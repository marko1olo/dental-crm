import { test, describe, mock, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { loadPersistentState, getPersistentStateIntegrityReport } from '../persistentState.js';

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

describe('getPersistentStateIntegrityReport', () => {
  const originalEnv = { ...process.env };
  let tempDir: string;

  afterEach(() => {
    // Reset process.env without reassigning the object directly
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    }
    for (const key of Object.keys(originalEnv)) {
      if (originalEnv[key] !== undefined) {
        process.env[key] = originalEnv[key] as string;
      }
    }

    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  const setupTempEnv = () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dental-state-test-'));
    const stateFile = path.join(tempDir, 'state.json');
    const backupDir = path.join(tempDir, 'backups');
    fs.mkdirSync(backupDir);

    process.env.DENTAL_STATE_PERSISTENCE = 'on';
    process.env.DENTAL_STATE_FILE = stateFile;
    process.env.DENTAL_STATE_BACKUP_DIR = backupDir;

    return { stateFile, backupDir };
  };

  const createValidPayload = (stateData = {}) => {
    const core = { version: 1, savedAt: new Date().toISOString(), state: stateData };
    const checksum = createHash('sha256').update(JSON.stringify(core)).digest('hex');
    return { ...core, checksum };
  };

  test('reports missing file warning when state file does not exist', () => {
    setupTempEnv();
    const report = getPersistentStateIntegrityReport();

    assert.strictEqual(report.ok, false);
    assert.strictEqual(report.meta.exists, false);
    assert.strictEqual(report.checksumVerified, null);
    assert.ok(report.warnings.some(w => w.includes('Файл состояния еще не создан')));
  });

  test('returns ok report for valid state file with no backups', () => {
    const { stateFile } = setupTempEnv();
    const payload = createValidPayload();
    fs.writeFileSync(stateFile, JSON.stringify(payload), 'utf8');

    const report = getPersistentStateIntegrityReport();

    assert.strictEqual(report.ok, true);
    assert.strictEqual(report.meta.exists, true);
    assert.strictEqual(report.checksumVerified, true);
    assert.deepStrictEqual(report.warnings, []);
  });

  test('returns warning for state file checksum mismatch', () => {
    const { stateFile } = setupTempEnv();
    const payload = createValidPayload();
    payload.checksum = 'invalid-checksum';
    fs.writeFileSync(stateFile, JSON.stringify(payload), 'utf8');

    const report = getPersistentStateIntegrityReport();

    assert.strictEqual(report.ok, false);
    assert.strictEqual(report.checksumVerified, false);
    assert.ok(report.warnings.some(w => w.includes('Контрольная сумма файла состояния не совпала')));
  });

  test('returns warning when state file is unreadable (invalid json)', () => {
    const { stateFile } = setupTempEnv();
    fs.writeFileSync(stateFile, '{ invalid json', 'utf8');

    const report = getPersistentStateIntegrityReport();

    assert.strictEqual(report.ok, false);
    assert.strictEqual(report.checksumVerified, null);
    assert.ok(report.warnings.some(w => w.includes('Файл состояния не читается')));
  });

  test('returns ok report with valid backups', () => {
    const { stateFile, backupDir } = setupTempEnv();

    // Valid state file
    const payload = createValidPayload();
    fs.writeFileSync(stateFile, JSON.stringify(payload), 'utf8');

    // Valid backup file
    const backupFile = path.join(backupDir, 'dental-crm-state-20240101T000000Z.json');
    fs.writeFileSync(backupFile, JSON.stringify(payload), 'utf8');

    const report = getPersistentStateIntegrityReport();

    assert.strictEqual(report.ok, true);
    assert.strictEqual(report.backups.length, 1);
    assert.strictEqual(report.backups[0]?.checksumVerified, true);
    assert.strictEqual(report.backups[0]?.readable, true);
    assert.deepStrictEqual(report.warnings, []);
  });

  test('returns warning for backup checksum mismatch', () => {
    const { stateFile, backupDir } = setupTempEnv();

    // Valid state file
    const payload = createValidPayload();
    fs.writeFileSync(stateFile, JSON.stringify(payload), 'utf8');

    // Invalid backup file
    const invalidBackupPayload = createValidPayload();
    invalidBackupPayload.checksum = 'invalid';
    const backupFile = path.join(backupDir, 'dental-crm-state-20240101T000000Z.json');
    fs.writeFileSync(backupFile, JSON.stringify(invalidBackupPayload), 'utf8');

    const report = getPersistentStateIntegrityReport();

    assert.strictEqual(report.ok, false);
    assert.strictEqual(report.backups.length, 1);
    assert.strictEqual(report.backups[0]?.checksumVerified, false);
    assert.ok(report.warnings.some(w => w.includes('одна из последних резервных копий не прошла проверку') || w.toLowerCase().includes('не прошла проверку')));
  });
});
