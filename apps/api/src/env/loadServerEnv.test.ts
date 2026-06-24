import { test, describe, afterEach, beforeEach } from 'node:test';
import assert from 'node:assert';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('getLoadedServerEnvFiles', () => {
  let tmpDir: string;
  let env1: string;
  let env2: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(path.join(os.tmpdir(), 'env-test-'));
    env1 = path.join(tmpDir, '.env.test1');
    env2 = path.join(tmpDir, '.env.test2');
    writeFileSync(env1, 'VAR1=1\n');
    writeFileSync(env2, 'VAR2=2\n');
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
    delete process.env.DENTAL_EXTRA_ENV_FILES;
  });

  test('returns deduplicated array of loaded env files', async () => {
    const { loadAdditionalServerEnv, getLoadedServerEnvFiles } = await import('./loadServerEnv.js');

    const initialFiles = getLoadedServerEnvFiles();

    process.env.DENTAL_EXTRA_ENV_FILES = `${env1},${env2}`;

    loadAdditionalServerEnv();
    const afterFirstLoad = getLoadedServerEnvFiles();
    assert.ok(afterFirstLoad.includes(env1), 'Should include env1');
    assert.ok(afterFirstLoad.includes(env2), 'Should include env2');

    // We expect the original array to have grown by exactly 2
    assert.strictEqual(afterFirstLoad.length, initialFiles.length + 2, 'Should add exactly 2 new files');

    // Load again to verify deduplication
    loadAdditionalServerEnv();
    const afterSecondLoad = getLoadedServerEnvFiles();

    assert.strictEqual(afterSecondLoad.length, afterFirstLoad.length, 'Length should remain the same due to deduplication');
    assert.deepStrictEqual(afterSecondLoad, afterFirstLoad, 'Contents should remain the same due to deduplication');
  });

  test('returns a new array instance to prevent accidental mutation of internal state', async () => {
    const { getLoadedServerEnvFiles } = await import('./loadServerEnv.js');

    const files1 = getLoadedServerEnvFiles();
    const files2 = getLoadedServerEnvFiles();

    // The references should not be exactly the same
    assert.notStrictEqual(files1, files2, 'Should return a new array instance');

    // Mutating the returned array should not affect subsequent calls
    const originalLength = files1.length;
    files1.push('/fake/path.env');

    const files3 = getLoadedServerEnvFiles();
    assert.strictEqual(files3.length, originalLength, 'Internal state should not be mutated by modifying returned array');
  });
});
