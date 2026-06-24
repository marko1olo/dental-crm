import { test, describe, mock, afterEach } from 'node:test';
import assert from 'node:assert';
import { parseDicomSeriesManifest } from './imaging.js';
import type { ImagingSourceKind } from '@dental/shared';

describe('parseDicomSeriesManifest', () => {
  afterEach(() => {
    mock.restoreAll();
  });

  test('returns default preview response when rawText yields no lines', () => {
    const input = {
      sourceName: 'test-source.zip',
      sourceKind: 'dicom_file' as ImagingSourceKind,
      rawText: '   \n\r\n   '
    };

    const result = parseDicomSeriesManifest(input);

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
