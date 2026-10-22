/**
 * apps/web/src/components/analytics/__tests__/financialAnalyticsReceivables.test.ts
 * Mandate 8b: File <= 120 lines. Zero-mock accounts receivable and debtor aggregation.
 */

import assert from "node:assert/strict";
import test from "node:test";
import {
	calculateAccountsReceivable,
	type RawInvoiceItem,
} from "../financialAnalyticsEngine.js";

test("financialAnalyticsEngine: calculateAccountsReceivable handles empty and filtered invoices", () => {
	const emptyRes = calculateAccountsReceivable([]);
	assert.equal(emptyRes.totalDebtKopecks, 0);
	assert.equal(emptyRes.overdueDebtKopecks, 0);
	assert.equal(emptyRes.openInvoicesCount, 0);
	assert.equal(emptyRes.debtorPatientsCount, 0);
	assert.equal(emptyRes.averageDebtPerPatientKopecks, 0);

	const referenceNow = new Date("2026-10-02T12:00:00Z");

	const invoices: RawInvoiceItem[] = [
		// Draft — should be ignored
		{ id: "inv-1", totalAmountKopecks: 1000000, paidAmountKopecks: 0, status: "draft" },
		// Cancelled — should be ignored
		{ id: "inv-2", totalAmountKopecks: 2000000, paidAmountKopecks: 0, status: "cancelled" },
		// Fully paid — debt is 0
		{ id: "inv-3", totalAmountKopecks: 500000, paidAmountKopecks: 500000, status: "paid" },
		// Partially paid, not overdue (due tomorrow)
		{
			id: "inv-4",
			totalAmountKopecks: 1000000,
			paidAmountKopecks: 400000,
			status: "partially_paid",
			patientId: "pat-1",
			dueDate: new Date("2026-10-03T12:00:00Z"),
		},
		// Unpaid and overdue (due yesterday)
		{
			id: "inv-5",
			totalAmountKopecks: 800000,
			paidAmountKopecks: 0,
			status: "issued",
			patientId: "pat-2",
			dueDate: new Date("2026-10-01T12:00:00Z"),
		},
		// Second unpaid invoice for same patient (pat-1)
		{
			id: "inv-6",
			totalAmountKopecks: 400000,
			paidAmountKopecks: 0,
			status: "issued",
			patientId: "pat-1",
			dueDate: new Date("2026-10-05T12:00:00Z"),
		},
	];

	const res = calculateAccountsReceivable(invoices, referenceNow);
	// Total debt = (1000000 - 400000) + 800000 + 400000 = 1 800 000 коп (18 000 ₽)
	assert.equal(res.totalDebtKopecks, 1800000);
	// Overdue debt: inv-5 only = 800 000 коп
	assert.equal(res.overdueDebtKopecks, 800000);
	// Open invoices count: 3
	assert.equal(res.openInvoicesCount, 3);
	// Debtor patients count: 2 (pat-1, pat-2)
	assert.equal(res.debtorPatientsCount, 2);
	// Average debt per patient: 1 800 000 / 2 = 900 000 коп
	assert.equal(res.averageDebtPerPatientKopecks, 900000);
});
