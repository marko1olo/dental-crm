import assert from "node:assert";
import crypto from "node:crypto";
import { existsSync, readdirSync, readFileSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, test, mock } from "node:test";
import { savePersistentState, rawFileHash } from "../persistentState.js";
import fsPromises from "node:fs/promises";

describe('savePersistentState', () => {
  let tmpDir: string;
  let stateFilePath: string;

  let originalPersistenceEnv: string | undefined;
  let originalStateFileEnv: string | undefined;
  let originalBackupDirEnv: string | undefined;

  beforeEach(() => {
    tmpDir = path.join(os.tmpdir(), 'dental-test-state-' + crypto.randomUUID());
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
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

import { getPersistentStateMeta, savePersistentState } from "../persistentState.js";

describe("persistentState", () => {
  let tempDir: string;

    originalEnv = process.env;
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "dental-crm-test-"));
    process.env = { ...originalEnv };
    process.env.DENTAL_STATE_FILE = path.join(tempDir, "state.json");
    process.env.DENTAL_STATE_BACKUP_DIR = path.join(tempDir, "backups");
    process.env.DENTAL_STATE_BACKUPS = "5";

    fs.rmSync(tempDir, { recursive: true, force: true });

  describe("getPersistentStateMeta", () => {
    it("returns correct metadata when no state file exists", () => {
      const meta = getPersistentStateMeta();
      assert.strictEqual(meta.enabled, true); // Assuming persistenceEnabled is true by default or depends on another env var
      assert.strictEqual(meta.exists, false);
      assert.strictEqual(meta.version, null);
      assert.strictEqual(meta.savedAt, null);
      assert.strictEqual(meta.checksum, null);
      assert.strictEqual(meta.backupCount, 0);
      assert.strictEqual(meta.latestBackupAt, null);
      assert.strictEqual(meta.latestBackupSizeBytes, null);
      assert.strictEqual(meta.maxBackupCount, 5);
      assert.strictEqual(meta.filePath, path.join(tempDir, "state.json"));
      assert.strictEqual(meta.backupDirectoryPath, path.join(tempDir, "backups"));

    it("returns correct metadata when state file exists and backups are created", () => {
      const mockState = {
        clinicProfile: { id: "1", name: "Test Clinic", description: "A test clinic", currency: "USD", timeZone: "UTC", contactEmail: "test@example.com", contactPhone: "123456789", address: "123 Test St", websiteUrl: "example.com", workingHours: [], defaultAppointmentDurationMinutes: 30, enableSmsNotifications: false, enableEmailNotifications: false },
        staffMembers: [],
        chairs: [],
        appointments: [],
        patients: [],
        documents: [],
        clinicalRules: [],
        payments: [],
        communicationTasks: [],
        communicationEvents: [],
        imagingStudies: [],
        imagingViewerSessions: [],
        dicomWorkbenchBundles: [],
        importBatches: [],
        auditEvents: [],
        aiRecognitionJobs: [],
        speechTranscriptionChunks: [],
        visitDraftAutosaves: [],
        visitSaveReceipts: [],
        denteTelegramLinkCodes: [],
        denteTelegramChatLinks: [],
        denteTelegramWebhookEvents: [],
        denteTelegramOutboxDeliveryReceipts: [],

      // Save the state to create the file and trigger backup logic
      savePersistentState(mockState);

      const meta = getPersistentStateMeta();
      assert.strictEqual(meta.enabled, true);
      assert.strictEqual(meta.exists, true);
      assert.strictEqual(meta.version, 1);
      assert.ok(meta.savedAt);
      assert.ok(meta.checksum);

      // When saving for the first time, it might not create a backup if the original didn't exist yet,
      // because rotateStateBackup copies existing state BEFORE saving.
      // So we save again to ensure a backup is created
      savePersistentState(mockState);

      const meta2 = getPersistentStateMeta();
      assert.strictEqual(meta2.backupCount, 1);
      assert.ok(meta2.latestBackupAt);
      assert.ok(meta2.latestBackupSizeBytes);

    it("handles persistence disabled state", () => {
      process.env.DENTAL_STATE_PERSISTENCE = "off";
      const meta = getPersistentStateMeta();
      assert.strictEqual(meta.enabled, false);
      assert.strictEqual(meta.exists, false);
  });
import * as os from 'node:os';
import * as path from 'node:path';
import * as fs from 'node:fs';

    let stateFile: string;
    let backupDir: string;

    const originalEnv = process.env;

        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dental-state-test-'));
        stateFile = path.join(tmpDir, 'state.json');
        backupDir = path.join(tmpDir, 'backups');

        process.env.DENTAL_STATE_FILE = stateFile;
        process.env.DENTAL_STATE_BACKUP_DIR = backupDir;


    test('reports missing state file correctly', () => {
        assert.ok(report.warnings.some((w: string) => w.includes('Файл состояния еще не создан')));

    test('reports disabled persistence correctly', () => {
        assert.ok(report.warnings.some((w: string) => w.includes('выключено')));

    test('reports valid state correctly', async () => {
        // use savePersistentState twice to generate a valid state file and one backup
        savePersistentState({ staffMembers: [{ id: '1', name: 'John Doe', position: 'doctor' }] } as any);
        // Wait a small amount to make sure modified times are different if precision is low
        await new Promise(resolve => setTimeout(resolve, 50));
        savePersistentState({ staffMembers: [{ id: '1', name: 'John Doe', position: 'doctor' }, { id: '2', name: 'Jane Doe', position: 'nurse' }] } as any);

        assert.strictEqual(report.backups.length, 1);
        assert.strictEqual(report.stateCounts.staffMembers, 2);

    test('reports unreadable state file', () => {
        fs.mkdirSync(path.dirname(stateFile), { recursive: true });
        fs.writeFileSync(stateFile, 'invalid json');
        assert.ok(report.warnings.some((w: string) => w.includes('не читается')));

    test('reports checksum mismatch', () => {
        savePersistentState({ staffMembers: [] } as any);
        const data = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
        data.state.staffMembers = [{ id: 'fake' }]; // mutate state to break checksum
        fs.writeFileSync(stateFile, JSON.stringify(data));

        assert.ok(report.warnings.some((w: string) => w.includes('Контрольная сумма')));

    test('reports backup integrity warnings', () => {
        savePersistentState({ staffMembers: [] } as any);
        // Save again to trigger backup
        savePersistentState({ staffMembers: [] } as any);

        // Corrupt the backup
        const backups = fs.readdirSync(backupDir);
        assert.ok(backups.length > 0);
        const backupFile = backups[0]; if (backupFile) fs.writeFileSync(path.join(backupDir, backupFile), 'invalid json');

        assert.ok(report.warnings.some((w: string) => w.includes('не прошла проверку')));
});

describe("rawFileHash", () => {
    let tmpDir: string;
    let filePath: string;

    beforeEach(() => {
        tmpDir = path.join(os.tmpdir(), "dental-test-raw-hash-" + crypto.randomUUID());
        mkdirSync(tmpDir, { recursive: true });
        filePath = path.join(tmpDir, "test.txt");
    });

    afterEach(() => {
        mock.restoreAll();
        if (existsSync(tmpDir)) {
            rmSync(tmpDir, { recursive: true, force: true });
        }
    });

    test("returns hash when file exists", async () => {
        const content = "hello world";
        writeFileSync(filePath, content);
        const hash = await rawFileHash(filePath);
        const expected = crypto.createHash("sha256").update(content).digest("hex");
        assert.strictEqual(hash, expected);
    });

    test("returns null when file does not exist", async () => {
        const hash = await rawFileHash(path.join(tmpDir, "does-not-exist.txt"));
        assert.strictEqual(hash, null);
    });

    test("returns null when fs.promises.readFile throws", async () => {
        writeFileSync(filePath, "content");
        mock.method(fsPromises, "readFile", async () => { throw new Error("Mock error"); });
        const hash = await rawFileHash(filePath);
        assert.strictEqual(hash, null);
    });
});
