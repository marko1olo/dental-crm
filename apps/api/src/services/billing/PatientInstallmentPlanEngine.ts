import { Decimal } from "decimal.js";

// Setup high precision for financial calculations
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export interface InstallmentPlanConfig {
  totalAmount: number;
  initialPaymentPercent: number; // e.g., 30 for 30%
  months: number; // 3, 6, or 12
}

export interface PaymentSchedule {
  date: Date;
  amount: number;
}

export interface InstallmentPlan {
  totalAmount: number;
  initialPayment: number;
  monthlyPayment: number;
  schedule: PaymentSchedule[];
}

export interface BalanceStatus {
  totalPaid: number;
  remainingBalance: number;
  overdue: boolean;
  daysOverdue: number;
}

export class PatientInstallmentPlanEngine {
  private static MIN_INITIAL_PERCENT = 20;
  private static MAX_INITIAL_PERCENT = 30;
  private static GRACE_PERIOD_DAYS = 5;

  /**
   * Calculates the installment plan.
   * Min down payment is 20-30% of total.
   * Remainder divided into N equal monthly payments.
   */
  public static calculatePlan(config: InstallmentPlanConfig): InstallmentPlan {
    if (config.initialPaymentPercent < this.MIN_INITIAL_PERCENT) {
      throw new Error(`Initial payment must be at least ${this.MIN_INITIAL_PERCENT}%`);
    }

    const totalDec = new Decimal(config.totalAmount);
    const initialPercentDec = new Decimal(config.initialPaymentPercent).div(100);
    
    const initialPayment = totalDec.times(initialPercentDec);
    const remainder = totalDec.minus(initialPayment);
    const monthlyPayment = remainder.div(config.months);

    const schedule: PaymentSchedule[] = [];
    const startDate = new Date();

    for (let i = 1; i <= config.months; i++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i);
      schedule.push({
        date: dueDate,
        amount: monthlyPayment.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
      });
    }

    return {
      totalAmount: totalDec.toNumber(),
      initialPayment: initialPayment.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
      monthlyPayment: monthlyPayment.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
      schedule,
    };
  }

  /**
   * Checks the status of the account.
   */
  public static checkBalance(
    totalAmount: number,
    paidAmount: number,
    expectedPaidUntilNow: number,
    lastPaymentDate?: Date
  ): BalanceStatus {
    const totalDec = new Decimal(totalAmount);
    const paidDec = new Decimal(paidAmount);
    const expectedDec = new Decimal(expectedPaidUntilNow);

    const remainingBalance = totalDec.minus(paidDec);
    const overdue = paidDec.lessThan(expectedDec);
    
    let daysOverdue = 0;
    if (overdue && lastPaymentDate) {
      const today = new Date();
      const diffTime = Math.abs(today.getTime() - lastPaymentDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      daysOverdue = Math.max(0, diffDays - this.GRACE_PERIOD_DAYS);
    }

    return {
      totalPaid: paidDec.toNumber(),
      remainingBalance: remainingBalance.toNumber(),
      overdue: daysOverdue > 0,
      daysOverdue,
    };
  }
}
