import { InventoryExpiryWasteCostEngine } from './InventoryExpiryWasteCostEngine.js';
import { Decimal } from 'decimal.js';
import assert from 'node:assert';
import { describe, it } from 'node:test';

describe('InventoryExpiryWasteCostEngine', () => {
  it('should correctly calculate waste costs', () => {
    const expiredItems = [
      { cost: 100.5, department: 'Therapy', isPreventable: true },
      { cost: 50.25, department: 'Surgery', isPreventable: false },
      { cost: 25.0, department: 'Therapy', isPreventable: true },
    ];
    const totalConsumption = 1000;

    const metrics = InventoryExpiryWasteCostEngine.calculateWaste(expiredItems, totalConsumption);

    assert.strictEqual(metrics.totalWasteCost.toNumber(), 175.75);
    assert.strictEqual(metrics.departmentWaste['Therapy']!.toNumber(), 125.5);
    assert.strictEqual(metrics.departmentWaste['Surgery']!.toNumber(), 50.25);
    assert.strictEqual(metrics.preventableWasteRatio.toNumber(), 12.55);
  });
});
