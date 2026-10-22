import React from "react";
import { Users } from "lucide-react";

export interface FamilyBalanceCardProps {
	readonly familyGroupName?: string | null | undefined;
	readonly familyBalance: number;
}

export const FamilyBalanceCard: React.FC<FamilyBalanceCardProps> = ({
	familyGroupName,
	familyBalance,
}) => {
	return (
		<div
			className="p-4 sm:p-5 rounded-2xl bg-[var(--paper-soft)] border border-[var(--glass-border)] shadow-xs flex flex-col justify-between gap-3"
			data-testid="family-balance-card"
		>
			<div className="flex items-start justify-between gap-2.5">
				<div className="flex items-center gap-3">
					<div className="w-11 h-11 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20">
						<Users className="w-6 h-6" />
					</div>
					<div>
						<span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--muted)] block">
							Общий семейный аванс
						</span>
						<span className="text-xs text-[var(--muted)] block mt-0.5">
							Группа: <strong>{familyGroupName || "Семейный счёт"}</strong>
						</span>
					</div>
				</div>

				<span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-700 dark:text-indigo-300 shrink-0">
					Общий доступ семьи
				</span>
			</div>

			<div className="flex items-baseline gap-2 pt-1">
				<span
					className="text-2xl sm:text-3xl font-black tracking-tight text-indigo-600 dark:text-indigo-400"
					data-testid="family-balance-amount-display"
				>
					{familyBalance.toLocaleString("ru-RU")} ₽
				</span>
				<span className="text-xs text-[var(--muted)] font-medium">
					(единый баланс)
				</span>
			</div>

			<p className="text-[11px] text-[var(--muted)] m-0 leading-normal border-t border-[var(--glass-border)] pt-2.5">
				Родители и дети могут списывать средства с единого семейного депозита без повторных переводов.
			</p>
		</div>
	);
};
