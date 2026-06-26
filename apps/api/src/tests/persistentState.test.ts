import { test, describe, mock, afterEach, beforeEach } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  loadPersistentState,
  getPersistentStateMeta,
  savePersistentState,
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
    // Memory rule: reset process.env manually without reassignment
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
