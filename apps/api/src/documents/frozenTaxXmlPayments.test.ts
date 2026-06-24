import { test, describe } from 'node:test';
import assert from 'node:assert';
import { frozenTaxXmlPayments } from '../routes/documents.js';

describe('frozenTaxXmlPayments', () => {
  test('returns payments from taxXmlSourceSnapshot if present', () => {
    const document: any = {
      taxXmlSourceSnapshot: {
        payments: [{ id: 'payment-1' }, { id: 'payment-2' }]
      }
    };
    const fallbackPayments: any[] = [{ id: 'fallback-payment' }];
    const result = frozenTaxXmlPayments(document, fallbackPayments);
    assert.deepStrictEqual(result, [{ id: 'payment-1' }, { id: 'payment-2' }]);
  });

  test('returns fallbackPayments if taxXmlSourceSnapshot is missing', () => {
    const document: any = {};
    const fallbackPayments: any[] = [{ id: 'fallback-payment' }];
    const result = frozenTaxXmlPayments(document, fallbackPayments);
    assert.deepStrictEqual(result, [{ id: 'fallback-payment' }]);
  });

  test('returns fallbackPayments if payments is undefined in taxXmlSourceSnapshot', () => {
    const document: any = {
      taxXmlSourceSnapshot: {}
    };
    const fallbackPayments: any[] = [{ id: 'fallback-payment' }];
    const result = frozenTaxXmlPayments(document, fallbackPayments);
    assert.deepStrictEqual(result, [{ id: 'fallback-payment' }]);
  });

  test('returns empty array from taxXmlSourceSnapshot if it is empty', () => {
    const document: any = {
      taxXmlSourceSnapshot: {
        payments: []
      }
    };
    const fallbackPayments: any[] = [{ id: 'fallback-payment' }];
    const result = frozenTaxXmlPayments(document, fallbackPayments);
    assert.deepStrictEqual(result, []);
  });
});
