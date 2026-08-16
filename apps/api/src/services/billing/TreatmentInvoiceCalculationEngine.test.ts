import { test } from 'node:test';
import assert from 'node:assert';
import { TreatmentInvoiceCalculationEngine } from './TreatmentInvoiceCalculationEngine.js';

test('TreatmentInvoiceCalculationEngine.calculateSplit should correctly distribute payments', () => {
  const request = {
    totalAmount: 10000,
    insuranceAmount: 5000,
    loyaltyBonusAmount: 2000,
    prepaidAdvanceAmount: 1000,
  };

  const result = TreatmentInvoiceCalculationEngine.calculateSplit(10000, request);

  assert.strictEqual(result.insurancePaid, 5000);
  assert.strictEqual(result.loyaltyPaid, 2000);
  assert.strictEqual(result.advancePaid, 1000);
  assert.strictEqual(result.patientPaid, 2000);
  assert.strictEqual(result.remainingAmount, 0);
});

test('TreatmentInvoiceCalculationEngine.calculateSplit should handle insufficient funds', () => {
    const request = {
      totalAmount: 10000,
      insuranceAmount: 2000,
      loyaltyBonusAmount: 1000,
      prepaidAdvanceAmount: 500,
    };
  
    const result = TreatmentInvoiceCalculationEngine.calculateSplit(10000, request);
  
    assert.strictEqual(result.insurancePaid, 2000);
    assert.strictEqual(result.loyaltyPaid, 1000);
    assert.strictEqual(result.advancePaid, 500);
    assert.strictEqual(result.patientPaid, 6500);
    assert.strictEqual(result.remainingAmount, 0);
});

test('TreatmentInvoiceCalculationEngine.calculateLineItem should handle discounts and taxes', () => {
    const item = {
        id: '1',
        price: 100,
        quantity: 2,
        discount: 10,
        tax: 20
    };
    
    // 100 * 2 = 200
    // 200 - 10% = 180
    // 180 + 20% = 216
    const result = TreatmentInvoiceCalculationEngine.calculateLineItem(item);
    assert.strictEqual(result, 216);
});
