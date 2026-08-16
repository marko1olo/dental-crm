import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { PatientInstallmentPlanEngine } from "./PatientInstallmentPlanEngine.js";

describe("PatientInstallmentPlanEngine", () => {
  it("should calculate a valid installment plan", () => {
    const config = {
      totalAmount: 100000,
      initialPaymentPercent: 30,
      months: 10,
    };
    const plan = PatientInstallmentPlanEngine.calculatePlan(config);

    assert.strictEqual(plan.initialPayment, 30000);
    assert.strictEqual(plan.monthlyPayment, 7000);
    assert.strictEqual(plan.schedule.length, 10);
    const firstPayment = plan.schedule[0];
    assert.ok(firstPayment, "Schedule should have at least one payment");
    assert.strictEqual(firstPayment.amount, 7000);
  });

  it("should throw error for low initial payment", () => {
    const config = {
      totalAmount: 100000,
      initialPaymentPercent: 10,
      months: 10,
    };
    assert.throws(() => PatientInstallmentPlanEngine.calculatePlan(config));
  });

  it("should detect overdue payments within grace period", () => {
    const total = 100000;
    const paid = 30000;
    const expected = 37000;
    const lastPaymentDate = new Date();
    lastPaymentDate.setDate(lastPaymentDate.getDate() - 3); // 3 days ago

    const status = PatientInstallmentPlanEngine.checkBalance(total, paid, expected, lastPaymentDate);
    assert.strictEqual(status.overdue, false);
  });

  it("should detect overdue payments exceeding grace period", () => {
    const total = 100000;
    const paid = 30000;
    const expected = 37000;
    const lastPaymentDate = new Date();
    lastPaymentDate.setDate(lastPaymentDate.getDate() - 10); // 10 days ago (5 days grace = 5 days overdue)

    const status = PatientInstallmentPlanEngine.checkBalance(total, paid, expected, lastPaymentDate);
    assert.strictEqual(status.overdue, true);
    assert.strictEqual(status.daysOverdue, 5);
  });
});
