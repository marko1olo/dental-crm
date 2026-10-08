/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DENTE Dental CRM — Patient Financial Balance in Integer Kopecks (Layer 1)
 *
 * Patient Financial State in Exact Integer Kopecks:
 * - Deposit balance (positive advance deposit or negative patient debt)
 * - Today's rendered services total (kopecks)
 * - Paid today total (kopecks)
 * - Remaining due today (kopecks)
 * - Shared family wallet balance (kopecks)
 * - Effective available funds (deposit + family wallet)
 * - Exact debt calculation and Russian typography formatting
 * - Zero float drift guarantee (Mandate 8a)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { z } from "zod";
import type { Kopecks } from "../../utils/money.js";
import { formatKopecksRu } from "../../utils/money.js";

export const patientFinancialBalanceSchema = z.object({
	patientId: z.string().min(1),
	depositBalanceKop: z.number().int(),
	todayServicesTotalKop: z.number().int().min(0),
	todayPaidTotalKop: z.number().int().min(0),
	todayRemainingDueKop: z.number().int().min(0),
	familyWalletBalanceKop: z.number().int().min(0).default(0),
	effectiveAvailableFundsKop: z.number().int(),
	hasDebt: z.boolean(),
	debtAmountKop: z.number().int().min(0),
	formattedDeposit: z.string(),
	formattedRemainingDue: z.string(),
	formattedEffectiveFunds: z.string(),
	canCoverTodayServices: z.boolean(),
});
export type PatientFinancialBalance = z.infer<typeof patientFinancialBalanceSchema>;

/**
 * Calculates patient financial balance with integer kopecks precision.
 * Guarantees zero float drift and proper deposit / family wallet aggregation.
 */
export function calculatePatientShiftBalance(params: {
	patientId: string;
	depositBalanceKop: Kopecks;
	todayServicesTotalKop: Kopecks;
	todayPaidTotalKop: Kopecks;
	familyWalletBalanceKop?: Kopecks;
}): PatientFinancialBalance {
	const depositKop = Math.round(params.depositBalanceKop || 0);
	const servicesTotalKop = Math.max(0, Math.round(params.todayServicesTotalKop || 0));
	const paidTotalKop = Math.max(0, Math.round(params.todayPaidTotalKop || 0));
	const familyKop = Math.max(0, Math.round(params.familyWalletBalanceKop || 0));

	const todayRemainingDueKop = Math.max(0, servicesTotalKop - paidTotalKop);
	const effectiveAvailableFundsKop = depositKop + familyKop;

	const hasDebt = depositKop < 0 || todayRemainingDueKop > effectiveAvailableFundsKop;
	const debtAmountKop = Math.max(
		0,
		todayRemainingDueKop - effectiveAvailableFundsKop,
		depositKop < 0 ? Math.abs(depositKop) : 0,
	);

	const canCoverTodayServices = effectiveAvailableFundsKop >= todayRemainingDueKop;

	return {
		patientId: params.patientId,
		depositBalanceKop: depositKop,
		todayServicesTotalKop: servicesTotalKop,
		todayPaidTotalKop: paidTotalKop,
		todayRemainingDueKop,
		familyWalletBalanceKop: familyKop,
		effectiveAvailableFundsKop,
		hasDebt,
		debtAmountKop,
		formattedDeposit: formatKopecksRu(depositKop),
		formattedRemainingDue: formatKopecksRu(todayRemainingDueKop),
		formattedEffectiveFunds: formatKopecksRu(effectiveAvailableFundsKop),
		canCoverTodayServices,
	};
}
