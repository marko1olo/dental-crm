import { describe, test } from 'node:test';
import assert from 'node:assert';
import { parseCtPlanningViewerRestoreCommandString } from '../ctPlanningViewerRestore.js';

describe('parseCtPlanningViewerRestoreCommandString', () => {
  test('parses valid load_volume command correctly', () => {
    const result = parseCtPlanningViewerRestoreCommandString('load_volume|projection:axial|window:bone|slab:1');
    assert.deepStrictEqual(result, {
      valid: true,
      commands: ['load_volume', 'projection:axial', 'window:bone', 'slab:1'],
      mode: 'load_volume',
      projection: 'axial',
      windowPreset: 'bone',
      slabMm: 1,
      error: null
    });
  });

  test('parses valid metadata_only command correctly', () => {
    const result = parseCtPlanningViewerRestoreCommandString('metadata_only|projection:sagittal|window:custom|slab:0.5');
    assert.deepStrictEqual(result, {
      valid: true,
      commands: ['metadata_only', 'projection:sagittal', 'window:custom', 'slab:0.5'],
      mode: 'metadata_only',
      projection: 'sagittal',
      windowPreset: 'custom',
      slabMm: 0.5,
      error: null
    });
  });

  test('fails on invalid token lengths', () => {
    const expected = {
      valid: false,
      commands: [],
      mode: null,
      projection: null,
      windowPreset: null,
      slabMm: null,
      error: 'restore command string must contain exactly 4 commands'
    };

    assert.deepStrictEqual(parseCtPlanningViewerRestoreCommandString(''), expected);
    assert.deepStrictEqual(parseCtPlanningViewerRestoreCommandString('load_volume|projection:axial|window:bone'), expected);
    assert.deepStrictEqual(parseCtPlanningViewerRestoreCommandString('load_volume|projection:axial|window:bone|slab:1|extra'), expected);
  });

  test('fails on invalid mode', () => {
    const result = parseCtPlanningViewerRestoreCommandString('unknown|projection:axial|window:bone|slab:1');
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.error, 'restore command mode must be load_volume or metadata_only');
  });

  test('fails on missing prefixes', () => {
    assert.strictEqual(
      parseCtPlanningViewerRestoreCommandString('load_volume|axial|window:bone|slab:1').error,
      'restore command projection token is missing'
    );
    assert.strictEqual(
      parseCtPlanningViewerRestoreCommandString('load_volume|projection:axial|bone|slab:1').error,
      'restore command window token is missing'
    );
    assert.strictEqual(
      parseCtPlanningViewerRestoreCommandString('load_volume|projection:axial|window:bone|1').error,
      'restore command slab token is missing'
    );
  });

  test('fails on unsupported projection', () => {
    const result = parseCtPlanningViewerRestoreCommandString('load_volume|projection:unknown|window:bone|slab:1');
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.error, 'restore command projection is unsupported');
  });

  test('fails on unsupported window preset', () => {
    const result = parseCtPlanningViewerRestoreCommandString('load_volume|projection:axial|window:unknown|slab:1');
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.error, 'restore command window preset is unsupported');
  });

  test('fails on invalid slab values', () => {
    const testCases = ['slab:0', 'slab:-1', 'slab:abc'];
    for (const slab of testCases) {
      const result = parseCtPlanningViewerRestoreCommandString(`load_volume|projection:axial|window:bone|${slab}`);
      assert.strictEqual(result.valid, false);
      assert.strictEqual(result.error, 'restore command slab must be a positive number');
    }
  });
});
