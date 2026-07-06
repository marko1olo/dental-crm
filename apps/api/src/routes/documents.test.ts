import { test, describe } from 'node:test';
import assert from 'node:assert';
import fsPromises from 'node:fs/promises';
import { medicalRecordCopyRequestDatesAreValid, renderIssuedHtmlToPdf } from './documents.js';
import type { MedicalRecordCopyRequestPayload } from '@dental/shared';

describe('renderIssuedHtmlToPdf try-catch fall-through error handling', () => {
  test('returns error when exception is thrown inside the try block', async (t) => {
    // Mock mkdtemp and writeFile to succeed so we enter the try block smoothly and avoid real I/O
    t.mock.method(fsPromises, 'mkdtemp', async () => '/mock/tmp/dir');
    t.mock.method(fsPromises, 'writeFile', async () => {});

    // Mock rm to ensure the finally block does not perform real I/O operations
    t.mock.method(fsPromises, 'rm', async () => {});

    // Since readFile's errors are swallowed by readValidPdfFile, we force an error directly in the try block
    t.mock.method(global, 'setTimeout', () => {
      throw new Error('mocked try block error');
    });

    const result = await renderIssuedHtmlToPdf('<html></html>');

    assert.deepStrictEqual(result, {
      ok: false,
      error: "PDF-экспорт не завершился. Проверьте права на временную папку сервера и браузер для печати документов."
    });
  });
});

describe('medicalRecordCopyRequestDatesAreValid', () => {
  test('returns true when all dates are valid and chronological', () => {
    const payload = {
      periodStart: '2023-01-01',
      periodEnd: '2023-12-31',
      requestedAt: '2024-01-01',
    } as unknown as MedicalRecordCopyRequestPayload;

    assert.strictEqual(medicalRecordCopyRequestDatesAreValid(payload), true);
  });

  test('returns true when periodStart and periodEnd are the same', () => {
    const payload = {
      periodStart: '2023-01-01',
      periodEnd: '2023-01-01',
      requestedAt: '2024-01-01',
    } as unknown as MedicalRecordCopyRequestPayload;

    assert.strictEqual(medicalRecordCopyRequestDatesAreValid(payload), true);
  });

  test('returns true when period dates are blank or undefined', () => {
    const payload1 = {
      requestedAt: '2024-01-01',
    } as unknown as MedicalRecordCopyRequestPayload;

    assert.strictEqual(medicalRecordCopyRequestDatesAreValid(payload1), true);

    const payload2 = {
      periodStart: '',
      periodEnd: '   ',
      requestedAt: '2024-01-01',
    } as unknown as MedicalRecordCopyRequestPayload;

    assert.strictEqual(medicalRecordCopyRequestDatesAreValid(payload2), true);
  });

  test('returns false when period is not chronological', () => {
    const payload = {
      periodStart: '2023-12-31',
      periodEnd: '2023-01-01',
      requestedAt: '2024-01-01',
    } as unknown as MedicalRecordCopyRequestPayload;

    assert.strictEqual(medicalRecordCopyRequestDatesAreValid(payload), false);
  });

  test('returns false when periodStart has invalid format', () => {
    const payload = {
      periodStart: 'invalid-date',
      periodEnd: '2023-12-31',
      requestedAt: '2024-01-01',
    } as unknown as MedicalRecordCopyRequestPayload;

    assert.strictEqual(medicalRecordCopyRequestDatesAreValid(payload), false);
  });

  test('returns false when periodEnd has invalid format', () => {
    const payload = {
      periodStart: '2023-01-01',
      periodEnd: 'not-a-date',
      requestedAt: '2024-01-01',
    } as unknown as MedicalRecordCopyRequestPayload;

    assert.strictEqual(medicalRecordCopyRequestDatesAreValid(payload), false);
  });

  test('returns false when requestedAt has invalid format', () => {
    const payload = {
      periodStart: '2023-01-01',
      periodEnd: '2023-12-31',
      requestedAt: 'bad-date',
    } as unknown as MedicalRecordCopyRequestPayload;

    assert.strictEqual(medicalRecordCopyRequestDatesAreValid(payload), false);
import { frozenTaxXmlClinicProfile } from './documents.js';
import type { GeneratedDocument, ClinicProfile } from '@dental/shared';

describe('frozenTaxXmlClinicProfile', () => {
  const fallbackProfile = {
    id: 'clinic-1',
    name: 'Fallback Clinic',
    inn: '1234567890',
    kpp: '123456789',
    ogrn: '1234567890123',
    address: '123 Main St',
    phone: '555-1234',
    email: 'info@clinic.com',
    licenseNumber: 'LIC-123',
    licenseDate: '2020-01-01',
    licenseIssuer: 'Ministry of Health',
  } as unknown as ClinicProfile;

  const snapshotProfile = {
    id: 'clinic-1',
    name: 'Snapshot Clinic',
    inn: '0987654321',
    kpp: '987654321',
    ogrn: '3210987654321',
    address: '456 Oak St',
    phone: '555-4321',
    email: 'info@snapshot.com',
    licenseNumber: 'LIC-456',
    licenseDate: '2021-01-01',
    licenseIssuer: 'Ministry of Health',
  } as unknown as ClinicProfile;

  test('returns fallback profile if taxXmlSourceSnapshot is missing', () => {
    const document = {
      id: 'doc-1',
      patientId: 'patient-1',
      kind: 'tax_deduction_certificate',
      status: 'draft',
      createdAt: '2023-01-01T00:00:00Z',
    } as unknown as GeneratedDocument;

    const result = frozenTaxXmlClinicProfile(document, fallbackProfile);
    assert.deepStrictEqual(result, fallbackProfile);

  test('returns fallback profile if clinicProfile in taxXmlSourceSnapshot is missing', () => {
    const document = {
      id: 'doc-1',
      patientId: 'patient-1',
      kind: 'tax_deduction_certificate',
      status: 'draft',
      createdAt: '2023-01-01T00:00:00Z',
      taxXmlSourceSnapshot: {}
    } as unknown as GeneratedDocument;

    const result = frozenTaxXmlClinicProfile(document, fallbackProfile);
    assert.deepStrictEqual(result, fallbackProfile);

  test('returns snapshot profile if present in taxXmlSourceSnapshot', () => {
    const document = {
      id: 'doc-1',
      patientId: 'patient-1',
      kind: 'tax_deduction_certificate',
      status: 'draft',
      createdAt: '2023-01-01T00:00:00Z',
      taxXmlSourceSnapshot: {
        clinicProfile: snapshotProfile
      }
    } as unknown as GeneratedDocument;

    const result = frozenTaxXmlClinicProfile(document, fallbackProfile);
    assert.deepStrictEqual(result, snapshotProfile);
import { documentAttachmentFileName } from './documents.js';
import type { GeneratedDocument } from '@dental/shared';

describe('documentAttachmentFileName', () => {
  const mockDocument = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    kind: 'paid-medical-services-contract'

  test('formats correctly with pdf extension', () => {
    const expected = `dente-paid-medical-services-contract-123e4567-e89b-12d3-a456-426614174000.pdf`;
    assert.strictEqual(documentAttachmentFileName(mockDocument, 'pdf'), expected);

  test('formats correctly with html extension', () => {
    const expected = `dente-paid-medical-services-contract-123e4567-e89b-12d3-a456-426614174000.html`;
    assert.strictEqual(documentAttachmentFileName(mockDocument, 'html'), expected);

  test('formats correctly with xml extension', () => {
    const expected = `dente-paid-medical-services-contract-123e4567-e89b-12d3-a456-426614174000.xml`;
    assert.strictEqual(documentAttachmentFileName(mockDocument, 'xml'), expected);
import { documentChainDateRangeIsChronological } from './documents.js';

describe('documentChainDateRangeIsChronological', () => {
  test('returns true for chronological dates', () => {
    assert.strictEqual(documentChainDateRangeIsChronological('2023-01-01', '2023-12-31'), true);
    assert.strictEqual(documentChainDateRangeIsChronological('2023-01-01', '2023-01-02'), true);

  test('returns true for identical dates', () => {
    assert.strictEqual(documentChainDateRangeIsChronological('2023-01-01', '2023-01-01'), true);

  test('returns false for reverse chronological dates', () => {
    assert.strictEqual(documentChainDateRangeIsChronological('2023-12-31', '2023-01-01'), false);
    assert.strictEqual(documentChainDateRangeIsChronological('2023-01-02', '2023-01-01'), false);

  test('returns true when one or both dates are null or undefined', () => {
    assert.strictEqual(documentChainDateRangeIsChronological(null, null), true);
    assert.strictEqual(documentChainDateRangeIsChronological(undefined, undefined), true);
    assert.strictEqual(documentChainDateRangeIsChronological('2023-01-01', null), true);
    assert.strictEqual(documentChainDateRangeIsChronological(null, '2023-01-01'), true);

  test('returns true when one or both dates are empty strings', () => {
    assert.strictEqual(documentChainDateRangeIsChronological('', ''), true);
    assert.strictEqual(documentChainDateRangeIsChronological('  ', '   '), true);
    assert.strictEqual(documentChainDateRangeIsChronological('2023-01-01', ''), true);
    assert.strictEqual(documentChainDateRangeIsChronological('', '2023-01-01'), true);

  test('returns false if start date is invalid format', () => {
    assert.strictEqual(documentChainDateRangeIsChronological('invalid', '2023-01-01'), false);
    assert.strictEqual(documentChainDateRangeIsChronological('2023-13-01', '2023-12-31'), false);
    assert.strictEqual(documentChainDateRangeIsChronological('2023-01-32', '2023-12-31'), false);

  test('returns false if end date is invalid format', () => {
    assert.strictEqual(documentChainDateRangeIsChronological('2023-01-01', 'invalid'), false);
    assert.strictEqual(documentChainDateRangeIsChronological('2023-01-01', '2023-13-01'), false);
    assert.strictEqual(documentChainDateRangeIsChronological('2023-01-01', '2023-01-32'), false);

  test('returns false if both dates are invalid', () => {
    assert.strictEqual(documentChainDateRangeIsChronological('invalid', 'invalid'), false);

  test('handles dates with time correctly by prefix matching', () => {
    assert.strictEqual(documentChainDateRangeIsChronological('2023-01-01T10:00:00Z', '2023-12-31T10:00:00Z'), true);
    assert.strictEqual(documentChainDateRangeIsChronological('2023-12-31T10:00:00Z', '2023-01-01T10:00:00Z'), false);
import { releaseMaterialKindForDelivery } from './documents.js';

describe('releaseMaterialKindForDelivery', () => {
  test('returns "dicom_archive" when deliveryMethod is "dicom_archive"', () => {
    assert.strictEqual(releaseMaterialKindForDelivery('dicom_archive'), 'dicom_archive');
    assert.strictEqual(releaseMaterialKindForDelivery('dicom_archive', ['some_doc']), 'dicom_archive');
    assert.strictEqual(releaseMaterialKindForDelivery('dicom_archive', [], true), 'dicom_archive');

  test('returns "other" when deliveryMethod is "other"', () => {
    assert.strictEqual(releaseMaterialKindForDelivery('other'), 'other');

  test('returns "mixed" when includeDicomSourceData is true', () => {
    assert.strictEqual(releaseMaterialKindForDelivery('secure_link', [], true), 'mixed');
    assert.strictEqual(releaseMaterialKindForDelivery('secure_link', ['some_doc'], true), 'mixed');

  test('returns "mixed" when documentTypes contains DICOM related keywords', () => {
    const dicomKeywords = ['dicom', 'кт', 'cbct', 'сним'];

    for (const keyword of dicomKeywords) {
      assert.strictEqual(releaseMaterialKindForDelivery('secure_link', [keyword]), 'mixed', `Failed for keyword: ${keyword}`);
      assert.strictEqual(releaseMaterialKindForDelivery('secure_link', [`PREFIX_${keyword}_SUFFIX`]), 'mixed', `Failed for keyword: PREFIX_${keyword}_SUFFIX`);
      assert.strictEqual(releaseMaterialKindForDelivery('secure_link', [keyword.toUpperCase()]), 'mixed', `Failed for keyword: ${keyword.toUpperCase()}`);

  test('returns "copy" by default for other delivery methods and non-DICOM docs', () => {
    assert.strictEqual(releaseMaterialKindForDelivery('secure_link'), 'copy');
    assert.strictEqual(releaseMaterialKindForDelivery('secure_link', ['regular_doc']), 'copy');
    assert.strictEqual(releaseMaterialKindForDelivery('secure_link', [], false), 'copy');

  test('evaluates deliveryMethod "other" after DICOM checks', () => {
    // If deliveryMethod is "other", but includeDicomSourceData is true or documentTypes contains DICOM keywords,
    // the function currently returns "mixed" because the "mixed" check happens before the "other" check.
    assert.strictEqual(releaseMaterialKindForDelivery('other', [], true), 'mixed');
    assert.strictEqual(releaseMaterialKindForDelivery('other', ['dicom']), 'mixed');
import { medicalRecordExtractPeriodIsChronological } from './documents.js';
import type { MedicalRecordExtractPayload } from '@dental/shared';

describe('medicalRecordExtractPeriodIsChronological', () => {
  const basePayload = {
    sourceVisitIds: [],
    complaintAndAnamnesis: "",
    objectiveStatus: "",
    diagnosis: "",
    clinicalToothRows: [],
    treatmentProvided: "",
    recommendations: "",
    doctorFullName: "",
    recipientAuthority: "",
    issuedAt: "",
    preparedFromSignedMedicalRecords: true as const,
    thirdPartyDataChecked: true as const
  } as unknown as MedicalRecordExtractPayload;

  test('returns true when periodStart is before periodEnd', () => {
    const payload = { ...basePayload, periodStart: '2023-01-01', periodEnd: '2023-12-31' } as MedicalRecordExtractPayload;
    assert.strictEqual(medicalRecordExtractPeriodIsChronological(payload), true);

  test('returns true when periodStart is same as periodEnd', () => {
    const payload = { ...basePayload, periodStart: '2023-01-01', periodEnd: '2023-01-01' } as MedicalRecordExtractPayload;
    assert.strictEqual(medicalRecordExtractPeriodIsChronological(payload), true);

  test('returns false when periodStart is after periodEnd', () => {
    const payload = { ...basePayload, periodStart: '2023-12-31', periodEnd: '2023-01-01' } as MedicalRecordExtractPayload;
    assert.strictEqual(medicalRecordExtractPeriodIsChronological(payload), false);

  test('returns true when periodStart is blank', () => {
    const payload = { ...basePayload, periodStart: '', periodEnd: '2023-12-31' } as MedicalRecordExtractPayload;
    assert.strictEqual(medicalRecordExtractPeriodIsChronological(payload), true);

  test('returns true when periodEnd is blank', () => {
    const payload = { ...basePayload, periodStart: '2023-01-01', periodEnd: '' } as MedicalRecordExtractPayload;
    assert.strictEqual(medicalRecordExtractPeriodIsChronological(payload), true);

  test('returns true when both periods are blank', () => {
    const payload = { ...basePayload, periodStart: '', periodEnd: '' } as MedicalRecordExtractPayload;
    assert.strictEqual(medicalRecordExtractPeriodIsChronological(payload), true);

  test('returns false when periodStart is invalid format', () => {
    const payload = { ...basePayload, periodStart: 'invalid', periodEnd: '2023-12-31' } as MedicalRecordExtractPayload;
    assert.strictEqual(medicalRecordExtractPeriodIsChronological(payload), false);

  test('returns false when periodEnd is invalid format', () => {
    const payload = { ...basePayload, periodStart: '2023-01-01', periodEnd: 'invalid' } as MedicalRecordExtractPayload;
    assert.strictEqual(medicalRecordExtractPeriodIsChronological(payload), false);

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

  test('returns mixed when includeDicomSourceData is true', () => {
    assert.strictEqual(
      releaseMaterialKindForDelivery('paper', [], true),
      'mixed'
    );
    assert.strictEqual(
      releaseMaterialKindForDelivery('secure_link', ['some_doc'], true),
      'mixed'
    );

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

  test('returns other when deliveryMethod is other', () => {
    assert.strictEqual(
      releaseMaterialKindForDelivery('other'),
      'other'
    );

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
import { normalizedTaxpayerInn } from './documents.js';

describe('normalizedTaxpayerInn', () => {
  test('returns only digits from a string with mixed characters', () => {
    assert.strictEqual(normalizedTaxpayerInn('123-456'), '123456');
    assert.strictEqual(normalizedTaxpayerInn('abc123def456'), '123456');
    assert.strictEqual(normalizedTaxpayerInn('  123 456  '), '123456');

  test('returns empty string for null', () => {
    assert.strictEqual(normalizedTaxpayerInn(null), '');

  test('returns empty string for undefined', () => {
    assert.strictEqual(normalizedTaxpayerInn(undefined), '');

  test('returns empty string for empty string input', () => {
    assert.strictEqual(normalizedTaxpayerInn(''), '');

  test('returns empty string for string with no digits', () => {
    assert.strictEqual(normalizedTaxpayerInn('abcdef'), '');
    assert.strictEqual(normalizedTaxpayerInn('!@#$%^'), '');
    assert.strictEqual(normalizedTaxpayerInn('   '), '');

  test('returns the same string if it contains only digits', () => {
    assert.strictEqual(normalizedTaxpayerInn('1234567890'), '1234567890');
  });
});
