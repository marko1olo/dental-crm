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
  });
});
