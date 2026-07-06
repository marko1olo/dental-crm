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
  });
});
