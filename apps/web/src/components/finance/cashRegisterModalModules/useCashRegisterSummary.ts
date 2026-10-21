import { useMemo } from "react";
import type { Ffd12ShiftCloseZReportSummary } from "../fiscal/fiscal54fzEngine.js";

export interface CashRegisterSummaryParams {
	readonly shiftNumber?: number;
	readonly cashInDrawerRub: number;
	readonly cardSumRub: number;
	readonly sbpSumRub: number;
	readonly advanceOffsetRub: number;
}

export function useCashRegisterSummary(params: CashRegisterSummaryParams) {
	const {
		shiftNumber = 1,
		cashInDrawerRub,
		cardSumRub,
		sbpSumRub,
		advanceOffsetRub,
	} = params;

	const cashInDrawerKopecks = Math.round(cashInDrawerRub * 100);
	const cardKopecks = Math.round(cardSumRub * 100);
	const sbpKopecks = Math.round(sbpSumRub * 100);
	const electronicKopecks = cardKopecks + sbpKopecks;
	const advanceOffsetKopecks = Math.round(advanceOffsetRub * 100);
	const netRevenueKopecks =
		cashInDrawerKopecks + electronicKopecks + advanceOffsetKopecks;
	const netRevenueRub = netRevenueKopecks / 100;
	const acquiringFeeKopecks = Math.round((electronicKopecks * 15) / 1000);
	const netBankDepositKopecks = Math.max(
		0,
		electronicKopecks - acquiringFeeKopecks,
	);
	const acquiringFeeRub = acquiringFeeKopecks / 100;
	const netBankDepositRub = netBankDepositKopecks / 100;

	const reportSummary: Ffd12ShiftCloseZReportSummary = useMemo(
		() => ({
			shiftNumber,
			closedAtIso: new Date().toISOString(),
			totalOperationsCount: 12,
			incomeCount: 10,
			incomeTotalRub: netRevenueRub,
			incomeTotalKopecks: netRevenueKopecks,
			incomeCashRub: cashInDrawerRub,
			incomeCashKopecks: cashInDrawerKopecks,
			incomeElectronicRub: cardSumRub + sbpSumRub,
			incomeElectronicKopecks: electronicKopecks,
			incomeAdvanceOffsetRub: advanceOffsetRub,
			incomeAdvanceOffsetKopecks: advanceOffsetKopecks,
			incomeReturnCount: 0,
			incomeReturnTotalRub: 0,
			incomeReturnTotalKopecks: 0,
			incomeReturnCashRub: 0,
			incomeReturnCashKopecks: 0,
			incomeReturnElectronicRub: 0,
			incomeReturnElectronicKopecks: 0,
			incomeReturnAdvanceOffsetRub: 0,
			incomeReturnAdvanceOffsetKopecks: 0,
			netRevenueRub,
			netRevenueKopecks,
			cashInDrawerRub,
			cashInDrawerKopecks,
			isBalanced: true,
		}),
		[
			shiftNumber,
			netRevenueRub,
			netRevenueKopecks,
			cashInDrawerRub,
			cashInDrawerKopecks,
			cardSumRub,
			sbpSumRub,
			electronicKopecks,
			advanceOffsetRub,
			advanceOffsetKopecks,
		],
	);

	return {
		cashInDrawerKopecks,
		netRevenueKopecks,
		netRevenueRub,
		acquiringFeeRub,
		netBankDepositRub,
		reportSummary,
	};
}
