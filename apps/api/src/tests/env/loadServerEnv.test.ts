import { test, describe, afterEach, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { getLoadedServerEnvFiles, loadAdditionalServerEnv } from '../../env/loadServerEnv.js';

describe('loadServerEnv', () => {
  const originalEnv = { ...process.env };
  let originalCwd: () => string;
  let tempDir: string;

  beforeEach(() => {
    mock.restoreAll();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'loadServerEnvTest-'));
    originalCwd = process.cwd;
    process.cwd = () => tempDir;
  });

  afterEach(() => {
    // Restore process.env cleanly without replacing the object
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

    process.cwd = originalCwd;
    mock.restoreAll();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('getLoadedServerEnvFiles', () => {
    test('should return an array of strings without duplicates', () => {
      // Create actual dummy env files in the temp directory
      const testEnvPath = path.join(tempDir, 'test.env');
      const anotherEnvPath = path.join(tempDir, 'another.env');

      fs.writeFileSync(testEnvPath, 'TEST_ENV_VAR=123\n');
      fs.writeFileSync(anotherEnvPath, 'ANOTHER_VAR=456\n');

      // Provide explicit env files via process.env
      process.env.DENTAL_ENV_FILE = testEnvPath;
      process.env.DENTAL_EXTRA_ENV_FILES = `${anotherEnvPath}, ${testEnvPath}, ${anotherEnvPath}`;

      const returnedFiles = loadAdditionalServerEnv();
      const afterFiles = getLoadedServerEnvFiles();

      // Check that it returns an array
      assert.ok(Array.isArray(afterFiles), 'getLoadedServerEnvFiles should return an array');
      assert.deepStrictEqual(afterFiles, returnedFiles, 'getLoadedServerEnvFiles should return the same array as loadAdditionalServerEnv');

      // Check for uniqueness
      const uniqueFiles = new Set(afterFiles);
      assert.strictEqual(afterFiles.length, uniqueFiles.size, 'The returned array should not contain duplicate entries');

      // Verify the expected files are in the array
      assert.ok(afterFiles.includes(path.resolve(testEnvPath)), 'The explicit test environment file should be included in the loaded files list');
      assert.ok(afterFiles.includes(path.resolve(anotherEnvPath)), 'The extra environment file should be included in the loaded files list');

      // Check side effect on process.env
      assert.strictEqual(process.env.TEST_ENV_VAR, '123', 'The environment variable from the mock file should be loaded');
      assert.strictEqual(process.env.ANOTHER_VAR, '456', 'The environment variable from the another file should be loaded');
    });

    test('should handle read errors gracefully without throwing', () => {
      // Pass the path to a directory instead of a file to simulate read error across platforms
      const errorEnvPath = path.join(tempDir, 'errorDir.env');
      fs.mkdirSync(errorEnvPath);

      const warnMock = mock.method(console, 'warn', () => {});

      process.env.DENTAL_ENV_FILE = errorEnvPath;
      delete process.env.DENTAL_EXTRA_ENV_FILES;

      loadAdditionalServerEnv();
      const afterFiles = getLoadedServerEnvFiles();

      // No new files should have been added successfully
      assert.ok(!afterFiles.includes(path.resolve(errorEnvPath)), 'The error file/directory should not be included in loaded files');

      // Should have warned
      assert.ok(warnMock.mock.calls.length > 0, 'Console warn should be called');
      assert.ok(warnMock.mock.calls[0].arguments[0].includes('[env] Failed to load optional env file'));
    });
  });
});
