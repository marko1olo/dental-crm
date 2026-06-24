import { test, describe } from 'node:test';
import assert from 'node:assert';
import { medicalRecordCopyRequestDatesAreValid } from './documents.js';
import type { MedicalRecordCopyRequestPayload } from '@dental/shared';

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
