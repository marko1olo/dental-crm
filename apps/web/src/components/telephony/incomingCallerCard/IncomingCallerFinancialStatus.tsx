import React from "react";
import { CreditCard, Shield } from "lucide-react";
import type { PatientFinancialSummary } from "../../../store/telephonyTypes";

interface IncomingCallerFinancialStatusProps {
	financialSummary: PatientFinancialSummary;
	isKnownPatient: boolean;
	hasDebt: boolean;
	hasDms: boolean;
}

export const IncomingCallerFinancialStatus: React.FC<IncomingCallerFinancialStatusProps> = ({
	financialSummary,
	isKnownPatient,
	hasDebt,
	hasDms,
}) => {
	return (
		<div className="p-3.5 rounded-xl bg-[var(--paper-subtle,var(--paper-soft,#f8fafc))] border border-[var(--line,#e2e8f0)] space-y-2">
			<div className="flex items-center justify-between">
				<span className="font-bold text-[11px] uppercase tracking-wider text-[var(--muted,#64748b)] flex items-center gap-1.5">
					<CreditCard size={12} className="text-[var(--teal)]" />
					Финансовый статус:
				</span>
				{hasDms && (
					<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 flex items-center gap-1">
						<Shield size={10} className="text-sky-500" />
						ДМС активен
					</span>
				)}
			</div>
			<div className="grid grid-cols-2 gap-2">
				<div className="p-2.5 rounded-lg bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--line,#e2e8f0)]">
					<span className="text-[10px] text-[var(--muted,#64748b)] block">Баланс</span>
					<span
						className={`text-sm font-bold ${
							hasDebt
								? "text-rose-600"
								: (financialSummary.balanceRub || 0) > 0
									? "text-emerald-600"
									: "text-[var(--ink,#0f172a)]"
						}`}
					>
						{hasDebt
							? `-${financialSummary.formattedDebt || `${Math.abs(financialSummary.debtRub || financialSummary.balanceRub || 0)} ₽`}`
							: (financialSummary.formattedBalance || `${financialSummary.balanceRub || 0} ₽`)}
					</span>
				</div>
				<div className="p-2.5 rounded-lg bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--line,#e2e8f0)]">
					<span className="text-[10px] text-[var(--muted,#64748b)] block">Статус договора</span>
					<span className="text-sm font-bold text-[var(--ink,#0f172a)]">
						{isKnownPatient ? "Договор заключен" : "Без договора"}
					</span>
				</div>
			</div>
		</div>
	);
};
