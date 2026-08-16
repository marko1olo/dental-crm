import { test } from 'node:test';
import assert from 'node:assert';
import { Decimal } from 'decimal.js';
import { MultiCurrencyBillingEngine } from './MultiCurrencyBillingEngine.js';

test('MultiCurrencyBillingEngine calculates correctly', () => {
  const engine = new MultiCurrencyBillingEngine();
  const amount = new Decimal('100.00');
  const rate = new Decimal('95.50');
  
  const result = engine.calculateAmount(amount, rate);
  assert.strictEqual(result.toFixed(2), '9550.00');
});

test('MultiCurrencyBillingEngine formats invoice correctly', () => {
  const engine = new MultiCurrencyBillingEngine();
  const amount = new Decimal('100.00');
  const lockedRate = { rate: new Decimal('95.50'), lockedAt: new Date() };
  
  const invoice = engine.formatInvoice(amount, 'RUB', lockedRate);
  assert.strictEqual(invoice.convertedAmount, '9550.00');
});
