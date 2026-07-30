import { test, describe, afterEach, beforeEach } from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import { rmSync, existsSync, readFileSync, readdirSync } from 'node:fs';
import os from 'node:os';
import { savePersistentState } from '../persistentState.js';

describe('savePersistentState', () => {
  let tmpDir: string;
  let stateFilePath: string;

  let originalPersistenceEnv: string | undefined;
  let originalStateFileEnv: string | undefined;
  let originalBackupDirEnv: string | undefined;

  beforeEach(() => {
    tmpDir = path.join(os.tmpdir(), 'dental-test-state-' + Date.now() + Math.random());
    stateFilePath = path.join(tmpDir, 'state.json');

    originalPersistenceEnv = process.env.DENTAL_STATE_PERSISTENCE;
    originalStateFileEnv = process.env.DENTAL_STATE_FILE;
    originalBackupDirEnv = process.env.DENTAL_STATE_BACKUP_DIR;

    process.env.DENTAL_STATE_PERSISTENCE = 'on';
    process.env.DENTAL_STATE_FILE = stateFilePath;
import fs from 'node:fs';
import { getPersistentStateIntegrityReport, savePersistentState } from '../persistentState.js';

describe('getPersistentStateIntegrityReport', () => {
  let originalEnv: NodeJS.ProcessEnv;

    originalEnv = { ...process.env };
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dental-crm-test-'));

    process.env.DENTAL_STATE_FILE = path.join(tmpDir, 'state.json');
    process.env.DENTAL_STATE_BACKUP_DIR = path.join(tmpDir, 'backups');
  });

  afterEach(() => {
    if (originalPersistenceEnv !== undefined) {
      process.env.DENTAL_STATE_PERSISTENCE = originalPersistenceEnv;
    } else {
      delete process.env.DENTAL_STATE_PERSISTENCE;
    }

    if (originalStateFileEnv !== undefined) {
      process.env.DENTAL_STATE_FILE = originalStateFileEnv;
    } else {
      delete process.env.DENTAL_STATE_FILE;
    }

    if (originalBackupDirEnv !== undefined) {
      process.env.DENTAL_STATE_BACKUP_DIR = originalBackupDirEnv;
    } else {
      delete process.env.DENTAL_STATE_BACKUP_DIR;
    }

    if (existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('saves state to the specified file', () => {
    const fakeState: any = { patients: [], appointments: [] };
    savePersistentState(fakeState);

    assert.ok(existsSync(stateFilePath), 'State file should be created');
    const content = JSON.parse(readFileSync(stateFilePath, 'utf8'));
    assert.deepStrictEqual(content.state, fakeState);
    assert.ok(content.checksum, 'Payload should have a checksum');
  });

  test('does not save when persistence is off', () => {
    process.env.DENTAL_STATE_PERSISTENCE = 'off';
    const fakeState: any = { patients: [], appointments: [] };
    savePersistentState(fakeState);

    assert.ok(!existsSync(stateFilePath), 'State file should not be created when persistence is off');
  });

  test('creates backups of previous state', () => {
    const fakeState1: any = { patients: [{ id: '1' }] };
    savePersistentState(fakeState1);

    const fakeState2: any = { patients: [{ id: '1' }, { id: '2' }] };
    savePersistentState(fakeState2);

    const backupDir = path.join(tmpDir, 'backups');
    assert.ok(existsSync(backupDir), 'Backup directory should be created');

    const backups = readdirSync(backupDir);
    assert.strictEqual(backups.length, 1, 'Should have created one backup');

    const backupContent = JSON.parse(readFileSync(path.join(backupDir, backups[0] as string), 'utf8'));
    assert.deepStrictEqual(backupContent.state, fakeState1, 'Backup should contain the previous state');
    fs.rmSync(tmpDir, { recursive: true, force: true });
    process.env = originalEnv;

  test('reports persistence_disabled when persistence is off', () => {

    const report = getPersistentStateIntegrityReport();

    assert.strictEqual(report.ok, false);
    assert.strictEqual(report.meta.enabled, false);
    assert.ok(report.warnings.some(w => w.includes('Серверное сохранение состояния выключено')));

  test('reports state_file_missing when file does not exist', () => {
    process.env.DENTAL_STATE_PERSISTENCE = 'on';

    const report = getPersistentStateIntegrityReport();

    assert.strictEqual(report.ok, false);
    assert.strictEqual(report.meta.exists, false);
    assert.ok(report.warnings.some(w => w.includes('Файл состояния еще не создан')));

  test('reports state_file_unreadable when file contains invalid JSON', () => {
    process.env.DENTAL_STATE_PERSISTENCE = 'on';
    fs.writeFileSync(process.env.DENTAL_STATE_FILE!, 'not valid json');

    const report = getPersistentStateIntegrityReport();

    assert.strictEqual(report.ok, false);
    assert.strictEqual(report.meta.exists, true);
    assert.ok(report.warnings.some(w => w.includes('Файл состояния не читается')));

  test('reports state_checksum_mismatch when checksum is invalid', () => {
    process.env.DENTAL_STATE_PERSISTENCE = 'on';
    const invalidState = {
      version: 1,
      savedAt: new Date().toISOString(),
      checksum: 'invalid-checksum',
      state: {
        clinicProfile: {
          name: 'Test Clinic',
          currency: 'RUB',
          timezone: 'Europe/Moscow',
          country: 'RU'
        },
        staffMembers: [], chairs: [], appointments: [], patients: [], documents: [],
        clinicalRules: [], payments: [], communicationTasks: [], communicationEvents: [],
        imagingStudies: [], imagingViewerSessions: [], dicomWorkbenchBundles: [],
        importBatches: [], auditEvents: [], aiRecognitionJobs: [], speechTranscriptionChunks: [],
        visitDraftAutosaves: [], visitSaveReceipts: [], denteTelegramLinkCodes: [],
        denteTelegramChatLinks: [], denteTelegramWebhookEvents: [], denteTelegramOutboxDeliveryReceipts: [],
        uiPreferences: null,
        activeVisit: null,
        denteTelegramBotSettings: { token: null, webhookUrl: null, webhookSecret: null }
    };
    fs.writeFileSync(process.env.DENTAL_STATE_FILE!, JSON.stringify(invalidState));

    const report = getPersistentStateIntegrityReport();

    assert.strictEqual(report.ok, false);
    assert.strictEqual(report.meta.exists, true);
    assert.strictEqual(report.checksumVerified, false);
    assert.ok(report.warnings.some(w => w.includes('Контрольная сумма файла состояния не совпала')));

  test('reports ok when valid state exists', () => {
    process.env.DENTAL_STATE_PERSISTENCE = 'on';
    const validState = {
      clinicProfile: {
        name: 'Test Clinic',
        currency: 'RUB',
        timezone: 'Europe/Moscow',
        country: 'RU'
      },
      staffMembers: [], chairs: [], appointments: [], patients: [], documents: [],
      clinicalRules: [], payments: [], communicationTasks: [], communicationEvents: [],
      imagingStudies: [], imagingViewerSessions: [], dicomWorkbenchBundles: [],
      importBatches: [], auditEvents: [], aiRecognitionJobs: [], speechTranscriptionChunks: [],
      visitDraftAutosaves: [], visitSaveReceipts: [], denteTelegramLinkCodes: [],
      denteTelegramChatLinks: [], denteTelegramWebhookEvents: [], denteTelegramOutboxDeliveryReceipts: [],
      uiPreferences: null,
      activeVisit: null,
      denteTelegramBotSettings: { token: null, webhookUrl: null, webhookSecret: null }
    };

    // Use the actual save function to ensure correct checksum generation
    savePersistentState(validState as any);

    const report = getPersistentStateIntegrityReport();

    assert.strictEqual(report.ok, true);
    assert.strictEqual(report.meta.exists, true);
    assert.strictEqual(report.checksumVerified, true);
    assert.strictEqual(report.warnings.length, 0);
