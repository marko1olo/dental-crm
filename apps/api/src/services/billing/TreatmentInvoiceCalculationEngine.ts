import { Decimal } from "decimal.js";

// Setup high precision for financial calculations
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export interface InvoiceItem {
  id: string;
  price: number;
  quantity: number;
  discount: number; // Percent 0-100
  tax: number; // Percent 0-100
}

export interface SplitBillingRequest {
  totalAmount: number;
  insuranceAmount: number;
  loyaltyBonusAmount: number;
  prepaidAdvanceAmount: number;
}

export interface SplitBillingResult {
  insurancePaid: number;
  loyaltyPaid: number;
  advancePaid: number;
  patientPaid: number;
  remainingAmount: number;
}

export class TreatmentInvoiceCalculationEngine {
  /**
   * Calculates the split of the total invoice amount based on available payment sources.
   * Ensures strict adherence to order: Insurance -> Loyalty -> Advance -> Patient.
   * Prevents overpayment and ensures balance equals total.
   */
  public static calculateSplit(total: number, request: SplitBillingRequest): SplitBillingResult {
    const totalDec = new Decimal(total);
    const insuranceDec = new Decimal(request.insuranceAmount);
    const loyaltyDec = new Decimal(request.loyaltyBonusAmount);
    const advanceDec = new Decimal(request.prepaidAdvanceAmount);

    let remaining = totalDec;

    // 1. Insurance
    const insurancePaid = Decimal.min(remaining, insuranceDec);
    remaining = remaining.minus(insurancePaid);

    // 2. Loyalty
    const loyaltyPaid = Decimal.min(remaining, loyaltyDec);
    remaining = remaining.minus(loyaltyPaid);

    // 3. Advance
    const advancePaid = Decimal.min(remaining, advanceDec);
    remaining = remaining.minus(advancePaid);

    // 4. Patient (final remainder)
    const patientPaid = remaining;
    remaining = remaining.minus(patientPaid);

    return {
      insurancePaid: insurancePaid.toNumber(),
      loyaltyPaid: loyaltyPaid.toNumber(),
      advancePaid: advancePaid.toNumber(),
      patientPaid: patientPaid.toNumber(),
      remainingAmount: remaining.toNumber(),
    };
  }

  /**
   * Calculates line items including discounts and taxes.
   */
  public static calculateLineItem(item: InvoiceItem): number {
    const price = new Decimal(item.price);
    const qty = new Decimal(item.quantity);
    const discount = new Decimal(item.discount).div(100);
    const tax = new Decimal(item.tax).div(100);

    const base = price.times(qty);
    const discounted = base.minus(base.times(discount));
    const withTax = discounted.plus(discounted.times(tax));

    return withTax.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
  }
}
