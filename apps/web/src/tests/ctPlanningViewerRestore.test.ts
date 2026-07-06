import { test, describe } from 'node:test';
import assert from 'node:assert';
import { serializeCtPlanningViewerRestoreCommands, type CtPlanningViewerRestoreCommand, parseCtPlanningViewerRestoreCommandString } from '../ctPlanningViewerRestore.js';


describe('serializeCtPlanningViewerRestoreCommands', () => {
  test('returns an empty string when provided an empty array', () => {
    const commands: CtPlanningViewerRestoreCommand[] = [];
    assert.strictEqual(serializeCtPlanningViewerRestoreCommands(commands), "");
  });

  test('returns the command itself when provided a single command', () => {
    const commands: CtPlanningViewerRestoreCommand[] = ["load_volume"];
    assert.strictEqual(serializeCtPlanningViewerRestoreCommands(commands), "load_volume");
  });

  test('correctly joins multiple commands with a pipe character', () => {
    const commands: CtPlanningViewerRestoreCommand[] = [
      "load_volume",
      "projection:axial",
      "window:bone",
      "slab:5"
    ];
    assert.strictEqual(
      serializeCtPlanningViewerRestoreCommands(commands),
      "load_volume|projection:axial|window:bone|slab:5"
    );
  });

  test('correctly handles another valid combination of commands', () => {
    const commands: CtPlanningViewerRestoreCommand[] = [
      "metadata_only",
      "projection:sagittal",
      "window:soft_tissue",
      "slab:10.5"
    ];
    assert.strictEqual(
      serializeCtPlanningViewerRestoreCommands(commands),
      "metadata_only|projection:sagittal|window:soft_tissue|slab:10.5"
    );
  });
});


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
import { buildCtPlanningViewerRestoreCommands, type CtPlanningViewerRestoreInput } from '../ctPlanningViewerRestore.js';

describe('buildCtPlanningViewerRestoreCommands', () => {
  test('builds commands correctly when requiresVolume is true', () => {
    const input: CtPlanningViewerRestoreInput = {
      slabMm: 10,
      requiresVolume: true,

    const result = buildCtPlanningViewerRestoreCommands(input);

    assert.deepStrictEqual(result, [
      'load_volume',
      'projection:axial',
      'window:bone',
      'slab:10'
    ]);

  test('builds commands correctly when requiresVolume is false', () => {
    const input: CtPlanningViewerRestoreInput = {
      projection: 'panoramic_reconstruction',
      windowPreset: 'soft_tissue',
      slabMm: 5,
      requiresVolume: false,

    const result = buildCtPlanningViewerRestoreCommands(input);

    assert.deepStrictEqual(result, [
      'metadata_only',
      'projection:panoramic_reconstruction',
      'window:soft_tissue',
      'slab:5'
    ]);

  test('builds commands correctly with 0 slabMm', () => {
    const input: CtPlanningViewerRestoreInput = {
      slabMm: 0,
      requiresVolume: true,

    const result = buildCtPlanningViewerRestoreCommands(input);

    assert.deepStrictEqual(result, [
      'load_volume',
      'projection:sagittal',
      'window:custom',
      'slab:0'
    ]);
  });
});
