/**
 * exportTransactionAggregator.ts — Transaction, Invoice & Payment Aggregation Engine.
 * Wave 130 & Mandate 8b (<= 120 lines). Exact integer kopecks arithmetic.
 */

import {
	type BankStatementOrder,
	type BankStatementRegistry,
	bankStatementRegistrySchema,
	type ExportPreview,
	exportPreviewSchema,
	type PaymentEntry,
} from "./exportTypes.js";
import { formatAmount1C } from "./export1CXmlFormatter.js";

export function calculateAggregatedTotalsKopecks(orders: BankStatementOrder[]): {
	totalReceivedKopecks: number;
	totalDeductedKopecks: number;
	netBalanceKopecks: number;
	receiptCount: number;
	expenseCount: number;
} {
	let totalReceivedKopecks = 0;
	let totalDeductedKopecks = 0;
	let receiptCount = 0;
	let expenseCount = 0;

	for (const order of orders) {
		if (order.operationType === "receipt") {
			totalReceivedKopecks += order.amountKopecks;
			receiptCount++;
		} else {
			totalDeductedKopecks += order.amountKopecks;
			expenseCount++;
		}
	}

	return {
		totalReceivedKopecks,
		totalDeductedKopecks,
		netBalanceKopecks: totalReceivedKopecks - totalDeductedKopecks,
		receiptCount,
		expenseCount,
	};
}

export function aggregateTransactionsByPeriod(
	payments: PaymentEntry[],
	options?: { dateFrom?: string; dateTo?: string; acquirerName?: string },
): {
	totalGrossKopecks: number;
	totalExpectedFeeKopecks: number;
	totalNetKopecks: number;
	count: number;
} {
	let totalGrossKopecks = 0;
	let totalExpectedFeeKopecks = 0;
	let count = 0;

	for (const p of payments) {
		if (options?.acquirerName && p.acquirerName !== options.acquirerName) continue;
		if (options?.dateFrom && p.date < options.dateFrom) continue;
		if (options?.dateTo && p.date > options.dateTo) continue;

		totalGrossKopecks += p.amountKopecks;
		const feeKop = p.expectedFeeKopecks ?? Math.round((p.amountKopecks * (p.expectedFeeRatePercent ?? 0)) / 100);
		totalExpectedFeeKopecks += feeKop;
		count++;
	}

	return {
		totalGrossKopecks,
		totalExpectedFeeKopecks,
		totalNetKopecks: totalGrossKopecks - totalExpectedFeeKopecks,
		count,
	};
}

export function buildAccountingExportPreview(registry: BankStatementRegistry): ExportPreview {
	const parsed = bankStatementRegistrySchema.parse(registry);
	let invoiceCount = 0;
	let paymentCount = 0;
	let totalAmountKopecks = 0;
	let totalVatKopecks = 0;

	for (const order of parsed.orders) {
		paymentCount++;
		totalAmountKopecks += order.amountKopecks;
		totalVatKopecks += order.vatAmountKopecks ?? 0;
		if (order.operationType === "receipt") {
			invoiceCount++;
		}
	}

	const totalBaseKopecks = Math.max(0, totalAmountKopecks - totalVatKopecks);
	const sampleOrders = parsed.orders.slice(0, 5).map((o) => ({
		number: o.number,
		date: o.date,
		amountRub: formatAmount1C(o.amountKopecks),
		purpose: o.paymentPurpose,
		payer: o.payerName,
		recipient: o.recipientName,
	}));

	return exportPreviewSchema.parse({
		invoiceCount,
		paymentCount,
		totalBaseKopecks,
		totalVatKopecks,
		totalAmountKopecks,
		sampleOrders,
	});
}
