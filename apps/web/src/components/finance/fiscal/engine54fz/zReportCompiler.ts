import { kopecksToRub } from "@dental/shared";
import type { Ffd12ShiftCloseZReportSummary, Ffd12ShiftReceiptRecord } from "./types";
import { compile54FzFiscalTags } from "./mathAndTender";

/**
 * Compiles a daily Z-report (Shift Close) according to 54-FZ FFD 1.2
 * with exact integer kopeck aggregation across cash, electronic, advance, and returns.
 */
export function compile54FzShiftCloseZReport(
	receipts: readonly Ffd12ShiftReceiptRecord[],
	shiftNumber: number = 1,
): Ffd12ShiftCloseZReportSummary {
	let incomeCount = 0;
	let incomeCashKop = 0;
	let incomeElectronicKop = 0;
	let incomeAdvanceKop = 0;

	let incomeReturnCount = 0;
	let incomeReturnCashKop = 0;
	let incomeReturnElectronicKop = 0;
	let incomeReturnAdvanceKop = 0;

	for (const r of receipts) {
		const tags = compile54FzFiscalTags(r.tenders);

		if (r.operationType === "income") {
			incomeCount += 1;
			incomeCashKop += tags.tag1031CashKopecks;
			incomeElectronicKop += tags.tag1081ElectronicKopecks;
			incomeAdvanceKop += tags.tag1215PrepaidKopecks;
		} else if (r.operationType === "income_return") {
			incomeReturnCount += 1;
			incomeReturnCashKop += tags.tag1031CashKopecks;
			incomeReturnElectronicKop += tags.tag1081ElectronicKopecks;
			incomeReturnAdvanceKop += tags.tag1215PrepaidKopecks;
		}
	}

	const incomeTotalKopecks = incomeCashKop + incomeElectronicKop + incomeAdvanceKop;
	const incomeReturnTotalKopecks = incomeReturnCashKop + incomeReturnElectronicKop + incomeReturnAdvanceKop;
	const netRevenueKopecks = Math.max(0, incomeTotalKopecks - incomeReturnTotalKopecks);
	const cashInDrawerKopecks = Math.max(0, incomeCashKop - incomeReturnCashKop);

	return {
		shiftNumber,
		closedAtIso: new Date().toISOString(),
		totalOperationsCount: receipts.length,
		incomeCount,
		incomeTotalRub: kopecksToRub(incomeTotalKopecks),
		incomeTotalKopecks,
		incomeCashRub: kopecksToRub(incomeCashKop),
		incomeCashKopecks: incomeCashKop,
		incomeElectronicRub: kopecksToRub(incomeElectronicKop),
		incomeElectronicKopecks: incomeElectronicKop,
		incomeAdvanceOffsetRub: kopecksToRub(incomeAdvanceKop),
		incomeAdvanceOffsetKopecks: incomeAdvanceKop,
		incomeReturnCount,
		incomeReturnTotalRub: kopecksToRub(incomeReturnTotalKopecks),
		incomeReturnTotalKopecks,
		incomeReturnCashRub: kopecksToRub(incomeReturnCashKop),
		incomeReturnCashKopecks: incomeReturnCashKop,
		incomeReturnElectronicRub: kopecksToRub(incomeReturnElectronicKop),
		incomeReturnElectronicKopecks: incomeReturnElectronicKop,
		incomeReturnAdvanceOffsetRub: kopecksToRub(incomeReturnAdvanceKop),
		incomeReturnAdvanceOffsetKopecks: incomeReturnAdvanceKop,
		netRevenueRub: kopecksToRub(netRevenueKopecks),
		netRevenueKopecks,
		cashInDrawerRub: kopecksToRub(cashInDrawerKopecks),
		cashInDrawerKopecks,
		isBalanced: (incomeTotalKopecks - incomeReturnTotalKopecks) === netRevenueKopecks,
	};
}
