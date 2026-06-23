import { test, describe } from 'node:test';
import assert from 'node:assert';
import { releaseSourceSnapshotSha256 } from './documents.js';
import type { GeneratedDocument } from '@dental/shared';

describe('releaseSourceSnapshotSha256', () => {
  const baseDocument: GeneratedDocument = {
    id: 'doc-1',
    organizationId: 'org-1',
    patientId: 'patient-1',
    visitId: 'visit-1',
    kind: 'medical_record_copy_request',
    title: 'Request Copy',
    status: 'draft',
    issuedAt: '2023-05-10T10:00:00Z',
    totalAmountRub: 1500,
    payload: {
      medicalRecordCopyRequest: {
        recipientFullName: 'John Doe',
        recipientAuthority: 'Self',
        requestedFormat: 'paper',
        requestedDocumentTypes: ['medical_record'],
        requestedAt: '2023-05-10T10:00:00Z'
      }
    }
  } as GeneratedDocument;

  test('deterministically generates the same hash for the same document and scope', () => {
    const hash1 = releaseSourceSnapshotSha256(baseDocument, 'test_scope');
    const hash2 = releaseSourceSnapshotSha256(baseDocument, 'test_scope');

    assert.strictEqual(typeof hash1, 'string');
    assert.strictEqual(hash1.length, 64); // SHA256 hex is 64 chars
    assert.strictEqual(hash1, hash2);
  });

  test('generates different hashes for different scopes', () => {
    const hash1 = releaseSourceSnapshotSha256(baseDocument, 'scope_a');
    const hash2 = releaseSourceSnapshotSha256(baseDocument, 'scope_b');

    assert.notStrictEqual(hash1, hash2);
  });

  test('generates different hashes if documentId changes', () => {
    const hash1 = releaseSourceSnapshotSha256(baseDocument, 'test_scope');
    const doc2 = { ...baseDocument, id: 'doc-2' };
    const hash2 = releaseSourceSnapshotSha256(doc2, 'test_scope');

    assert.notStrictEqual(hash1, hash2);
  });

  test('generates different hashes if kind changes', () => {
    const hash1 = releaseSourceSnapshotSha256(baseDocument, 'test_scope');
    const doc2 = { ...baseDocument, kind: 'medical_record_extract' } as GeneratedDocument;
    const hash2 = releaseSourceSnapshotSha256(doc2, 'test_scope');

    assert.notStrictEqual(hash1, hash2);
  });

  test('explicitly maps undefined optional properties to null before hashing', () => {
    // If undefined properties are stripped by JSON.stringify, it might cause issues or inconsistency.
    // The function explicitly uses `?? null`. Let's ensure this is working by providing a document with undefined.

    const docWithUndefined: GeneratedDocument = {
      id: 'doc-1',
      organizationId: 'org-1',
      patientId: 'patient-1',
      visitId: 'visit-1',
      kind: 'medical_record_copy_request',
      title: 'Request Copy',
      status: 'draft',
      issuedAt: undefined,
      totalAmountRub: undefined,
      payload: undefined,
    } as unknown as GeneratedDocument;

    const docWithNull: GeneratedDocument = {
      id: 'doc-1',
      organizationId: 'org-1',
      patientId: 'patient-1',
      visitId: 'visit-1',
      kind: 'medical_record_copy_request',
      title: 'Request Copy',
      status: 'draft',
      issuedAt: null,
      totalAmountRub: null,
      payload: null,
    } as unknown as GeneratedDocument;

    const hashFromUndefined = releaseSourceSnapshotSha256(docWithUndefined, 'test_scope');
    const hashFromNull = releaseSourceSnapshotSha256(docWithNull, 'test_scope');

    // Because the function does `issuedAt: document.issuedAt ?? null`, both should map to the same JSON and same hash
    assert.strictEqual(hashFromUndefined, hashFromNull);
  });
});
