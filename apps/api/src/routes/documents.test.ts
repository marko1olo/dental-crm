import { test, describe } from 'node:test';
import assert from 'node:assert';
import { findIssuedDuplicateTaxCertificate } from './documents.js';
import type { GeneratedDocument } from '@dental/shared';

describe('findIssuedDuplicateTaxCertificate', () => {
  test('returns null if kind is not duplicate sensitive', () => {
    const document = { kind: 'some_other_kind', taxYear: 2023 } as unknown as GeneratedDocument;
    const result = findIssuedDuplicateTaxCertificate(document);
    assert.strictEqual(result, null);
  });

  test('returns null if taxYear is missing', () => {
    const document = { kind: 'tax_deduction_certificate' } as unknown as GeneratedDocument;
    const result = findIssuedDuplicateTaxCertificate(document);
    assert.strictEqual(result, null);
  });

  test('returns null if targets (scopes, receipt keys, and payment IDs) are empty', () => {
    // If no scopes, keys, or IDs are found by the helper methods,
    // findIssuedDuplicateTaxCertificate early returns null.
    const document = {
      kind: 'tax_deduction_certificate',
      taxYear: 2023,
      payload: {
        taxPaymentSelection: { selectedPaymentIds: [] }
      }
    } as unknown as GeneratedDocument;
    const result = findIssuedDuplicateTaxCertificate(document);
    assert.strictEqual(result, null);
  });
});
