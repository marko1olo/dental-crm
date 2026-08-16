import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { LabOrderMarginAnalysisEngine } from './LabOrderMarginAnalysisEngine.js';

describe('LabOrderMarginAnalysisEngine', () => {
  it('should correctly calculate high margin order', () => {
    const result = LabOrderMarginAnalysisEngine.analyze(10000, {
      labInvoiceAmount: 3000,
      componentsCost: 1000,
    });

    assert.strictEqual(result.netProfit, 6000);
    assert.strictEqual(result.netMarginPercentage, 0.60);
    assert.strictEqual(result.markupMultiplier, 2.5);
    assert.strictEqual(result.isLowMargin, false);
  });

  it('should detect low margin order', () => {
    const result = LabOrderMarginAnalysisEngine.analyze(5000, {
      labInvoiceAmount: 3000,
      componentsCost: 1000,
    });

    assert.strictEqual(result.netProfit, 1000);
    assert.strictEqual(result.netMarginPercentage, 0.20);
    assert.strictEqual(result.isLowMargin, true);
  });

  it('should handle zero costs', () => {
    const result = LabOrderMarginAnalysisEngine.analyze(1000, {
      labInvoiceAmount: 0,
      componentsCost: 0,
    });

    assert.strictEqual(result.netProfit, 1000);
    assert.strictEqual(result.netMarginPercentage, 1);
    assert.strictEqual(result.isLowMargin, false);
  });
});
