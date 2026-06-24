import { test, describe } from 'node:test';
import assert from 'node:assert';
import { releaseMaterialKindForDelivery } from './documents.js';

describe('releaseMaterialKindForDelivery', () => {
  test('returns "dicom_archive" when deliveryMethod is "dicom_archive"', () => {
    assert.strictEqual(releaseMaterialKindForDelivery('dicom_archive'), 'dicom_archive');
    assert.strictEqual(releaseMaterialKindForDelivery('dicom_archive', ['some_doc']), 'dicom_archive');
    assert.strictEqual(releaseMaterialKindForDelivery('dicom_archive', [], true), 'dicom_archive');
  });

  test('returns "other" when deliveryMethod is "other"', () => {
    assert.strictEqual(releaseMaterialKindForDelivery('other'), 'other');
  });

  test('returns "mixed" when includeDicomSourceData is true', () => {
    assert.strictEqual(releaseMaterialKindForDelivery('secure_link', [], true), 'mixed');
    assert.strictEqual(releaseMaterialKindForDelivery('secure_link', ['some_doc'], true), 'mixed');
  });

  test('returns "mixed" when documentTypes contains DICOM related keywords', () => {
    const dicomKeywords = ['dicom', 'кт', 'cbct', 'сним'];

    for (const keyword of dicomKeywords) {
      assert.strictEqual(releaseMaterialKindForDelivery('secure_link', [keyword]), 'mixed', `Failed for keyword: ${keyword}`);
      assert.strictEqual(releaseMaterialKindForDelivery('secure_link', [`PREFIX_${keyword}_SUFFIX`]), 'mixed', `Failed for keyword: PREFIX_${keyword}_SUFFIX`);
      assert.strictEqual(releaseMaterialKindForDelivery('secure_link', [keyword.toUpperCase()]), 'mixed', `Failed for keyword: ${keyword.toUpperCase()}`);
    }
  });

  test('returns "copy" by default for other delivery methods and non-DICOM docs', () => {
    assert.strictEqual(releaseMaterialKindForDelivery('secure_link'), 'copy');
    assert.strictEqual(releaseMaterialKindForDelivery('secure_link', ['regular_doc']), 'copy');
    assert.strictEqual(releaseMaterialKindForDelivery('secure_link', [], false), 'copy');
  });

  test('evaluates deliveryMethod "other" after DICOM checks', () => {
    // If deliveryMethod is "other", but includeDicomSourceData is true or documentTypes contains DICOM keywords,
    // the function currently returns "mixed" because the "mixed" check happens before the "other" check.
    assert.strictEqual(releaseMaterialKindForDelivery('other', [], true), 'mixed');
    assert.strictEqual(releaseMaterialKindForDelivery('other', ['dicom']), 'mixed');
  });
});
