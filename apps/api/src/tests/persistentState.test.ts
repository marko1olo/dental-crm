import { test, describe, mock, afterEach, beforeEach } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
import {
  loadPersistentState,
  getPersistentStateMeta,
  getPersistentStateIntegrityReport,
  savePersistentState,
  type DentalMutableState,
} from "../persistentState.js";

describe("loadPersistentState", () => {
  const originalPersistenceEnv = process.env.DENTAL_STATE_PERSISTENCE;

  afterEach(() => {
    mock.restoreAll();
    if (originalPersistenceEnv !== undefined) {
      process.env.DENTAL_STATE_PERSISTENCE = originalPersistenceEnv;
    } else {
      delete process.env.DENTAL_STATE_PERSISTENCE;
    }
  });

  test("returns null when file system access throws an error", () => {
    mock.method(fs, "existsSync", () => true);
    mock.method(fs, "readFileSync", () => {
      throw new Error("EACCES: permission denied");
    });
    mock.method(console, "warn", () => {}); // Suppress expected warning

    process.env.DENTAL_STATE_PERSISTENCE = "on";

    const result = loadPersistentState();

    assert.strictEqual(result, null);
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

  test("reports missing file warning when state file does not exist", () => {
    setupTempEnv();
    const report = getPersistentStateIntegrityReport();

    assert.strictEqual(report.ok, false);
    assert.strictEqual(report.meta.exists, false);
    assert.strictEqual(report.checksumVerified, null);
    assert.ok(report.warnings.some(w => w.includes("Файл состояния еще не создан")));
  });

  test("returns ok report for valid state file with no backups", () => {
    const { stateFile } = setupTempEnv();
    const payload = createValidPayload();
    fs.writeFileSync(stateFile, JSON.stringify(payload), "utf8");

    const report = getPersistentStateIntegrityReport();

    assert.strictEqual(report.ok, true);
    assert.strictEqual(report.meta.exists, true);
    assert.strictEqual(report.checksumVerified, true);
    assert.deepStrictEqual(report.warnings, []);
  });

  test("returns warning for state file checksum mismatch", () => {
    const { stateFile } = setupTempEnv();
    const payload = createValidPayload();
    payload.checksum = "invalid-checksum";
    fs.writeFileSync(stateFile, JSON.stringify(payload), "utf8");

    const report = getPersistentStateIntegrityReport();

    assert.strictEqual(report.ok, false);
    assert.strictEqual(report.checksumVerified, false);
    assert.ok(report.warnings.some(w => w.includes("Контрольная сумма файла состояния не совпала")));
  });

  test("returns warning when state file is unreadable (invalid json)", () => {
    const { stateFile } = setupTempEnv();
    fs.writeFileSync(stateFile, "{ invalid json", "utf8");

    const report = getPersistentStateIntegrityReport();

    assert.strictEqual(report.ok, false);
    assert.strictEqual(report.checksumVerified, null);
    assert.ok(report.warnings.some(w => w.includes("Файл состояния не читается")));
  });

  test("returns ok report with valid backups", () => {
    const { stateFile, backupDir } = setupTempEnv();

    // Valid state file
    const payload = createValidPayload();
    fs.writeFileSync(stateFile, JSON.stringify(payload), "utf8");

    // Valid backup file
    const backupFile = path.join(backupDir, "dental-crm-state-20240101T000000Z.json");
    fs.writeFileSync(backupFile, JSON.stringify(payload), "utf8");

    const report = getPersistentStateIntegrityReport();

    assert.strictEqual(report.ok, true);
    assert.strictEqual(report.backups.length, 1);
    assert.strictEqual(report.backups[0]?.checksumVerified, true);
    assert.strictEqual(report.backups[0]?.readable, true);
    assert.deepStrictEqual(report.warnings, []);
  });

  test("returns warning for backup checksum mismatch", () => {
    const { stateFile, backupDir } = setupTempEnv();

    // Valid state file
    const payload = createValidPayload();
    fs.writeFileSync(stateFile, JSON.stringify(payload), "utf8");

    // Invalid backup file
    const invalidBackupPayload = createValidPayload();
    invalidBackupPayload.checksum = "invalid";
    const backupFile = path.join(backupDir, "dental-crm-state-20240101T000000Z.json");
    fs.writeFileSync(backupFile, JSON.stringify(invalidBackupPayload), "utf8");

    const report = getPersistentStateIntegrityReport();

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
});
