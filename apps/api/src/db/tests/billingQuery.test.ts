import { test, describe, mock, afterEach } from 'node:test';
import assert from 'node:assert';
import { createPaymentInDb } from '../billingQuery.js';
import { db } from '../client.js';

describe('createPaymentInDb', () => {
  afterEach(() => {
    mock.restoreAll();
  });

  test('successfully creates a payment', async () => {
    const mockDate = new Date('2024-01-01T00:00:00Z');
    const mockPaymentData = {
      id: 'pay-123',
      organizationId: 'org-123',
      patientId: 'pat-123',
      visitId: 'vis-123',
      documentId: 'doc-123',
      amountRub: 1000,
      method: 'card',
      clientMutationId: 'mut-123',
      fiscalReceiptNumber: 'rec-123',
      fiscalReceiptIssuedAt: '2024-01-01',
      fiscalReceiptUrl: 'https://receipt',
      fiscalReceipt: { data: 'receipt' },
      payerFullName: 'John Doe',
      payerInn: '1234567890',
      payerBirthDate: '1990-01-01',
      payerIdentityDocument: 'passport',
      payerRelationship: 'self',
      taxDeductionCode: '1',
      note: 'test payment',
      createdAt: mockDate,
      paidAt: mockDate,
      status: 'paid'
    };

    const insertMock = mock.method(db, 'insert', () => ({
      values: () => ({
        returning: async () => [mockPaymentData]
      })
    }));

    const result = await createPaymentInDb('org-123', {
      patientId: 'pat-123',
      amountRub: 1000,
      method: 'card'
    });

    assert.strictEqual(result.id, 'pay-123');
    assert.strictEqual(insertMock.mock.callCount(), 1);
  });

  test('throws error when returning is empty', async () => {
    mock.method(db, 'insert', () => ({
      values: () => ({
        returning: async () => []
      })
    }));

    await assert.rejects(
      () => createPaymentInDb('org-123', {
        patientId: 'pat-123',
        amountRub: 1000,
        method: 'card'
      }),
      { message: 'Failed to create payment' }
    );
  });
});
