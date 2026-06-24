import { test, describe } from 'node:test';
import assert from 'node:assert';
import { frozenTaxXmlPayments } from '../routes/documents.js';
import type { GeneratedDocument, Payment } from '@dental/shared';

describe('frozenTaxXmlPayments', () => {
  const fallbackPayments: Payment[] = [
    { id: 'payment-1', amountRub: 100 } as Payment,
    { id: 'payment-2', amountRub: 200 } as Payment,
  ];

  test('returns payments from taxXmlSourceSnapshot if it exists', () => {
    const document: GeneratedDocument = {
      taxXmlSourceSnapshot: {
        payments: [
          { id: 'payment-3', amountRub: 300 } as Payment,
        ]
      }
    } as GeneratedDocument;

    const result = frozenTaxXmlPayments(document, fallbackPayments);
    assert.deepStrictEqual(result, document.taxXmlSourceSnapshot?.payments);
  });

  test('returns fallback payments if taxXmlSourceSnapshot is missing', () => {
    const document: GeneratedDocument = {} as GeneratedDocument;

    const result = frozenTaxXmlPayments(document, fallbackPayments);
    assert.deepStrictEqual(result, fallbackPayments);
  });

  test('returns fallback payments if taxXmlSourceSnapshot is present but payments is undefined', () => {
    const document: GeneratedDocument = {
      taxXmlSourceSnapshot: {}
    } as GeneratedDocument;

    const result = frozenTaxXmlPayments(document, fallbackPayments);
    assert.deepStrictEqual(result, fallbackPayments);
  });
});
