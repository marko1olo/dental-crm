import { test, describe } from 'node:test';
import assert from 'node:assert';
import { documentAttachmentFileName } from './documents.js';
import type { GeneratedDocument } from '@dental/shared';

describe('documentAttachmentFileName', () => {
  const mockDocument = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    kind: 'paid-medical-services-contract'
  } as unknown as GeneratedDocument;

  test('formats correctly with pdf extension', () => {
    const expected = `dente-paid-medical-services-contract-123e4567-e89b-12d3-a456-426614174000.pdf`;
    assert.strictEqual(documentAttachmentFileName(mockDocument, 'pdf'), expected);
  });

  test('formats correctly with html extension', () => {
    const expected = `dente-paid-medical-services-contract-123e4567-e89b-12d3-a456-426614174000.html`;
    assert.strictEqual(documentAttachmentFileName(mockDocument, 'html'), expected);
  });

  test('formats correctly with xml extension', () => {
    const expected = `dente-paid-medical-services-contract-123e4567-e89b-12d3-a456-426614174000.xml`;
    assert.strictEqual(documentAttachmentFileName(mockDocument, 'xml'), expected);
  });
});
