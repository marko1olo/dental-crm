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
  });
});
