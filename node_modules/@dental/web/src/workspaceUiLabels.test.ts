import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  paymentTaxYearForUi,
  taxPaymentPayerKeyForUi,
  paymentFiscalReceiptLabelForUi,
  clinicalRuleSummaryForUi,
  completedActContractReferenceForUi,
} from './workspaceUiLabels.js';
import type { Dashboard } from '@dental/shared';

describe('workspaceUiLabels', () => {
  describe('paymentTaxYearForUi', () => {
    it('returns null if no dates are provided', () => {
      assert.equal(paymentTaxYearForUi({} as unknown as Pick<Dashboard["payments"][number], "fiscalReceiptIssuedAt" | "paidAt">), null);
    });

    it('uses fiscalReceiptIssuedAt if provided', () => {
      assert.equal(paymentTaxYearForUi({ fiscalReceiptIssuedAt: '2023-05-01T12:00:00Z' } as unknown as Pick<Dashboard["payments"][number], "fiscalReceiptIssuedAt" | "paidAt">), 2023);
    });

    it('uses paidAt if fiscalReceiptIssuedAt is not provided', () => {
      assert.equal(paymentTaxYearForUi({ paidAt: '2022-11-15T00:00:00Z' } as unknown as Pick<Dashboard["payments"][number], "fiscalReceiptIssuedAt" | "paidAt">), 2022);
    });

    it('prioritizes fiscalReceiptIssuedAt over paidAt', () => {
      assert.equal(
        paymentTaxYearForUi({ fiscalReceiptIssuedAt: '2023-01-01T00:00:00Z', paidAt: '2022-12-31T00:00:00Z' } as unknown as Pick<Dashboard["payments"][number], "fiscalReceiptIssuedAt" | "paidAt">),
        2023
      );
    });

    it('extracts year using regex if standard ISO string', () => {
      assert.equal(paymentTaxYearForUi({ paidAt: '2024-01-01' } as unknown as Pick<Dashboard["payments"][number], "fiscalReceiptIssuedAt" | "paidAt">), 2024);
    });

    it('falls back to Date parsing if regex does not match but date is valid', () => {
      assert.equal(paymentTaxYearForUi({ paidAt: 'May 1, 2021' } as unknown as Pick<Dashboard["payments"][number], "fiscalReceiptIssuedAt" | "paidAt">), 2021);
    });

    it('returns null for invalid date strings', () => {
      assert.equal(paymentTaxYearForUi({ paidAt: 'invalid-date' } as unknown as Pick<Dashboard["payments"][number], "fiscalReceiptIssuedAt" | "paidAt">), null);
    });
  });

  describe('taxPaymentPayerKeyForUi', () => {
    it('returns INN based key if payerInn is provided', () => {
      assert.equal(taxPaymentPayerKeyForUi({ payerInn: '1234567890' } as unknown as Pick<Dashboard["payments"][number], "payerInn" | "payerFullName" | "payerBirthDate" | "payerIdentityDocument" | "payerRelationship">), 'inn:1234567890');
    });

    it('trims payerInn', () => {
      assert.equal(taxPaymentPayerKeyForUi({ payerInn: '  1234567890  ' } as unknown as Pick<Dashboard["payments"][number], "payerInn" | "payerFullName" | "payerBirthDate" | "payerIdentityDocument" | "payerRelationship">), 'inn:1234567890');
    });

    it('returns identity based key if 3 or more identity parts are provided', () => {
      assert.equal(
        taxPaymentPayerKeyForUi({
          payerFullName: 'Иванов Иван',
          payerBirthDate: '1990-01-01',
          payerIdentityDocument: '1234 567890',
        } as unknown as Pick<Dashboard["payments"][number], "payerInn" | "payerFullName" | "payerBirthDate" | "payerIdentityDocument" | "payerRelationship">),
        'identity:иванов иван|1990-01-01|1234 567890'
      );
    });

    it('returns empty string if less than 3 identity parts are provided', () => {
      assert.equal(
        taxPaymentPayerKeyForUi({
          payerFullName: 'Иванов Иван',
          payerBirthDate: '1990-01-01',
        } as unknown as Pick<Dashboard["payments"][number], "payerInn" | "payerFullName" | "payerBirthDate" | "payerIdentityDocument" | "payerRelationship">),
        ''
      );
    });

    it('filters out empty/falsy identity parts', () => {
      assert.equal(
        taxPaymentPayerKeyForUi({
          payerFullName: 'Иванов Иван',
          payerBirthDate: '',
          payerIdentityDocument: '1234',
          payerRelationship: 'self',
        } as unknown as Pick<Dashboard["payments"][number], "payerInn" | "payerFullName" | "payerBirthDate" | "payerIdentityDocument" | "payerRelationship">),
        'identity:иванов иван|1234|self'
      );
    });
  });

  describe('paymentFiscalReceiptLabelForUi', () => {
    it('returns structured label from fiscalReceipt object', () => {
      assert.equal(
        paymentFiscalReceiptLabelForUi({
          id: '1234567890',
          fiscalReceipt: { fn: '111', fd: '222', fpd: '333' } as any,
        } as unknown as Pick<Dashboard["payments"][number], "id" | "fiscalReceiptNumber" | "fiscalReceipt">),
        'ФН 111; ФД 222; ФПД 333'
      );
    });

    it('returns partial structured label from fiscalReceipt object', () => {
      assert.equal(
        paymentFiscalReceiptLabelForUi({
          id: '1234567890',
          fiscalReceipt: { fn: '111', fd: '222' } as any,
        } as unknown as Pick<Dashboard["payments"][number], "id" | "fiscalReceiptNumber" | "fiscalReceipt">),
        'ФН 111; ФД 222'
      );
    });

    it('falls back to fiscalReceiptNumber if no fiscalReceipt object', () => {
      assert.equal(
        paymentFiscalReceiptLabelForUi({
          id: '1234567890',
          fiscalReceiptNumber: 'receipt-123',
        } as unknown as Pick<Dashboard["payments"][number], "id" | "fiscalReceiptNumber" | "fiscalReceipt">),
        'receipt-123'
      );
    });

    it('falls back to id slice if no fiscal info provided', () => {
      assert.equal(
        paymentFiscalReceiptLabelForUi({
          id: 'long-id-1234567890',
        } as unknown as Pick<Dashboard["payments"][number], "id" | "fiscalReceiptNumber" | "fiscalReceipt">),
        'long-id-'
      );
    });
  });

  describe('clinicalRuleSummaryForUi', () => {
    it('calculates summary correctly', () => {
      const evaluations = [
        { resolved: true, missingRequiredServiceIds: [] },
        { resolved: false, severity: 'blocker', missingRequiredServiceIds: ['srv-1'] },
        { resolved: false, severity: 'warning', missingRequiredServiceIds: ['srv-2', 'srv-3'] },
        { resolved: false, severity: 'info', missingRequiredServiceIds: ['srv-2'] },
      ] as unknown as Dashboard["clinicalRuleEvaluations"];

      const summary = clinicalRuleSummaryForUi(evaluations, 5);

      assert.deepEqual(summary, {
        activeRules: 5,
        evaluatedRules: 4,
        unresolved: 3,
        blockers: 1,
        warnings: 1,
        requiredServices: 3, // srv-1, srv-2, srv-3
        coveredRules: 1,
      });
    });

    it('handles empty evaluations', () => {
      const summary = clinicalRuleSummaryForUi([], 2);
      assert.deepEqual(summary, {
        activeRules: 2,
        evaluatedRules: 0,
        unresolved: 0,
        blockers: 0,
        warnings: 0,
        requiredServices: 0,
        coveredRules: 0,
      });
    });
  });

  describe('completedActContractReferenceForUi', () => {
    it('returns title if no chainSummary', () => {
      assert.equal(
        completedActContractReferenceForUi({ title: 'My Act' }),
        'My Act'
      );
    });

    it('returns title if no paidMedicalServicesContract', () => {
      assert.equal(
        completedActContractReferenceForUi({ title: 'My Act', chainSummary: {} as any }),
        'My Act'
      );
    });

    it('returns title if no contractNumber', () => {
      assert.equal(
        completedActContractReferenceForUi({ title: 'My Act', chainSummary: { paidMedicalServicesContract: {} as any } as any }),
        'My Act'
      );
    });

    it('returns contractNumber if contractDate is not provided', () => {
      assert.equal(
        completedActContractReferenceForUi({
          title: 'My Act',
          chainSummary: { paidMedicalServicesContract: { contractNumber: 'CN-123' } as any } as any,
        }),
        'CN-123'
      );
    });

    it('returns formatted string with contractNumber and contractDate', () => {
      assert.equal(
        completedActContractReferenceForUi({
          title: 'My Act',
          chainSummary: { paidMedicalServicesContract: { contractNumber: 'CN-123', contractDate: '2023-05-01' } as any } as any,
        }),
        'CN-123 от 2023-05-01'
      );
    });
  });
});
