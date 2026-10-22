/**
 * apps/web/src/components/analytics/__tests__/financialAnalyticsAggregation.test.ts
 * Mandate 8b: File <= 120 lines. Zero-mock aggregation, refunds, segmentation.
 */

import assert from "node:assert/strict";
import test from "node:test";
import {
	calculateFinancialAnalytics,
	type RawInvoiceItem,
	type RawPaymentItem,
	type RawVisitFinancialItem,
} from "../financialAnalyticsEngine.js";

test("financialAnalyticsEngine: calculateFinancialAnalytics with full zero-mock aggregation", () => {
	// Empty case
	const empty = calculateFinancialAnalytics({ payments: [], invoices: [], visits: [] });
	assert.equal(empty.isEmpty, true);
	assert.equal(empty.totalRevenueKopecks, 0);
	assert.equal(empty.averageCheckKopecks, 0);

	// Realistic dataset
	const payments: RawPaymentItem[] = [
		{ id: "p-1", amountKopecks: 500000, status: "paid", paymentMethod: "card", isPrimaryPatient: true, patientId: "p1" },
		{ id: "p-2", amountKopecks: 1000000, status: "paid", paymentMethod: "cash", isPrimaryPatient: false, patientId: "p2" },
		{ id: "p-3", amountKopecks: 300000, status: "paid", paymentMethod: "sbp", isPrimaryPatient: false, patientId: "p2" },
		{ id: "p-4", amountKopecks: 200000, status: "refunded", paymentMethod: "card", isPrimaryPatient: false, patientId: "p2" },
		{ id: "p-5", amountKopecks: 400000, status: "cancelled", paymentMethod: "cash" }, // Ignored
		{ id: "p-6", amountKopecks: 500000, status: "pending", paymentMethod: "sbp" },   // Ignored
	];

	const visits: RawVisitFinancialItem[] = [
		{ id: "v-1", status: "completed", patientId: "p1", isPrimaryPatient: true },
		{ id: "v-2", status: "completed", patientId: "p2", isPrimaryPatient: false },
		{ id: "v-3", status: "cancelled", patientId: "p3" }, // Ignored for average check
		{ id: "v-4", status: "no_show", patientId: "p4" },   // Ignored for average check
	];

	const invoices: RawInvoiceItem[] = [
		{ id: "inv-1", totalAmountKopecks: 600000, paidAmountKopecks: 200000, status: "partially_paid", patientId: "p1" },
	];

	const result = calculateFinancialAnalytics({
		payments,
		invoices,
		visits,
		periodLabel: "Октябрь 2026",
	});

	assert.equal(result.isEmpty, false);
	assert.equal(result.periodLabel, "Октябрь 2026");
	// Gross Revenue: p-1 (500k) + p-2 (1M) + p-3 (300k) = 1 800 000
	assert.equal(result.totalRevenueKopecks, 1800000);
	// Refunds: p-4 = 200 000
	assert.equal(result.totalRefundsKopecks, 200000);
	// Net Revenue = 1 800 000 - 200 000 = 1 600 000
	assert.equal(result.netRevenueKopecks, 1600000);
	// Completed visits = 2 (v-1, v-2)
	assert.equal(result.completedVisitsCount, 2);
	// Average check = 1 600 000 / 2 = 800 000 коп (8 000 ₽)
	assert.equal(result.averageCheckKopecks, 800000);

	// Patient Segmentation:
	assert.equal(result.patientSegmentation.primaryRevenueKopecks, 500000);
	assert.equal(result.patientSegmentation.repeatRevenueKopecks, 1300000);
	assert.equal(result.patientSegmentation.primaryPayingPatientsCount, 1);
	assert.equal(result.patientSegmentation.repeatPayingPatientsCount, 1);
	assert.equal(result.patientSegmentation.primaryAverageCheckKopecks, 500000);
	assert.equal(result.patientSegmentation.repeatAverageCheckKopecks, 1300000);

	// Accounts receivable:
	assert.equal(result.accountsReceivable.totalDebtKopecks, 400000);
});
