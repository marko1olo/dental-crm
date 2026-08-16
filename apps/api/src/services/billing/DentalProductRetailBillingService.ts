import { Decimal } from "decimal.js";

// Setup high precision for financial calculations
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export type VatRate = "0%" | "20%";

export interface BillingItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  type: "service" | "product";
}

export interface FiscalItem {
  name: string;
  price: number;
  quantity: number;
  vatRate: VatRate;
  total: number;
  vatAmount: number;
}

export interface FiscalReceipt {
  items: FiscalItem[];
  totalAmount: number;
  totalVatAmount: number;
}

export class DentalProductRetailBillingService {
  /**
   * Processes items and separates them into fiscal structure based on VAT rules.
   * - Services: 0% VAT
   * - Products: 20% VAT
   */
  public static processReceipt(items: BillingItem[]): FiscalReceipt {
    const fiscalItems: FiscalItem[] = [];
    let totalAmount = new Decimal(0);
    let totalVatAmount = new Decimal(0);

    for (const item of items) {
      const price = new Decimal(item.price);
      const quantity = new Decimal(item.quantity);
      const total = price.times(quantity);
      const isProduct = item.type === "product";
      const vatRate: VatRate = isProduct ? "20%" : "0%";
      
      // DENTE practice typically assumes price is gross total per unit.
      // 20% VAT = Price * 20/120 = Price / 6
      const vatAmount = isProduct 
        ? total.times(20).div(120).toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
        : new Decimal(0);

      fiscalItems.push({
        name: item.name,
        price: price.toNumber(),
        quantity: item.quantity,
        vatRate,
        total: total.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
        vatAmount: vatAmount.toNumber(),
      });

      totalAmount = totalAmount.plus(total);
      totalVatAmount = totalVatAmount.plus(vatAmount);
    }

    return {
      items: fiscalItems,
      totalAmount: totalAmount.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
      totalVatAmount: totalVatAmount.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
    };
  }
}
