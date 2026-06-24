import { test, describe } from 'node:test';
import assert from 'node:assert';
import { paymentFiscalReceiptLabelForUi } from './workspaceUiLabels.js';

describe('paymentFiscalReceiptLabelForUi', () => {
  test('returns structured receipt string when all fiscal details are present', () => {
    const payment = {
      id: '1234567890',
      fiscalReceiptNumber: 'receipt-123',
      fiscalReceipt: {
        fn: '1111',
        fd: '2222',
        fpd: '3333'
      }
    };
    assert.strictEqual(paymentFiscalReceiptLabelForUi(payment as any), 'ФН 1111; ФД 2222; ФПД 3333');
  });

  test('returns structured receipt string when some fiscal details are present', () => {
    const payment = {
      id: '1234567890',
      fiscalReceiptNumber: 'receipt-123',
      fiscalReceipt: {
        fn: '1111',
        fpd: '3333'
      }
    };
    assert.strictEqual(paymentFiscalReceiptLabelForUi(payment as any), 'ФН 1111; ФПД 3333');
  });

  test('returns fiscalReceiptNumber when fiscal details are missing but fiscalReceiptNumber is present', () => {
    const payment = {
      id: '1234567890',
      fiscalReceiptNumber: 'receipt-123',
      fiscalReceipt: null
    };
    assert.strictEqual(paymentFiscalReceiptLabelForUi(payment as any), 'receipt-123');
  });

  test('returns fiscalReceiptNumber trimmed when fiscal details are missing', () => {
    const payment = {
      id: '1234567890',
      fiscalReceiptNumber: '  receipt-123  ',
      fiscalReceipt: null
    };
    assert.strictEqual(paymentFiscalReceiptLabelForUi(payment as any), 'receipt-123');
  });

  test('returns first 8 characters of id when fiscal details and fiscalReceiptNumber are missing', () => {
    const payment = {
      id: '1234567890abcdef',
      fiscalReceiptNumber: null,
      fiscalReceipt: null
    };
    assert.strictEqual(paymentFiscalReceiptLabelForUi(payment as any), '12345678');
  });

  test('returns first 8 characters of id when fiscalReceiptNumber is an empty string after trim', () => {
    const payment = {
      id: '1234567890abcdef',
      fiscalReceiptNumber: '   ',
      fiscalReceipt: null
    };
    assert.strictEqual(paymentFiscalReceiptLabelForUi(payment as any), '12345678');
  });
});
