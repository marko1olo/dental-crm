import { test, describe } from 'node:test';
import assert from 'node:assert';
import { releaseMaterialKindForDelivery } from './documents.js';

describe('releaseMaterialKindForDelivery', () => {
  test('returns dicom_archive when deliveryMethod is dicom_archive', () => {
    assert.strictEqual(
      releaseMaterialKindForDelivery('dicom_archive'),
      'dicom_archive'
    );
    // Should return dicom_archive even if we pass types that would otherwise trigger "mixed"
    assert.strictEqual(
      releaseMaterialKindForDelivery('dicom_archive', ['dicom']),
      'dicom_archive'
    );
  });

  test('returns mixed when includeDicomSourceData is true', () => {
    assert.strictEqual(
      releaseMaterialKindForDelivery('paper', [], true),
      'mixed'
    );
    assert.strictEqual(
      releaseMaterialKindForDelivery('secure_link', ['some_doc'], true),
      'mixed'
    );
  });

  test('returns mixed when documentTypes contains dicom-related keywords', () => {
    // English 'dicom'
    assert.strictEqual(
      releaseMaterialKindForDelivery('paper', ['DICOM image']),
      'mixed'
    );
    assert.strictEqual(
      releaseMaterialKindForDelivery('paper', ['X-Ray dicom file']),
      'mixed'
    );

    // Russian 'кт'
    assert.strictEqual(
      releaseMaterialKindForDelivery('paper', ['КТ челюсти']),
      'mixed'
    );

    // English 'cbct'
    assert.strictEqual(
      releaseMaterialKindForDelivery('paper', ['cbct scan']),
      'mixed'
    );

    // Russian 'сним'
    assert.strictEqual(
      releaseMaterialKindForDelivery('paper', ['рентгеновский снимок']),
      'mixed'
    );
    assert.strictEqual(
      releaseMaterialKindForDelivery('paper', ['Снимки зубов']),
      'mixed'
    );
  });

  test('returns other when deliveryMethod is other', () => {
    assert.strictEqual(
      releaseMaterialKindForDelivery('other'),
      'other'
    );
  });

  test('returns copy by default for other delivery methods without dicom data', () => {
    assert.strictEqual(
      releaseMaterialKindForDelivery('paper'),
      'copy'
    );
    assert.strictEqual(
      releaseMaterialKindForDelivery('pdf'),
      'copy'
    );
    assert.strictEqual(
      releaseMaterialKindForDelivery('physical_media'),
      'copy'
    );
    assert.strictEqual(
      releaseMaterialKindForDelivery('secure_link'),
      'copy'
    );
    assert.strictEqual(
      releaseMaterialKindForDelivery('paper', ['contract', 'invoice']),
      'copy'
    );
  });
});
