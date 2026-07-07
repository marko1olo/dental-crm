import { test, describe } from 'node:test';
import assert from 'node:assert';
import { frozenTaxXmlPayments } from '../routes/documents.js';
describe('frozenTaxXmlPayments', () => {
    test('returns payments from taxXmlSourceSnapshot if present', () => {
        const document = {
            taxXmlSourceSnapshot: {
                payments: [{ id: 'payment-1' }, { id: 'payment-2' }]
            }
        };
        const fallbackPayments = [{ id: 'fallback-payment' }];
        const result = frozenTaxXmlPayments(document, fallbackPayments);
        assert.deepStrictEqual(result, [{ id: 'payment-1' }, { id: 'payment-2' }]);
    });
    test('returns fallbackPayments if taxXmlSourceSnapshot is missing', () => {
        const document = {};
        const fallbackPayments = [{ id: 'fallback-payment' }];
        const result = frozenTaxXmlPayments(document, fallbackPayments);
        assert.deepStrictEqual(result, [{ id: 'fallback-payment' }]);
    });
    test('returns fallbackPayments if payments is undefined in taxXmlSourceSnapshot', () => {
        const document = {
            taxXmlSourceSnapshot: {}
        };
        const fallbackPayments = [{ id: 'fallback-payment' }];
        const result = frozenTaxXmlPayments(document, fallbackPayments);
        assert.deepStrictEqual(result, [{ id: 'fallback-payment' }]);
    });
    test('returns empty array from taxXmlSourceSnapshot if it is empty', () => {
        const document = {
            taxXmlSourceSnapshot: {
                payments: []
            }
        };
        const fallbackPayments = [{ id: 'fallback-payment' }];
        const result = frozenTaxXmlPayments(document, fallbackPayments);
        assert.deepStrictEqual(result, []);
    });
});
