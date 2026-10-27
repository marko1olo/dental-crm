/**
 * reconciliationEngine.ts — Cash Shift Balances & Reconciliation Engine.
 * Mandate 8b: <= 120 lines. Integer kopeck math. Zero float errors.
 */
import { type Kopecks, kopecksToRub, rubToKopecks } from "@dental/shared";
import {
	type CashDenominations,
	type CashDiscrepancyReason,
	CASH_DISCREPANCY_REASON_LABELS,
	type CashShiftOperationRecord,
	type CashShiftTendersBreakdown,
} from "./types";
import type { CashShiftReconciliationResult } from "./reconciliationTypes";

export function calculateDenominationsTotalKopecks(d: CashDenominations): Kopecks {
	const b5000 = (d.b5000 || 0) * 500000;
	const b2000 = (d.b2000 || 0) * 200000;
	const b1000 = (d.b1000 || 0) * 100000;
	const b500 = (d.b500 || 0) * 50000;
	const b200 = (d.b200 || 0) * 20000;
	const b100 = (d.b100 || 0) * 10000;
	const b50 = (d.b50 || 0) * 5000;
	const c10 = (d.c10 || 0) * 1000;
	const c5 = (d.c5 || 0) * 500;
	const c2 = (d.c2 || 0) * 200;
	const c1 = (d.c1 || 0) * 100;
	const coins = Math.max(0, rubToKopecks(d.coinsFractionalRub || 0));
	return (b5000 + b2000 + b1000 + b500 + b200 + b100 + b50 + c10 + c5 + c2 + c1 + coins) as Kopecks;
}

export function calculateDenominationsTotalRub(d: CashDenominations): number {
	return kopecksToRub(calculateDenominationsTotalKopecks(d));
}

export interface CalculateCashShiftBalancesParams {
	readonly shiftNumber: number;
	readonly openedAtIso: string;
	readonly closedAtIso?: string | undefined;
	readonly cashierFullName: string;
	readonly cashierInn?: string | undefined;
	readonly initialChangeFundRub?: number | undefined;
	readonly operations: readonly CashShiftOperationRecord[];
	readonly countedCashRub?: number | undefined;
	readonly denominations?: CashDenominations | undefined;
	readonly retainedChangeFundRub?: number | undefined;
	readonly discrepancyReason?: CashDiscrepancyReason | undefined;
	readonly cashierExplanation?: string | undefined;
}

export function calculateCashShiftBalances(p: CalculateCashShiftBalancesParams): CashShiftReconciliationResult {
	const initialKop = Math.max(0, rubToKopecks(p.initialChangeFundRub || 0)) as Kopecks;
	let [cashInKop, cardInKop, sbpInKop, advInKop] = [0 as Kopecks, 0 as Kopecks, 0 as Kopecks, 0 as Kopecks];
	let [cashRetKop, cardRetKop, sbpRetKop, advRetKop] = [0 as Kopecks, 0 as Kopecks, 0 as Kopecks, 0 as Kopecks];
	let [manualInKop, manualOutKop, receiptsCount, returnsCount] = [0 as Kopecks, 0 as Kopecks, 0, 0];

	for (const op of p.operations) {
		const kop = op.amountKopecks !== undefined ? op.amountKopecks : (rubToKopecks(op.amountRub) as Kopecks);
		if (op.type === "patient_payment") {
			receiptsCount++;
			if (op.tenderType === "card") cardInKop = (cardInKop + kop) as Kopecks;
			else if (op.tenderType === "sbp") sbpInKop = (sbpInKop + kop) as Kopecks;
			else if (op.tenderType === "advance_offset") advInKop = (advInKop + kop) as Kopecks;
			else cashInKop = (cashInKop + kop) as Kopecks;
		} else if (op.type === "patient_refund") {
			returnsCount++;
			if (op.tenderType === "card") cardRetKop = (cardRetKop + kop) as Kopecks;
			else if (op.tenderType === "sbp") sbpRetKop = (sbpRetKop + kop) as Kopecks;
			else if (op.tenderType === "advance_offset") advRetKop = (advRetKop + kop) as Kopecks;
			else cashRetKop = (cashRetKop + kop) as Kopecks;
		} else if (op.type === "cash_in") manualInKop = (manualInKop + kop) as Kopecks;
		else if (op.type === "cash_out" || op.type === "encashment") manualOutKop = (manualOutKop + kop) as Kopecks;
	}

	const totalGrossKop = (cashInKop + cardInKop + sbpInKop + advInKop) as Kopecks;
	const totalRetKop = (cashRetKop + cardRetKop + sbpRetKop + advRetKop) as Kopecks;
	const netRevKop = Math.max(0, totalGrossKop - totalRetKop) as Kopecks;
	const totalInflowKop = (initialKop + cashInKop + manualInKop) as Kopecks;
	const totalOutflowKop = (cashRetKop + manualOutKop) as Kopecks;
	const calcCashInDrawerKop = Math.max(0, totalInflowKop - totalOutflowKop) as Kopecks;

	const countedKop: Kopecks = p.denominations ? calculateDenominationsTotalKopecks(p.denominations)
		: p.countedCashRub !== undefined ? Math.max(0, rubToKopecks(p.countedCashRub)) as Kopecks
		: calcCashInDrawerKop;

	const diffKop = (countedKop - calcCashInDrawerKop) as Kopecks;
	const status: "balanced" | "surplus" | "shortage" = diffKop > 0 ? "surplus" : diffKop < 0 ? "shortage" : "balanced";
	const resolvedReason: CashDiscrepancyReason = status === "balanced" ? "exact_match" : (p.discrepancyReason || "other");
	const retainedKop = Math.min(countedKop, Math.max(0, rubToKopecks(p.retainedChangeFundRub || 0)) as Kopecks);
	const encashmentKop = Math.max(0, countedKop - retainedKop) as Kopecks;

	const closedAtIso = p.closedAtIso || new Date().toISOString();
	const durationMs = Math.max(0, new Date(closedAtIso).getTime() - new Date(p.openedAtIso).getTime());
	const durationMin = Math.floor(durationMs / 60000);
	const shiftDurationFormatted = `${Math.floor(durationMin / 60)} ч ${String(durationMin % 60).padStart(2, "0")} мин`;
	const isShiftDurationExceeded24h = durationMs > 86400000;
	const isShiftDurationWarning20h = durationMs >= 72000000 && !isShiftDurationExceeded24h;
	const hoursRemainingUntil24h = Math.round(Math.max(0, 86400000 - durationMs) / 360000) / 10;

	const tenders: CashShiftTendersBreakdown = {
		cashIncomeRub: kopecksToRub(cashInKop), cashIncomeKopecks: cashInKop,
		cardIncomeRub: kopecksToRub(cardInKop), cardIncomeKopecks: cardInKop,
		sbpIncomeRub: kopecksToRub(sbpInKop), sbpIncomeKopecks: sbpInKop,
		advanceOffsetIncomeRub: kopecksToRub(advInKop), advanceOffsetIncomeKopecks: advInKop,
		totalGrossIncomeRub: kopecksToRub(totalGrossKop), totalGrossIncomeKopecks: totalGrossKop,
		cashReturnRub: kopecksToRub(cashRetKop), cashReturnKopecks: cashRetKop,
		cardReturnRub: kopecksToRub(cardRetKop), cardReturnKopecks: cardRetKop,
		sbpReturnRub: kopecksToRub(sbpRetKop), sbpReturnKopecks: sbpRetKop,
		advanceOffsetReturnRub: kopecksToRub(advRetKop), advanceOffsetReturnKopecks: advRetKop,
		totalReturnsRub: kopecksToRub(totalRetKop), totalReturnsKopecks: totalRetKop,
		netRevenueRub: kopecksToRub(netRevKop), netRevenueKopecks: netRevKop,
	};

	let ftsWarningMessage: string | undefined;
	if (isShiftDurationExceeded24h) {
		ftsWarningMessage = "Смена длится больше 24 часов — печать новых чеков заблокирована до закрытия смены.";
	} else if (isShiftDurationWarning20h) {
		ftsWarningMessage = `Смена длится ${shiftDurationFormatted}. До блокировки ККТ по лимиту 24 ч осталось ${hoursRemainingUntil24h} ч.`;
	}

	return {
		shiftNumber: p.shiftNumber, openedAtIso: p.openedAtIso, closedAtIso,
		cashierFullName: p.cashierFullName, cashierInn: p.cashierInn,
		initialChangeFundRub: kopecksToRub(initialKop), initialChangeFundKopecks: initialKop,
		totalCashInflowRub: kopecksToRub(totalInflowKop), totalCashInflowKopecks: totalInflowKop,
		totalCashOutflowRub: kopecksToRub(totalOutflowKop), totalCashOutflowKopecks: totalOutflowKop,
		calculatedCashInDrawerRub: kopecksToRub(calcCashInDrawerKop), calculatedCashInDrawerKopecks: calcCashInDrawerKop,
		countedCashInDrawerRub: kopecksToRub(countedKop), countedCashInDrawerKopecks: countedKop,
		differenceRub: kopecksToRub(diffKop), differenceKopecks: diffKop,
		status, discrepancyReason: resolvedReason,
		discrepancyReasonLabel: CASH_DISCREPANCY_REASON_LABELS[resolvedReason] || "Расхождение",
		cashierExplanation: p.cashierExplanation, isExplanationRequired: status !== "balanced",
		retainedNextShiftChangeFundRub: kopecksToRub(retainedKop), retainedNextShiftChangeFundKopecks: retainedKop,
		encashmentAmountRub: kopecksToRub(encashmentKop), encashmentAmountKopecks: encashmentKop,
		tenders, totalOperationsCount: p.operations.length, receiptsCount, returnsCount,
		isShiftDurationExceeded24h, isShiftDurationWarning20h,
		shiftDurationHours: Math.round(durationMs / 360000) / 10, shiftDurationFormatted, hoursRemainingUntil24h,
		ftsWarningMessage,
	};
}
