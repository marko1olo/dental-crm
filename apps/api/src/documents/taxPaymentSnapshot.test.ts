import { test, describe } from 'node:test';
import assert from 'node:assert';
import { taxPaymentReceiptKey } from './taxPaymentSnapshot.js';

describe('taxPaymentReceiptKey', () => {
  test('returns trimmed fiscalReceiptNumber when it exists', () => {
    const payment = { id: 'payment-1', fiscalReceiptNumber: '  12345  ' };
    assert.strictEqual(taxPaymentReceiptKey(payment), '12345');
  });

  test('returns id when fiscalReceiptNumber is undefined', () => {
    const payment = { id: 'payment-2' };
    assert.strictEqual(taxPaymentReceiptKey(payment), 'payment-2');
  });

  test('returns id when fiscalReceiptNumber is null', () => {
    const payment = { id: 'payment-3', fiscalReceiptNumber: null } as any;
    assert.strictEqual(taxPaymentReceiptKey(payment), 'payment-3');
  });

  test('returns id when fiscalReceiptNumber is empty string', () => {
    const payment = { id: 'payment-4', fiscalReceiptNumber: '' };
    assert.strictEqual(taxPaymentReceiptKey(payment), 'payment-4');
  });

  test('returns id when fiscalReceiptNumber is whitespace only', () => {
    const payment = { id: 'payment-5', fiscalReceiptNumber: '   ' };
    assert.strictEqual(taxPaymentReceiptKey(payment), 'payment-5');
  });
});
