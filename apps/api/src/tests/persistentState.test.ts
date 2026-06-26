import { test, describe, mock, afterEach, beforeEach } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { loadPersistentState, savePersistentState } from '../persistentState.js';
import type { DentalMutableState } from '../persistentState.js';

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

describe('savePersistentState', () => {
  const originalEnv = { ...process.env };
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dental-state-test-'));
    process.env.DENTAL_STATE_FILE = path.join(tempDir, 'state.json');
    process.env.DENTAL_STATE_BACKUP_DIR = path.join(tempDir, 'backups');
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
    clinicProfile: { id: 'clinic-1', name: 'Test Clinic' } as any,
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
  };

  test('does nothing if persistence is disabled', () => {
    process.env.DENTAL_STATE_PERSISTENCE = 'off';
    const stateFile = process.env.DENTAL_STATE_FILE!;

    savePersistentState(mockState);

    assert.strictEqual(fs.existsSync(stateFile), false);
  });

  test('saves state to file with checksum', () => {
    process.env.DENTAL_STATE_PERSISTENCE = 'on';
    const stateFile = process.env.DENTAL_STATE_FILE!;

    savePersistentState(mockState);

    assert.strictEqual(fs.existsSync(stateFile), true);

    const fileContent = fs.readFileSync(stateFile, 'utf8');
    const parsed = JSON.parse(fileContent);

    assert.strictEqual(parsed.version, 1);
    assert.ok(parsed.savedAt);
    assert.ok(parsed.checksum);
    assert.deepStrictEqual(parsed.state, mockState);
  });

  test('rotates backup if file already exists', () => {
    process.env.DENTAL_STATE_PERSISTENCE = 'on';
    const stateFile = process.env.DENTAL_STATE_FILE!;
    const backupDir = process.env.DENTAL_STATE_BACKUP_DIR!;

    // First save
    savePersistentState(mockState);
    assert.strictEqual(fs.existsSync(stateFile), true);

    // Modify state slightly for second save
    const modifiedState = { ...mockState, clinicProfile: { id: 'clinic-2', name: 'Updated' } as any };

    // Second save
    savePersistentState(modifiedState);

    // Check backup directory
    assert.strictEqual(fs.existsSync(backupDir), true);
    const backups = fs.readdirSync(backupDir);
    assert.strictEqual(backups.length, 1);

    const backupContent = fs.readFileSync(path.join(backupDir, backups[0]), 'utf8');
    const backupParsed = JSON.parse(backupContent);

    // Backup should be the FIRST state
    assert.deepStrictEqual(backupParsed.state.clinicProfile.id, 'clinic-1');

    // Current file should be the SECOND state
    const currentContent = fs.readFileSync(stateFile, 'utf8');
    const currentParsed = JSON.parse(currentContent);
    assert.deepStrictEqual(currentParsed.state.clinicProfile.id, 'clinic-2');
  });

  test('catches errors and logs a warning', () => {
    process.env.DENTAL_STATE_PERSISTENCE = 'on';

    // Set state file to a directory to force an error during writeFileSync
    process.env.DENTAL_STATE_FILE = tempDir;

    let warningLogged = false;
    mock.method(console, 'warn', (message: string) => {
      if (message.includes('Dental state file save failed')) {
        warningLogged = true;
      }
    });

    // Should not throw
    savePersistentState(mockState);

    assert.strictEqual(warningLogged, true);
  });
});
