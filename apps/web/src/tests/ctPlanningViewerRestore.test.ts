import { test, describe } from 'node:test';
import assert from 'node:assert';
import { serializeCtPlanningViewerRestoreCommands, type CtPlanningViewerRestoreCommand } from '../ctPlanningViewerRestore.js';

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
