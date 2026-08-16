/**
 * LabOrderMarginAnalysisEngine
 * 
 * Analyzes the financial performance of individual dental laboratory orders.
 */

export interface LabOrderCostBreakdown {
  labInvoiceAmount: number;
  componentsCost: number; // e.g., abutments, screws, transfers
}

export interface LabOrderMarginAnalysis {
  revenue: number; // Price charged to the patient
  totalCost: number;
  netProfit: number;
  netMarginPercentage: number;
  markupMultiplier: number;
  isLowMargin: boolean;
}

export class LabOrderMarginAnalysisEngine {
  private static readonly LOW_MARGIN_THRESHOLD = 0.40;

  /**
   * Calculates margin analysis for a lab order.
   * 
   * @param patientPrice Total amount charged to the patient for the construction.
   * @param costs Cost details including lab invoice and component costs.
   */
  static analyze(patientPrice: number, costs: LabOrderCostBreakdown): LabOrderMarginAnalysis {
    const totalCost = costs.labInvoiceAmount + costs.componentsCost;
    const netProfit = patientPrice - totalCost;
    
    // Percentage margin: (Price - Cost) / Price
    const netMarginPercentage = patientPrice > 0 ? netProfit / patientPrice : 0;
    
    // Markup multiplier: Price / Cost
    const markupMultiplier = totalCost > 0 ? patientPrice / totalCost : 0;
    
    const isLowMargin = netMarginPercentage < this.LOW_MARGIN_THRESHOLD;

    return {
      revenue: patientPrice,
      totalCost,
      netProfit,
      netMarginPercentage,
      markupMultiplier,
      isLowMargin,
    };
  }
}
