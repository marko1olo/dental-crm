import { money } from "../../utils/financeUtils";
import type { PatientFinancialBadge } from "./patientReliabilityTypes";

/**
 * Formats financial status (debt, deposit, zero balance) for quick receptionist badge.
 */
export function formatPatientBalanceBadge(
	rawBalance: number | string | null | undefined,
): PatientFinancialBadge {
	const parsed =
		typeof rawBalance === "string"
			? rawBalance.trim() === ""
				? 0
				: Number(rawBalance)
			: typeof rawBalance === "number"
				? rawBalance
				: 0;

	const balanceRub = Number.isFinite(parsed) ? parsed : 0;
	const formatted = money(balanceRub);
	const absAmount = Math.abs(balanceRub);
	const absFormatted = money(absAmount);

	if (balanceRub < 0) {
		return {
			balanceRub,
			status: "debt",
			label: `Долг: ${absFormatted}`,
			shortLabel: `-${absFormatted}`,
			formattedAmount: absFormatted,
			badgeClass: "bg-rose-500/15 text-rose-800 dark:text-rose-200 border-rose-500/40",
			isDebt: true,
			isDeposit: false,
		};
	}

	if (balanceRub > 0) {
		return {
			balanceRub,
			status: "deposit",
			label: `Депозит: ${formatted}`,
			shortLabel: `+${formatted}`,
			formattedAmount: formatted,
			badgeClass: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-500/40",
			isDebt: false,
			isDeposit: true,
		};
	}

	return {
		balanceRub: 0,
		status: "settled",
		label: "Баланс: 0 ₽",
		shortLabel: "0 ₽",
		formattedAmount: "0 ₽",
		badgeClass: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
		isDebt: false,
		isDeposit: false,
	};
}
