import { Decimal } from 'decimal.js';

Decimal.set({ rounding: Decimal.ROUND_HALF_UP, precision: 20 });

export type Currency = 'RUB' | 'USD' | 'EUR' | 'KZT' | 'BYN' | 'AED' | 'CNY';

export interface LockedRate {
  rate: Decimal;
  lockedAt: Date;
}

export class MultiCurrencyBillingEngine {
  calculateAmount(amount: Decimal, rate: Decimal): Decimal {
    return amount.mul(rate);
  }

  formatInvoice(amount: Decimal, currency: Currency, rate: LockedRate): {
    originalAmount: string;
    convertedAmount: string;
    currency: Currency;
    lockedRate: string;
  } {
    const converted = this.calculateAmount(amount, rate.rate);
    return {
      originalAmount: amount.toFixed(2),
      convertedAmount: converted.toFixed(2),
      currency,
      lockedRate: rate.rate.toFixed(4),
    };
  }
}
