import React from "react";
import { Wallet } from "lucide-react";
import { money } from "../../../../utils/formatters";

export interface PersonalBalanceCardProps {
	readonly fullName?: string | null | undefined;
	readonly personalBalance: number;
}

export const PersonalBalanceCard: React.FC<PersonalBalanceCardProps> = ({
	fullName,
	personalBalance,
}) => {
	const isPositive = personalBalance > 0;
	const isNegative = personalBalance < 0;

	return (
		<div
			className="p-4 sm:p-5 rounded-2xl bg-[var(--paper-soft)] border border-[var(--glass-border)] shadow-xs flex flex-col justify-between gap-3"
			data-testid="patient-balance-card"
		>
			<div className="flex items-start justify-between gap-2.5">
				<div className="flex items-center gap-3">
					<div className="w-11 h-11 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0 border border-[var(--primary)]/20">
						<Wallet className="w-6 h-6" />
					</div>
					<div>
						<span className="text-xs font-medium text-[var(--ink-muted)] block">
							Личный депозит пациента
						</span>
						<span className="text-xs text-[var(--muted)] block mt-0.5">
							Счёт: {fullName || "Пациент клиники"}
						</span>
					</div>
				</div>

				<span
					className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border shrink-0 ${
						isPositive
							? "bg-[var(--success-soft)] border-[var(--success-line)] text-[var(--success-ink)]"
							: isNegative
								? "bg-[var(--danger-soft)] border-[var(--danger-line)] text-[var(--danger-ink)]"
								: "bg-[var(--paper)] border-[var(--glass-border)] text-[var(--ink-muted)]"
					}`}
				>
					{isPositive ? "Аванс на счёте" : isNegative ? "Задолженность" : "Баланс 0 ₽"}
				</span>
			</div>

			<div className="flex items-baseline gap-2 pt-1">
				<span
					className={`text-2xl sm:text-3xl font-black tracking-tight font-mono ${
						isPositive
							? "text-[var(--success-ink)]"
							: isNegative
								? "text-[var(--danger-ink)]"
								: "text-[var(--ink)]"
					}`}
					data-testid="personal-balance-amount-display"
				>
					{isPositive ? "+" : ""}
					{money(personalBalance)}
				</span>
				<span className="text-xs text-[var(--muted)] font-medium">
					(доступно для списания)
				</span>
			</div>

			<p className="text-[11px] text-[var(--muted)] m-0 leading-normal border-t border-[var(--glass-border)] pt-2.5">
				Авансовые средства списываются на приёме мгновенно без ожидания банковских авторизаций.
			</p>
		</div>
	);
};
