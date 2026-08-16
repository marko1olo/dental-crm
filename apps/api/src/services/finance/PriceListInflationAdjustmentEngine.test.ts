import { test } from 'node:test';
import assert from 'node:assert';
import { PriceListInflationAdjustmentEngine, PriceListPosition, InflationParams } from './PriceListInflationAdjustmentEngine.js';

test('PriceListInflationAdjustmentEngine adjustment logic', () => {
  const positions: PriceListPosition[] = [
    { id: '1', name: 'Crown', currentPrice: 10000, materialCost: 2000, labCost: 3000 },
  ];
  const params: InflationParams = { materialInflationPercentage: 0.1, labInflationPercentage: 0.1 };
  
  // Total Cost: 5000. Price 10000. Markup = 2x.
  // New Mat Cost: 2200. New Lab Cost: 3300. New Total Cost: 5500.
  // New Target Price: 5500 * 2 = 11000.
  
  const result = PriceListInflationAdjustmentEngine.adjust(positions, params, 500);
  
  const firstAdj = result.adjustments[0]!;
  assert.strictEqual(firstAdj.newPrice, 11000);
  assert.strictEqual(firstAdj.priceDelta, 1000);
});

test('PriceListInflationAdjustmentEngine rounding logic', () => {
  const positions: PriceListPosition[] = [
    { id: '2', name: 'Filling', currentPrice: 5000, materialCost: 1000, labCost: 0 },
  ];
  const params: InflationParams = { materialInflationPercentage: 0.2, labInflationPercentage: 0 };
  
  // Total Cost: 1000. Price: 5000. Markup: 5x.
  // New Mat Cost: 1200. New Total: 1200.
  // New Price: 1200 * 5 = 6000.
  
  const result = PriceListInflationAdjustmentEngine.adjust(positions, params, 500);
  
  const secondAdj = result.adjustments[0]!;
  assert.strictEqual(secondAdj.newPrice, 6000);
});
