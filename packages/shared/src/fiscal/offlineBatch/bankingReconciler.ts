/**
 * bankingReconciler.ts — Automatic reconciliation between Banking Registry (Acquiring/SBP) and Fiscal Receipts.
 *
 * Guarantees:
 * 1. Exact kopeck arithmetic without floating-point drift.
 * 2. Separate auditing for Card and SBP channels.
 * 3. Detailed discrepancy detection and unmatched transaction reporting.
 */

import { kopecksToRub, rubToKopecks } from "../kopecksArithmetic.js";
import type {
	BankingReconciliationSummary,
	BankRegistryTransaction,
	ProcessedFiscalReceiptRecord,
} from "./types.js";

export function reconcileWithBankingRegistry(
	fiscalReceipts: readonly ProcessedFiscalReceiptRecord[],
	bankRegistry: readonly BankRegistryTransaction[] | undefined,
): BankingReconciliationSummary {
	if (!bankRegistry || bankRegistry.length === 0) {
		const fiscalElectronicKop = fiscalReceipts.reduce((acc, r) => acc + r.electronicTotalKopecks, 0);
		const fiscalCardKop = fiscalReceipts.reduce((acc, r) => acc + r.cardKopecks, 0);
		const fiscalSbpKop = fiscalReceipts.reduce((acc, r) => acc + r.sbpKopecks, 0);

		return {
			bankTransactionsCount: 0,
			bankTotalKopecks: 0,
			bankTotalRub: 0,
			bankCardKopecks: 0,
			bankCardRub: 0,
			bankSbpKopecks: 0,
			bankSbpRub: 0,
			fiscalElectronicKopecks: fiscalElectronicKop,
			fiscalElectronicRub: kopecksToRub(fiscalElectronicKop),
			fiscalCardKopecks: fiscalCardKop,
			fiscalCardRub: kopecksToRub(fiscalCardKop),
			fiscalSbpKopecks: fiscalSbpKop,
			fiscalSbpRub: kopecksToRub(fiscalSbpKop),
			discrepancyKopecks: -fiscalElectronicKop,
			discrepancyRub: -kopecksToRub(fiscalElectronicKop),
			isMatched: fiscalElectronicKop === 0,
			status: fiscalElectronicKop === 0 ? "reconciled_exact" : "discrepancy_detected",
			summaryText:
				fiscalElectronicKop === 0
					? "Сверка без расхождений: 0.00 ₽ (Безналичных операций не зафиксировано)"
					: `Реестр банка не предоставлен. Фискализировано по безналичному расчету (Тег 1081): ${kopecksToRub(fiscalElectronicKop).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽`,
			unmatchedBankTransactions: [],
			unmatchedFiscalReceipts: fiscalReceipts.filter((r) => r.electronicTotalKopecks > 0),
		};
	}

	let bankCardKop = 0;
	let bankSbpKop = 0;

	for (const t of bankRegistry) {
		const kop = t.amountKopecks !== undefined ? t.amountKopecks : rubToKopecks(t.amountRub);
		if (t.type === "card") {
			bankCardKop += kop;
		} else if (t.type === "sbp") {
			bankSbpKop += kop;
		}
	}

	const bankTotalKop = bankCardKop + bankSbpKop;

	let fiscalCardKop = 0;
	let fiscalSbpKop = 0;

	for (const r of fiscalReceipts) {
		if (r.operationType === "income") {
			fiscalCardKop += r.cardKopecks;
			fiscalSbpKop += r.sbpKopecks;
		} else if (r.operationType === "income_return") {
			fiscalCardKop -= r.cardKopecks;
			fiscalSbpKop -= r.sbpKopecks;
		}
	}

	const fiscalElectronicKop = fiscalCardKop + fiscalSbpKop;
	const discrepancyKop = bankTotalKop - fiscalElectronicKop;
	const isMatched = discrepancyKop === 0;

	const status = isMatched ? "reconciled_exact" : "discrepancy_detected";

	let summaryText: string;
	if (isMatched) {
		summaryText = `Сверка без расхождений: 0.00 ₽ (100% совпадение с банковским реестром на сумму ${kopecksToRub(bankTotalKop).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽)`;
	} else {
		const diffRub = kopecksToRub(discrepancyKop);
		const sign = diffRub > 0 ? "+" : "";
		summaryText = `Обнаружено расхождение: ${sign}${diffRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽ (В реестре банка: ${kopecksToRub(bankTotalKop).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽, по фискальным чекам: ${kopecksToRub(fiscalElectronicKop).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽)`;
	}

	return {
		bankTransactionsCount: bankRegistry.length,
		bankTotalKopecks: bankTotalKop,
		bankTotalRub: kopecksToRub(bankTotalKop),
		bankCardKopecks: bankCardKop,
		bankCardRub: kopecksToRub(bankCardKop),
		bankSbpKopecks: bankSbpKop,
		bankSbpRub: kopecksToRub(bankSbpKop),
		fiscalElectronicKopecks: fiscalElectronicKop,
		fiscalElectronicRub: kopecksToRub(fiscalElectronicKop),
		fiscalCardKopecks: fiscalCardKop,
		fiscalCardRub: kopecksToRub(fiscalCardKop),
		fiscalSbpKopecks: fiscalSbpKop,
		fiscalSbpRub: kopecksToRub(fiscalSbpKop),
		discrepancyKopecks: discrepancyKop,
		discrepancyRub: kopecksToRub(discrepancyKop),
		isMatched,
		status,
		summaryText,
		unmatchedBankTransactions: isMatched ? [] : bankRegistry,
		unmatchedFiscalReceipts: isMatched ? [] : fiscalReceipts.filter((r) => r.electronicTotalKopecks > 0),
	};
}
