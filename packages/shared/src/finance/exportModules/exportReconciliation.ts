/**
 * exportReconciliation.ts — Acquiring Transaction Reconciliation Engine.
 * Wave 130 & Mandate 8b (<= 120 lines). Exact integer kopecks arithmetic.
 */

import {
	ACQUIRING_PROVIDER_NAMES_RU, acquirerReconciliationSchema, acquirerStatementItemSchema,
	type AcquirerStatementItem, type MatchedTransactionRecord, paymentEntrySchema,
	type PaymentEntry, type ReconciliationOptions, type ReconciliationResult,
} from "./exportTypes.js";
import { format1CDate } from "./export1CXmlFormatter.js";

export function reconcileAcquiringTransactions(
	systemPayments: PaymentEntry[],
	acquirerStatements: AcquirerStatementItem[],
	options?: ReconciliationOptions,
): ReconciliationResult {
	const validPayments = systemPayments.map((p) => paymentEntrySchema.parse(p));
	const validStatements = acquirerStatements.map((s) => acquirerStatementItemSchema.parse(s));
	const usedStatementIds = new Set<string>();
	const matchedRecords: MatchedTransactionRecord[] = [];
	const missingInBankRecords: PaymentEntry[] = [];

	const byRrn = new Map<string, AcquirerStatementItem>();
	const byAuth = new Map<string, AcquirerStatementItem>();
	for (const st of validStatements) {
		if (st.rrn?.trim()) byRrn.set(st.rrn.trim(), st);
		if (st.authCode?.trim()) byAuth.set(st.authCode.trim(), st);
	}

	for (const payment of validPayments) {
		let match: AcquirerStatementItem | undefined;
		if (payment.rrn?.trim()) {
			const cand = byRrn.get(payment.rrn.trim());
			if (cand && !usedStatementIds.has(cand.id)) match = cand;
		}
		if (!match && payment.authCode?.trim()) {
			const cand = byAuth.get(payment.authCode.trim());
			if (cand && !usedStatementIds.has(cand.id)) match = cand;
		}
		if (!match) {
			const payDateStr = format1CDate(payment.date);
			for (const st of validStatements) {
				if (usedStatementIds.has(st.id) || st.grossAmountKopecks !== payment.amountKopecks) continue;
				if (format1CDate(st.date) === payDateStr && (!payment.terminalId || !st.terminalId || payment.terminalId === st.terminalId)) {
					match = st; break;
				}
			}
		}

		if (match) {
			usedStatementIds.add(match.id);
			let expFee = match.feeKopecks;
			if (payment.expectedFeeKopecks != null) expFee = payment.expectedFeeKopecks;
			else if (payment.expectedFeeRatePercent != null) expFee = Math.round((payment.amountKopecks * payment.expectedFeeRatePercent) / 100);
			else if (options?.defaultFeeRatePercent != null) expFee = Math.round((payment.amountKopecks * options.defaultFeeRatePercent) / 100);
			else if (match.feeRatePercent != null) expFee = Math.round((payment.amountKopecks * match.feeRatePercent) / 100);

			const feeDiff = match.feeKopecks - expFee;
			matchedRecords.push({
				systemPaymentId: payment.id, acquirerStatementId: match.id,
				rrn: match.rrn || payment.rrn || null, authCode: match.authCode || payment.authCode || null,
				terminalId: match.terminalId || payment.terminalId || null, date: match.date,
				grossAmountKopecks: match.grossAmountKopecks, actualFeeKopecks: match.feeKopecks,
				expectedFeeKopecks: expFee, feeDiscrepancyKopecks: feeDiff,
				netAmountKopecks: match.netAmountKopecks, hasFeeDiscrepancy: feeDiff !== 0,
				cardMaskOrLast4: match.cardMask || payment.cardLast4 || null,
			});
		} else {
			missingInBankRecords.push(payment);
		}
	}

	const missingInCrmRecords = validStatements.filter((st) => !usedStatementIds.has(st.id));
	const systemTotalKopecks = validPayments.reduce((s, p) => s + p.amountKopecks, 0);
	const acquirerGrossKopecks = validStatements.reduce((s, st) => s + st.grossAmountKopecks, 0);
	const acquirerFeeKopecks = validStatements.reduce((s, st) => s + st.feeKopecks, 0);
	const acquirerNetKopecks = validStatements.reduce((s, st) => s + st.netAmountKopecks, 0);
	const matchedGrossKopecks = matchedRecords.reduce((s, m) => s + m.grossAmountKopecks, 0);
	const feeDiscrepancies = matchedRecords.filter((m) => m.hasFeeDiscrepancy);
	const feeDiscrepancyKopecks = feeDiscrepancies.reduce((s, m) => s + m.feeDiscrepancyKopecks, 0);
	const missingInBankKopecks = missingInBankRecords.reduce((s, p) => s + p.amountKopecks, 0);
	const missingInCrmKopecks = missingInCrmRecords.reduce((s, st) => s + st.grossAmountKopecks, 0);

	const isBalanced = feeDiscrepancies.length === 0 && missingInBankRecords.length === 0 && missingInCrmRecords.length === 0;
	const now = new Date();
	const firstPayment = validPayments[0];
	const lastPayment = validPayments[validPayments.length - 1];

	return acquirerReconciliationSchema.parse({
		reconciliationId: options?.reconciliationId || `recon-${Date.now()}`,
		reconciliationDate: options?.reconciliationDate || format1CDate(now),
		periodFrom: options?.periodFrom || (firstPayment ? format1CDate(firstPayment.date) : format1CDate(now)),
		periodTo: options?.periodTo || (lastPayment ? format1CDate(lastPayment.date) : format1CDate(now)),
		acquirerName: options?.acquirerName || (firstPayment?.acquirerName ? ACQUIRING_PROVIDER_NAMES_RU[firstPayment.acquirerName] : "ПАО Сбербанк"),
		status: isBalanced ? "balanced" : "discrepancies_found",
		summary: {
			systemCount: validPayments.length, systemTotalKopecks, acquirerCount: validStatements.length,
			acquirerGrossKopecks, acquirerFeeKopecks, acquirerNetKopecks, matchedCount: matchedRecords.length,
			matchedGrossKopecks, feeDiscrepancyCount: feeDiscrepancies.length, feeDiscrepancyKopecks,
			missingInBankCount: missingInBankRecords.length, missingInBankKopecks,
			missingInCrmCount: missingInCrmRecords.length, missingInCrmKopecks,
		},
		matchedRecords, missingInBankRecords, missingInCrmRecords,
	});
}
