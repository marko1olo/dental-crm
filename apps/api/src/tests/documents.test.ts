import { test, describe } from 'node:test';
import assert from 'node:assert';
import { documentHasIssuedArchiveMetadata } from '../routes/documents.js';
import type { GeneratedDocument } from '@dental/shared';

describe('documentHasIssuedArchiveMetadata', () => {
  test('returns true when both issuedSnapshotSha256 and issuedSnapshotCreatedAt are present', () => {
    const document = {
      issuedSnapshotSha256: 'some-hash',
      issuedSnapshotCreatedAt: new Date().toISOString(),
    } as GeneratedDocument;

    assert.strictEqual(documentHasIssuedArchiveMetadata(document), true);
  });

  test('returns false when issuedSnapshotSha256 is missing', () => {
    const document = {
      issuedSnapshotCreatedAt: new Date().toISOString(),
    } as GeneratedDocument;

    assert.strictEqual(documentHasIssuedArchiveMetadata(document), false);
  });

  test('returns false when issuedSnapshotCreatedAt is missing', () => {
    const document = {
      issuedSnapshotSha256: 'some-hash',
    } as GeneratedDocument;

    assert.strictEqual(documentHasIssuedArchiveMetadata(document), false);
  });

  test('returns false when both are missing', () => {
    const document = {} as GeneratedDocument;

    assert.strictEqual(documentHasIssuedArchiveMetadata(document), false);
import { frozenTaxXmlPatient } from '../routes/documents.js';
import type { GeneratedDocument, Patient } from '@dental/shared';

describe('frozenTaxXmlPatient', () => {
  test('returns patient from taxXmlSourceSnapshot if it exists', () => {
    const document: GeneratedDocument = {
      taxXmlSourceSnapshot: {
        patient: { id: 'patient-1', name: 'John Doe' } as unknown as Patient
      }

    const fallbackPatient: Patient = { id: 'fallback-1', name: 'Fallback Doe' } as unknown as Patient;

    const result = frozenTaxXmlPatient(document, fallbackPatient);
    assert.deepStrictEqual(result, { id: 'patient-1', name: 'John Doe' });

  test('returns fallbackPatient if taxXmlSourceSnapshot is undefined', () => {
    const document: GeneratedDocument = {} as GeneratedDocument;
    const fallbackPatient: Patient = { id: 'fallback-1', name: 'Fallback Doe' } as unknown as Patient;

    const result = frozenTaxXmlPatient(document, fallbackPatient);
    assert.deepStrictEqual(result, fallbackPatient);

  test('returns fallbackPatient if patient in taxXmlSourceSnapshot is undefined', () => {
    const document: GeneratedDocument = {
      taxXmlSourceSnapshot: {}

    const fallbackPatient: Patient = { id: 'fallback-1', name: 'Fallback Doe' } as unknown as Patient;

    const result = frozenTaxXmlPatient(document, fallbackPatient);
    assert.deepStrictEqual(result, fallbackPatient);
  });
});
