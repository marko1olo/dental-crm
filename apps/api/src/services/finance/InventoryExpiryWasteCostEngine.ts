import { Decimal } from 'decimal.js';

export interface ExpiryWasteMetrics {
  totalWasteCost: Decimal;
  departmentWaste: Record<string, Decimal>;
  preventableWasteRatio: Decimal;
}

export class InventoryExpiryWasteCostEngine {
  /**
   * Calculates waste costs for expired materials.
   * @param expiredItems List of items marked as expired.
   * @param totalConsumption Cost of total inventory consumed in the same period.
   */
  public static calculateWaste(
    expiredItems: { cost: number; department: string; isPreventable: boolean }[],
    totalConsumption: number
  ): ExpiryWasteMetrics {
    let totalWasteCost = new Decimal(0);
    let departmentWaste: Record<string, Decimal> = {};
    let preventableWasteCost = new Decimal(0);

    for (const item of expiredItems) {
      const cost = new Decimal(item.cost);
      totalWasteCost = totalWasteCost.plus(cost);

      departmentWaste[item.department] = (departmentWaste[item.department] || new Decimal(0)).plus(cost);

      if (item.isPreventable) {
        preventableWasteCost = preventableWasteCost.plus(cost);
      }
    }

    const totalConsumptionDec = new Decimal(totalConsumption);
    const preventableWasteRatio = totalConsumptionDec.isZero()
      ? new Decimal(0)
      : preventableWasteCost.div(totalConsumptionDec).times(100);

    return {
      totalWasteCost,
      departmentWaste,
      preventableWasteRatio,
    };
  }
}
