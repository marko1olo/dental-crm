import { test, describe } from 'node:test';
import assert from 'node:assert';
import { frozenTaxXmlPatient } from '../routes/documents.js';
import type { GeneratedDocument, Patient } from '@dental/shared';

describe('frozenTaxXmlPatient', () => {
  test('returns patient from taxXmlSourceSnapshot if it exists', () => {
    const document: GeneratedDocument = {
      taxXmlSourceSnapshot: {
        patient: { id: 'patient-1', name: 'John Doe' } as unknown as Patient
      }
    } as GeneratedDocument;

    const fallbackPatient: Patient = { id: 'fallback-1', name: 'Fallback Doe' } as unknown as Patient;

    const result = frozenTaxXmlPatient(document, fallbackPatient);
    assert.deepStrictEqual(result, { id: 'patient-1', name: 'John Doe' });
  });

  test('returns fallbackPatient if taxXmlSourceSnapshot is undefined', () => {
    const document: GeneratedDocument = {} as GeneratedDocument;
    const fallbackPatient: Patient = { id: 'fallback-1', name: 'Fallback Doe' } as unknown as Patient;

    const result = frozenTaxXmlPatient(document, fallbackPatient);
    assert.deepStrictEqual(result, fallbackPatient);
  });

  test('returns fallbackPatient if patient in taxXmlSourceSnapshot is undefined', () => {
    const document: GeneratedDocument = {
      taxXmlSourceSnapshot: {}
    } as GeneratedDocument;

    const fallbackPatient: Patient = { id: 'fallback-1', name: 'Fallback Doe' } as unknown as Patient;

    const result = frozenTaxXmlPatient(document, fallbackPatient);
    assert.deepStrictEqual(result, fallbackPatient);
  });
});
