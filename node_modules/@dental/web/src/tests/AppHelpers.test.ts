import { test, describe } from 'node:test';
import assert from 'node:assert';
import { classifyBrowserImagingFileName } from '../AppHelpers.js';

describe('classifyBrowserImagingFileName', () => {
  test('returns "dicom" for dicom files', () => {
    assert.strictEqual(classifyBrowserImagingFileName('scan.dcm'), 'dicom');
  });

  test('returns "archive" for archive files', () => {
    assert.strictEqual(classifyBrowserImagingFileName('scans.zip'), 'archive');
  });

  test('returns "model" for 3D model files', () => {
    assert.strictEqual(classifyBrowserImagingFileName('jaw.stl'), 'model');
    assert.strictEqual(classifyBrowserImagingFileName('jaw.obj'), 'model');
    assert.strictEqual(classifyBrowserImagingFileName('jaw.ply'), 'model');
  });

  test('returns "image" for image files', () => {
    assert.strictEqual(classifyBrowserImagingFileName('photo.jpg'), 'image');
    assert.strictEqual(classifyBrowserImagingFileName('photo.jpeg'), 'image');
    assert.strictEqual(classifyBrowserImagingFileName('photo.png'), 'image');
  });

  test('returns "other" for unmatched extensions or no extensions', () => {
    assert.strictEqual(classifyBrowserImagingFileName('document.pdf'), 'other');
    assert.strictEqual(classifyBrowserImagingFileName('notes.txt'), 'other');
    assert.strictEqual(classifyBrowserImagingFileName('data.csv'), 'other');
    assert.strictEqual(classifyBrowserImagingFileName('no_extension_file'), 'other');
    assert.strictEqual(classifyBrowserImagingFileName('.hidden_file'), 'other');
    assert.strictEqual(classifyBrowserImagingFileName(''), 'other');
  });

  test('handles case insensitivity correctly', () => {
    assert.strictEqual(classifyBrowserImagingFileName('SCAN.DCM'), 'dicom');
    assert.strictEqual(classifyBrowserImagingFileName('scans.ZIP'), 'archive');
    assert.strictEqual(classifyBrowserImagingFileName('JAW.STL'), 'model');
    assert.strictEqual(classifyBrowserImagingFileName('PHOTO.PNG'), 'image');
  });

  test('handles filenames with multiple dots correctly', () => {
    assert.strictEqual(classifyBrowserImagingFileName('scan.001.dcm'), 'dicom');
    assert.strictEqual(classifyBrowserImagingFileName('archive.tar.gz'), 'other');
    assert.strictEqual(classifyBrowserImagingFileName('model.final.v2.obj'), 'model');
    assert.strictEqual(classifyBrowserImagingFileName('photo.edited.jpg'), 'image');
  });
});
