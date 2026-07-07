<<<<<<< HEAD
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
import { describe, it, beforeEach, afterEach } from "node:test";
=======
import { test, describe, mock, afterEach, beforeEach } from "node:test";
>>>>>>> gitlab/main
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
<<<<<<< HEAD

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
=======
import { createHash } from "node:crypto";
import {
  loadPersistentState,
  getPersistentStateMeta,
  getPersistentStateIntegrityReport,
  savePersistentState,
  type DentalMutableState,
} from "../persistentState.js";

describe("loadPersistentState", () => {
  let tempDir: string;
  let originalEnv: NodeJS.ProcessEnv;
  let stateFile: string;
  let backupDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "dental-state-test-load-"));
    originalEnv = { ...process.env };
    stateFile = path.join(tempDir, "state.json");
    backupDir = path.join(tempDir, "backups");

    process.env.DENTAL_STATE_PERSISTENCE = "on";
    process.env.DENTAL_STATE_FILE = stateFile;
    process.env.DENTAL_STATE_BACKUP_DIR = backupDir;
  });

  afterEach(() => {
    mock.restoreAll();
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    }
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value !== undefined) {
        process.env[key] = value;
      }
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test("returns null when persistence is disabled", () => {
    process.env.DENTAL_STATE_PERSISTENCE = "off";
    fs.writeFileSync(stateFile, JSON.stringify({ version: 1, state: {} }), "utf8");

    const result = loadPersistentState();

    assert.strictEqual(result, null);
  });

  test("returns null when state file does not exist", () => {
    const result = loadPersistentState();

    assert.strictEqual(result, null);
  });


  test("returns null when persistence is disabled", () => {
    process.env.DENTAL_STATE_PERSISTENCE = "off";
    const result = loadPersistentState();
    assert.strictEqual(result, null);
  });

  test("returns null when file is missing", () => {
    mock.method(fs, "existsSync", () => false);
    process.env.DENTAL_STATE_PERSISTENCE = "on";
    const result = loadPersistentState();
    assert.strictEqual(result, null);
  });

  test("returns null when file is unreadable (invalid json)", () => {
    mock.method(fs, "existsSync", () => true);
    mock.method(fs, "readFileSync", () => "{ invalid json");
    mock.method(console, "warn", () => {});

    process.env.DENTAL_STATE_PERSISTENCE = "on";
    const result = loadPersistentState();
    assert.strictEqual(result, null);
  });

  test("returns null when version mismatches", () => {
    mock.method(fs, "existsSync", () => true);
    mock.method(fs, "readFileSync", () => JSON.stringify({ version: 999, state: {} }));
    mock.method(console, "warn", () => {});

    process.env.DENTAL_STATE_PERSISTENCE = "on";
    const result = loadPersistentState();
    assert.strictEqual(result, null);
  });

  test("returns null when checksum mismatches", () => {
    mock.method(fs, "existsSync", () => true);
    mock.method(fs, "readFileSync", () => JSON.stringify({ version: 1, state: {}, checksum: "invalid" }));
    mock.method(console, "warn", () => {});

    process.env.DENTAL_STATE_PERSISTENCE = "on";
    const result = loadPersistentState();
    assert.strictEqual(result, null);
  });

  test("returns null when file system access throws an error", () => {
    mock.method(fs, "existsSync", () => true);
    mock.method(fs, "readFileSync", () => {
      throw new Error("EACCES: permission denied");
    });
    mock.method(console, "warn", () => {}); // Suppress expected warning

    const result = loadPersistentState();

    assert.strictEqual(result, null);
  });

  test("returns null when file contains invalid JSON", () => {
    fs.writeFileSync(stateFile, "{ invalid json", "utf8");
    mock.method(console, "warn", () => {}); // Suppress expected warning

    const result = loadPersistentState();

    assert.strictEqual(result, null);
  });

  test("returns null when file has incorrect version", () => {
    fs.writeFileSync(stateFile, JSON.stringify({ version: 999, state: {} }), "utf8");

    const result = loadPersistentState();

    assert.strictEqual(result, null);
  });

  test("returns null when file has no state property", () => {
    fs.writeFileSync(stateFile, JSON.stringify({ version: 1 }), "utf8");

    const result = loadPersistentState();

    assert.strictEqual(result, null);
  });

  test("returns null and logs warning when checksum mismatch", () => {
    const payload = {
      version: 1,
      savedAt: new Date().toISOString(),
      state: {},
      checksum: "invalid-checksum"
    };
    fs.writeFileSync(stateFile, JSON.stringify(payload), "utf8");

    let warningLogged = false;
    mock.method(console, "warn", (message: string) => {
      if (message.includes("checksum mismatch")) {
        warningLogged = true;
      }
    });

    const result = loadPersistentState();

    assert.strictEqual(result, null);
    assert.strictEqual(warningLogged, true);
  });

  test("returns parsed state when file is valid and checksum matches", () => {
    const mockState = { clinicProfile: { id: "test-123" } } as any;

    // Use savePersistentState to generate a valid file with correct checksum
    savePersistentState(mockState);

    const result = loadPersistentState();

    assert.deepStrictEqual(result, mockState);
  });
});

describe("getPersistentStateMeta", () => {
  let tempDir: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "dental-state-test-"));
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    mock.restoreAll();
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    }
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value !== undefined) {
        process.env[key] = value;
      }
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test("returns default meta when files do not exist and persistence is enabled", () => {
    const stateFile = path.join(tempDir, "state.json");
    const backupDir = path.join(tempDir, "backups");

    process.env.DENTAL_STATE_PERSISTENCE = "on";
    process.env.DENTAL_STATE_FILE = stateFile;
    process.env.DENTAL_STATE_BACKUP_DIR = backupDir;
    process.env.DENTAL_STATE_BACKUPS = "10";

    const meta = getPersistentStateMeta();

    assert.strictEqual(meta.enabled, true);
    assert.strictEqual(meta.filePath, stateFile);
    assert.strictEqual(meta.exists, false);
    assert.strictEqual(meta.version, null);
    assert.strictEqual(meta.backupDirectoryPath, backupDir);
    assert.strictEqual(meta.backupCount, 0);
    assert.strictEqual(meta.latestBackupAt, null);
    assert.strictEqual(meta.latestBackupSizeBytes, null);
    assert.strictEqual(meta.maxBackupCount, 10);
  });

  test("returns correctly populated meta when valid state and backups exist", () => {
    const stateFile = path.join(tempDir, "state.json");
    const backupDir = path.join(tempDir, "backups");

    process.env.DENTAL_STATE_PERSISTENCE = "on";
    process.env.DENTAL_STATE_FILE = stateFile;
    process.env.DENTAL_STATE_BACKUP_DIR = backupDir;
    process.env.DENTAL_STATE_BACKUPS = "10";

    mock.method(console, "warn", () => {});

    // Save state multiple times to create backups
    savePersistentState({} as any);

    // Create a manual backup to have distinct files
    fs.mkdirSync(backupDir, { recursive: true });
    fs.writeFileSync(
      path.join(backupDir, "dental-crm-state-20231010T120000Z.json"),
      '{"old": true}',
    );

    // Save again to trigger rotation
    savePersistentState({} as any);

    const meta = getPersistentStateMeta();

    assert.strictEqual(meta.enabled, true);
    assert.strictEqual(meta.filePath, stateFile);
    assert.strictEqual(meta.exists, true);
    assert.strictEqual(meta.version, 1);
    assert.ok(meta.savedAt !== null);
    assert.ok(meta.checksum !== null);
    assert.strictEqual(meta.backupDirectoryPath, backupDir);
    assert.ok(meta.backupCount > 0);
    assert.ok(meta.latestBackupAt !== null);
    assert.ok(meta.latestBackupSizeBytes !== null);
    assert.strictEqual(meta.maxBackupCount, 10);
  });

  test("returns disabled meta when persistence is disabled", () => {
    const stateFile = path.join(tempDir, "state.json");
    const backupDir = path.join(tempDir, "backups");

    process.env.DENTAL_STATE_PERSISTENCE = "off";
    process.env.DENTAL_STATE_FILE = stateFile;
    process.env.DENTAL_STATE_BACKUP_DIR = backupDir;
    process.env.DENTAL_STATE_BACKUPS = "10";

    const meta = getPersistentStateMeta();

    assert.strictEqual(meta.enabled, false);
    assert.strictEqual(meta.filePath, stateFile);
    assert.strictEqual(meta.exists, false);
  });
});

describe("getPersistentStateIntegrityReport", () => {
  const originalEnv = { ...process.env };
  let tempDir: string;

  afterEach(() => {
    mock.restoreAll();
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
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "dental-state-test-"));
    const stateFile = path.join(tempDir, "state.json");
    const backupDir = path.join(tempDir, "backups");
    fs.mkdirSync(backupDir, { recursive: true });

    process.env.DENTAL_STATE_PERSISTENCE = "on";
    process.env.DENTAL_STATE_FILE = stateFile;
    process.env.DENTAL_STATE_BACKUP_DIR = backupDir;

    return { stateFile, backupDir };
  };

  const createValidPayload = (stateData = {}) => {
    const core = { version: 1, savedAt: new Date().toISOString(), state: stateData };
    const checksum = createHash("sha256").update(JSON.stringify(core)).digest('hex');
    return { ...core, checksum };
  };

  test("reports missing file warning when state file does not exist", async () => {
    setupTempEnv();
    const report = await getPersistentStateIntegrityReport();

    assert.strictEqual(report.ok, false);
    assert.strictEqual(report.meta.exists, false);
    assert.strictEqual(report.checksumVerified, null);
    assert.ok(report.warnings.some(w => w.includes("Файл состояния еще не создан")));
  });

  test("returns ok report for valid state file with no backups", async () => {
    const { stateFile } = setupTempEnv();
    const payload = createValidPayload();
    fs.writeFileSync(stateFile, JSON.stringify(payload), "utf8");

    const report = await getPersistentStateIntegrityReport();

    assert.strictEqual(report.ok, true);
    assert.strictEqual(report.meta.exists, true);
    assert.strictEqual(report.checksumVerified, true);
    assert.deepStrictEqual(report.warnings, []);
  });

  test("returns warning for state file checksum mismatch", async () => {
    const { stateFile } = setupTempEnv();
    const payload = createValidPayload();
    payload.checksum = "invalid-checksum";
    fs.writeFileSync(stateFile, JSON.stringify(payload), "utf8");

    const report = await getPersistentStateIntegrityReport();

    assert.strictEqual(report.ok, false);
    assert.strictEqual(report.checksumVerified, false);
    assert.ok(report.warnings.some(w => w.includes("Контрольная сумма файла состояния не совпала")));
  });

  test("returns warning when state file is unreadable (invalid json)", async () => {
    const { stateFile } = setupTempEnv();
    fs.writeFileSync(stateFile, "{ invalid json", "utf8");

    const report = await getPersistentStateIntegrityReport();

    assert.strictEqual(report.ok, false);
    assert.strictEqual(report.checksumVerified, null);
    assert.ok(report.warnings.some(w => w.includes("Файл состояния не читается")));
  });

  test("returns ok report with valid backups", async () => {
    const { stateFile, backupDir } = setupTempEnv();

    // Valid state file
    const payload = createValidPayload();
    fs.writeFileSync(stateFile, JSON.stringify(payload), "utf8");

    // Valid backup file
    const backupFile = path.join(backupDir, "dental-crm-state-20240101T000000Z.json");
    fs.writeFileSync(backupFile, JSON.stringify(payload), "utf8");

    const report = await getPersistentStateIntegrityReport();

    assert.strictEqual(report.ok, true);
    assert.strictEqual(report.backups.length, 1);
    assert.strictEqual(report.backups[0]?.checksumVerified, true);
    assert.strictEqual(report.backups[0]?.readable, true);
    assert.deepStrictEqual(report.warnings, []);
  });

  test("returns null for stateFileHash when fs.promises.readFile throws an error (e.g. EACCES)", async () => {
    const { stateFile } = setupTempEnv();
    const payload = createValidPayload();
    fs.writeFileSync(stateFile, JSON.stringify(payload), "utf8");

    mock.method(fs.promises, "readFile", () => {
      const error: any = new Error("EACCES: permission denied");
      error.code = "EACCES";
      return Promise.reject(error);
    });

    const report = await getPersistentStateIntegrityReport();

    assert.strictEqual(report.stateFileHash, null);
  });

  test("returns warning for backup checksum mismatch", async () => {
    const { stateFile, backupDir } = setupTempEnv();

    // Valid state file
    const payload = createValidPayload();
    fs.writeFileSync(stateFile, JSON.stringify(payload), "utf8");

    // Invalid backup file
    const invalidBackupPayload = createValidPayload();
    invalidBackupPayload.checksum = "invalid";
    const backupFile = path.join(backupDir, "dental-crm-state-20240101T000000Z.json");
    fs.writeFileSync(backupFile, JSON.stringify(invalidBackupPayload), "utf8");

    const report = await getPersistentStateIntegrityReport();

    assert.strictEqual(report.ok, false);
    assert.strictEqual(report.backups.length, 1);
    assert.strictEqual(report.backups[0]?.checksumVerified, false);
    assert.ok(report.warnings.some(w => w.includes("одна из последних резервных копий не прошла проверку") || w.toLowerCase().includes("не прошла проверку")));
  });
});

describe("savePersistentState", () => {
  const originalEnv = { ...process.env };
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "dental-state-test-"));
    process.env.DENTAL_STATE_FILE = path.join(tempDir, "state.json");
    process.env.DENTAL_STATE_BACKUP_DIR = path.join(tempDir, "backups");
  });

  afterEach(() => {
    mock.restoreAll();
    // Restore environment variables exactly
    for (const key of Object.keys(process.env)) {
      if (originalEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalEnv[key];
      }
    }
    // Clean up temporary directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  const mockState: DentalMutableState = {
    clinicProfile: { id: "clinic-1", name: "Test Clinic" } as any,
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
    denteTelegramBotSettings: {} as any,
    uiPreferences: null,
    activeVisit: {} as any,
  };

  test("does nothing if persistence is disabled", () => {
    process.env.DENTAL_STATE_PERSISTENCE = "off";
    const stateFile = process.env.DENTAL_STATE_FILE!;

    savePersistentState(mockState);

    assert.strictEqual(fs.existsSync(stateFile), false);
  });

  test("saves state to file with checksum", () => {
    process.env.DENTAL_STATE_PERSISTENCE = "on";
    const stateFile = process.env.DENTAL_STATE_FILE!;

    savePersistentState(mockState);

    assert.strictEqual(fs.existsSync(stateFile), true);

    const fileContent = fs.readFileSync(stateFile, "utf8");
    const parsed = JSON.parse(fileContent);

    assert.strictEqual(parsed.version, 1);
    assert.ok(parsed.savedAt);
    assert.ok(parsed.checksum);
    assert.deepStrictEqual(parsed.state, mockState);
  });

  test("rotates backup if file already exists", () => {
    process.env.DENTAL_STATE_PERSISTENCE = "on";
    const stateFile = process.env.DENTAL_STATE_FILE!;
    const backupDir = process.env.DENTAL_STATE_BACKUP_DIR!;

    // First save
    savePersistentState(mockState);
    assert.strictEqual(fs.existsSync(stateFile), true);

    // Modify state slightly for second save
    const modifiedState = { ...mockState, clinicProfile: { id: "clinic-2", name: "Updated" } as any };

    // Second save
    savePersistentState(modifiedState);

    // Check backup directory
    const backups = fs.readdirSync(backupDir);
    assert.strictEqual(backups.length, 1);
    const backupName = backups[0];
    if (!backupName) throw new Error("No backup files found");
    const backupContent = fs.readFileSync(path.join(backupDir, backupName), "utf8");
    const backupParsed = JSON.parse(backupContent);

    // Backup should be the FIRST state
    assert.deepStrictEqual(backupParsed.state.clinicProfile.id, "clinic-1");

    // Current file should be the SECOND state
    const currentContent = fs.readFileSync(stateFile, "utf8");
    const currentParsed = JSON.parse(currentContent);
    assert.deepStrictEqual(currentParsed.state.clinicProfile.id, "clinic-2");
  });

  test("catches errors and logs a warning", () => {
    process.env.DENTAL_STATE_PERSISTENCE = "on";

    // Set state file to a directory to force an error during writeFileSync
    process.env.DENTAL_STATE_FILE = tempDir;

    let warningLogged = false;
    mock.method(console, "warn", (message: string) => {
      if (message.includes("Dental state file save failed")) {
        warningLogged = true;
      }
    });

    // Should not throw
    savePersistentState(mockState);

    assert.strictEqual(warningLogged, true);
  });
>>>>>>> gitlab/main
});
