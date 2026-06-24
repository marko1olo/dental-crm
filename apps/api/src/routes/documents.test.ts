import { test, describe } from 'node:test';
import assert from 'node:assert';
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
  });

  test('returns true when periodStart is same as periodEnd', () => {
    const payload = { ...basePayload, periodStart: '2023-01-01', periodEnd: '2023-01-01' } as MedicalRecordExtractPayload;
    assert.strictEqual(medicalRecordExtractPeriodIsChronological(payload), true);
  });

  test('returns false when periodStart is after periodEnd', () => {
    const payload = { ...basePayload, periodStart: '2023-12-31', periodEnd: '2023-01-01' } as MedicalRecordExtractPayload;
    assert.strictEqual(medicalRecordExtractPeriodIsChronological(payload), false);
  });

  test('returns true when periodStart is blank', () => {
    const payload = { ...basePayload, periodStart: '', periodEnd: '2023-12-31' } as MedicalRecordExtractPayload;
    assert.strictEqual(medicalRecordExtractPeriodIsChronological(payload), true);
  });

  test('returns true when periodEnd is blank', () => {
    const payload = { ...basePayload, periodStart: '2023-01-01', periodEnd: '' } as MedicalRecordExtractPayload;
    assert.strictEqual(medicalRecordExtractPeriodIsChronological(payload), true);
  });

  test('returns true when both periods are blank', () => {
    const payload = { ...basePayload, periodStart: '', periodEnd: '' } as MedicalRecordExtractPayload;
    assert.strictEqual(medicalRecordExtractPeriodIsChronological(payload), true);
  });

  test('returns false when periodStart is invalid format', () => {
    const payload = { ...basePayload, periodStart: 'invalid', periodEnd: '2023-12-31' } as MedicalRecordExtractPayload;
    assert.strictEqual(medicalRecordExtractPeriodIsChronological(payload), false);
  });

  test('returns false when periodEnd is invalid format', () => {
    const payload = { ...basePayload, periodStart: '2023-01-01', periodEnd: 'invalid' } as MedicalRecordExtractPayload;
    assert.strictEqual(medicalRecordExtractPeriodIsChronological(payload), false);
  });
});
