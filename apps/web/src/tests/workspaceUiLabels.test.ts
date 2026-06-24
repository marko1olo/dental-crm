import { test, describe } from 'node:test';
import assert from 'node:assert';
import { paymentFiscalReceiptLabelForUi } from '../workspaceUiLabels.js';

describe('paymentFiscalReceiptLabelForUi', () => {
  test('returns structured format when full fiscalReceipt is provided', () => {
    const result = paymentFiscalReceiptLabelForUi({
      id: '1234567890',
      fiscalReceipt: {
        fn: '111',
        fd: '222',
        fpd: '333'
      }
    } as any);
    assert.strictEqual(result, 'ФН 111; ФД 222; ФПД 333');
  });

  test('returns structured format when partial fiscalReceipt is provided', () => {
    const result = paymentFiscalReceiptLabelForUi({
      id: '1234567890',
      fiscalReceipt: {
        fn: '111',
        fpd: '333'
      }
    } as any);
    assert.strictEqual(result, 'ФН 111; ФПД 333');
  });

  test('falls back to fiscalReceiptNumber if fiscalReceipt is missing', () => {
    const result = paymentFiscalReceiptLabelForUi({
      id: '1234567890',
      fiscalReceiptNumber: '  RECEIPT-123  '
    } as any);
    assert.strictEqual(result, 'RECEIPT-123');
  });

  test('falls back to fiscalReceiptNumber if fiscalReceipt is empty', () => {
    const result = paymentFiscalReceiptLabelForUi({
      id: '1234567890',
      fiscalReceipt: {},
      fiscalReceiptNumber: 'RECEIPT-456'
    } as any);
    assert.strictEqual(result, 'RECEIPT-456');
  });

  test('falls back to truncated id if both fiscalReceipt and fiscalReceiptNumber are missing', () => {
    const result = paymentFiscalReceiptLabelForUi({
      id: 'long-id-1234567890'
    } as any);
    assert.strictEqual(result, 'long-id-');
  });

  test('falls back to truncated id if fiscalReceiptNumber is just whitespace', () => {
    const result = paymentFiscalReceiptLabelForUi({
      id: 'long-id-1234567890',
      fiscalReceiptNumber: '   '
    } as any);
    assert.strictEqual(result, 'long-id-');
  });
});
