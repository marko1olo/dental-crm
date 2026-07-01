import { test, describe } from 'node:test';
import assert from 'node:assert';
import { buildCtPlanningViewerRestoreCommands, type CtPlanningViewerRestoreInput } from '../ctPlanningViewerRestore.js';

describe('buildCtPlanningViewerRestoreCommands', () => {
  test('builds commands correctly when requiresVolume is true', () => {
    const input: CtPlanningViewerRestoreInput = {
      projection: 'axial',
      windowPreset: 'bone',
      slabMm: 10,
      requiresVolume: true,
    };

    const result = buildCtPlanningViewerRestoreCommands(input);

    assert.deepStrictEqual(result, [
      'load_volume',
      'projection:axial',
      'window:bone',
      'slab:10'
    ]);
  });

  test('builds commands correctly when requiresVolume is false', () => {
    const input: CtPlanningViewerRestoreInput = {
      projection: 'panoramic_reconstruction',
      windowPreset: 'soft_tissue',
      slabMm: 5,
      requiresVolume: false,
    };

    const result = buildCtPlanningViewerRestoreCommands(input);

    assert.deepStrictEqual(result, [
      'metadata_only',
      'projection:panoramic_reconstruction',
      'window:soft_tissue',
      'slab:5'
    ]);
  });

  test('builds commands correctly with 0 slabMm', () => {
    const input: CtPlanningViewerRestoreInput = {
      projection: 'sagittal',
      windowPreset: 'custom',
      slabMm: 0,
      requiresVolume: true,
    };

    const result = buildCtPlanningViewerRestoreCommands(input);

    assert.deepStrictEqual(result, [
      'load_volume',
      'projection:sagittal',
      'window:custom',
      'slab:0'
    ]);
  });
});
