import { test, describe, mock, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import { parseDicomSeriesManifest, hasDicomMagic } from './imaging.js';
import type { ImagingSourceKind } from '@dental/shared';

describe('parseDicomSeriesManifest', () => {
  afterEach(() => {
    mock.restoreAll();
  });

  test('returns default preview response when rawText yields no lines', async () => {
    const input = {
      sourceName: 'test-source.zip',
      sourceKind: 'dicom_file' as ImagingSourceKind,
      rawText: '   \n\r\n   '
    };

    const result = await parseDicomSeriesManifest("mock-org", input);

    assert.strictEqual(result.sourceName, 'test-source.zip');
    assert.strictEqual(result.sourceKind, 'dicom_file');
    assert.strictEqual(result.totalRows, 0);
    assert.strictEqual(result.totalSeries, 0);
    assert.strictEqual(result.readySeries, 0);
    assert.strictEqual(result.warningSeries, 0);
    assert.strictEqual(result.blockedSeries, 0);
    assert.deepStrictEqual(result.rows, []);
    assert.deepStrictEqual(result.series, []);
    assert.deepStrictEqual(result.parserNotes, ['Нет строк списка снимков для разбора.']);
  });
});

describe('hasDicomMagic', () => {
  afterEach(() => {
    mock.restoreAll();
  });

  test('returns false when fs.statSync throws an error', () => {
    mock.method(fs, 'statSync', () => {
      throw new Error('Mocked node:fs statSync error');
    });

    const result = hasDicomMagic('dummy-path.dcm');

    assert.strictEqual(result, false);

    const mockStatSync = fs.statSync as any;
    assert.strictEqual(mockStatSync.mock.callCount(), 1);
  });
});
