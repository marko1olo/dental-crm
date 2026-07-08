import { test, describe, mock, afterEach } from 'node:test';
import assert from 'node:assert';
import { findPaymentByClientMutationIdInDb } from './billingQuery.js';
import { db } from './client.js';

describe('billingQuery', () => {
  afterEach(() => {
    mock.restoreAll();
  });

  describe('findPaymentByClientMutationIdInDb', () => {
    test('returns null if clientMutationId is missing', async () => {
      const result = await findPaymentByClientMutationIdInDb('org-1', null);
      assert.strictEqual(result, null);
    });

    test('returns null if payment not found', async (t) => {
      t.mock.method(db, 'select', () => ({
        from: () => ({
          where: () => ({
            limit: async () => []
          })
        })
      }));
      const result = await findPaymentByClientMutationIdInDb('org-1', 'mutation-1');
      assert.strictEqual(result, null);
    });

    test('returns mapped payment if found', async (t) => {
      const mockDbPayment = {
        id: 'payment-1',
        organizationId: 'org-1',
        patientId: 'patient-1',
        visitId: 'visit-1',
        documentId: 'doc-1',
        amountRub: 100,
        method: 'card',
        clientMutationId: 'mutation-1',
        fiscalReceiptNumber: '123',
        fiscalReceiptIssuedAt: '2023-01-01T00:00:00.000Z',
        fiscalReceiptUrl: 'http://example.com/receipt',
        fiscalReceipt: { raw: 'data' },
        payerFullName: 'John Doe',
        payerInn: '1234567890',
        payerBirthDate: '1990-01-01',
        payerIdentityDocument: 'Passport',
        payerRelationship: 'self',
        taxDeductionCode: '01',
        note: 'note',
        createdAt: new Date('2023-01-01T00:00:00.000Z'),
        paidAt: new Date('2023-01-01T00:00:00.000Z'),
        status: 'paid'
      };

      t.mock.method(db, 'select', () => ({
        from: () => ({
          where: () => ({
            limit: async () => [mockDbPayment]
          })
        })
      }));

      const result = await findPaymentByClientMutationIdInDb('org-1', 'mutation-1');
      assert.deepStrictEqual(result, {
        ...mockDbPayment,
        createdAt: mockDbPayment.createdAt.toISOString(),
        paidAt: mockDbPayment.paidAt.toISOString(),
      });
    });
  });
});
