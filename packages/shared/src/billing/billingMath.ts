/**
 * packages/shared/src/billing/billingMath.ts
 *
 * DENTE Dental CRM — Strict Integer Kopeck Billing Mathematics & Formatters.
 * Zero floating-point drifts (Mandate 8b, Mandate 8i).
 */

export { calculateCashChange, type CashChangeResult } from "../fiscal/index.js";

export const DEPOSIT_QUICK_PRESETS_RUB: readonly number[] = [
	5000,
	10000,
	20000,
	50000,
	100000,
];

export const CASH_QUICK_BILLS_RUB: readonly number[] = [
	1000,
	2000,
	5000,
	10000,
];

export function rubToKopecksStrict(rub: number): number {
	if (!Number.isFinite(rub)) return 0;
	return Math.round(rub * 100);
}

export function kopecksToRubStrict(kopecks: number): number {
	if (!Number.isFinite(kopecks)) return 0;
	return Math.round(kopecks) / 100;
}

export interface SplitBalancesResult {
	readonly totalDueKop: number;
	readonly totalDueRub: number;
	readonly allocatedKop: number;
	readonly allocatedRub: number;
	readonly remainingKop: number;
	readonly remainingRub: number;
	readonly isFullyPaid: boolean;
	readonly isOverpaid: boolean;
}

export function calculateSplitBalances(
	totalDueRub: number,
	tenders: {
		cashRub?: number | undefined;
		cardRub?: number | undefined;
		sbpRub?: number | undefined;
		depositRub?: number | undefined;
		familyDepositRub?: number | undefined;
	},
): SplitBalancesResult {
	const totalDueKop = rubToKopecksStrict(totalDueRub);

	const cashKop = rubToKopecksStrict(tenders.cashRub ?? 0);
	const cardKop = rubToKopecksStrict(tenders.cardRub ?? 0);
	const sbpKop = rubToKopecksStrict(tenders.sbpRub ?? 0);
	const depositKop = rubToKopecksStrict(tenders.depositRub ?? 0);
	const familyKop = rubToKopecksStrict(tenders.familyDepositRub ?? 0);

	const allocatedKop = cashKop + cardKop + sbpKop + depositKop + familyKop;
	const diffKop = totalDueKop - allocatedKop;

	const remainingKop = Math.max(0, diffKop);
	const remainingRub = kopecksToRubStrict(remainingKop);
	const allocatedRub = kopecksToRubStrict(allocatedKop);

	return {
		totalDueKop,
		totalDueRub,
		allocatedKop,
		allocatedRub,
		remainingKop,
		remainingRub,
		isFullyPaid: diffKop === 0,
		isOverpaid: diffKop < 0,
	};
}

export function formatDisplayCurrency(
	amountRub: number,
	options: { showKopecks?: boolean; suffix?: string } = {},
): string {
	const { showKopecks = false, suffix = " ₽" } = options;
	const clean = Number.isFinite(amountRub) ? amountRub : 0;
	const formatted = clean.toLocaleString("ru-RU", {
		minimumFractionDigits: showKopecks ? 2 : 0,
		maximumFractionDigits: showKopecks ? 2 : 0,
	});
	return `${formatted}${suffix}`;
}
