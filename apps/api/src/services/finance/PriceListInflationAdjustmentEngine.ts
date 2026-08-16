import { Decimal } from 'decimal.js';

export type RoundingPolicy = 50 | 100 | 500;

export interface PriceListPosition {
  id: string;
  name: string;
  currentPrice: number;
  materialCost: number;
  labCost: number;
}

export interface InflationParams {
  materialInflationPercentage: number; // e.g. 0.10 for 10%
  labInflationPercentage: number;      // e.g. 0.15 for 15%
}

export interface AdjustmentResult {
  positionId: string;
  oldPrice: number;
  newPrice: number;
  oldMargin: number;
  newMargin: number;
  priceDelta: number;
  marginDelta: number;
}

export interface BatchAdjustmentResult {
  adjustments: AdjustmentResult[];
  totalRevenueDelta: number;
  averageMarginDelta: number;
}

export class PriceListInflationAdjustmentEngine {
  /**
   * Calculates new prices and delta analysis for a set of price list positions.
   */
  static adjust(
    positions: PriceListPosition[],
    params: InflationParams,
    rounding: RoundingPolicy
  ): BatchAdjustmentResult {
    const matInf = new Decimal(params.materialInflationPercentage);
    const labInf = new Decimal(params.labInflationPercentage);
    const roundBase = new Decimal(rounding);

    const adjustments: AdjustmentResult[] = positions.map((pos) => {
      const oldPrice = new Decimal(pos.currentPrice);
      const matCost = new Decimal(pos.materialCost);
      const labCost = new Decimal(pos.labCost);

      // New costs
      const newMatCost = matCost.mul(new Decimal(1).add(matInf));
      const newLabCost = labCost.mul(new Decimal(1).add(labInf));
      const newTotalCost = newMatCost.add(newLabCost);

      // Current margin
      const oldTotalCost = matCost.add(labCost);
      const oldMargin = oldPrice.minus(oldTotalCost).div(oldPrice);

      // New price: maintaining original margin multiplier (Markup)
      // Markup = Price / Cost
      // New Price = Markup * New Total Cost
      const markup = oldPrice.div(oldTotalCost);
      const rawNewPrice = newTotalCost.mul(markup);

      // Rounding
      // Round to nearest rounding policy
      const newPrice = rawNewPrice.div(roundBase).round().mul(roundBase);

      const newMargin = newPrice.minus(newTotalCost).div(newPrice);

      return {
        positionId: pos.id,
        oldPrice: oldPrice.toNumber(),
        newPrice: newPrice.toNumber(),
        oldMargin: oldMargin.toNumber(),
        newMargin: newMargin.toNumber(),
        priceDelta: newPrice.minus(oldPrice).toNumber(),
        marginDelta: newMargin.minus(oldMargin).toNumber(),
      };
    });

    const totalRevenueDelta = adjustments.reduce((acc, adj) => acc.add(new Decimal(adj.priceDelta)), new Decimal(0)).toNumber();
    const averageMarginDelta = adjustments.reduce((acc, adj) => acc.add(new Decimal(adj.marginDelta)), new Decimal(0)).div(adjustments.length).toNumber();

    return {
      adjustments,
      totalRevenueDelta,
      averageMarginDelta,
    };
  }
}
