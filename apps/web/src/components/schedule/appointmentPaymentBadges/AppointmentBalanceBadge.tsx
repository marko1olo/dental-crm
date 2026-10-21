import { CreditCard } from "lucide-react";
import React from "react";

export function AppointmentBalanceBadge({
	balance,
}: {
	balance: number | null;
}) {
	if (balance === null) return null;
	if (balance < 0) {
		return (
			<span
				className="px-2.5 py-1 rounded-xl text-xs font-black font-mono tracking-tight bg-rose-500/15 text-rose-800 dark:text-rose-100 dark:bg-rose-950/70 border border-rose-500/50 shadow-xs flex items-center gap-1 shrink-0 whitespace-nowrap"
				title={`Задолженность пациента: ${Math.abs(balance).toLocaleString("ru-RU")} ₽`}
				data-testid="appointment-debt-badge"
			>
				<CreditCard
					size={12}
					className="shrink-0 text-rose-600 dark:text-rose-400"
				/>
				<span className="whitespace-nowrap">
					Долг: {Math.abs(balance).toLocaleString("ru-RU")} ₽
				</span>
			</span>
		);
	}
	if (balance > 0) {
		return (
			<span
				className="px-2.5 py-1 rounded-xl text-xs font-bold font-mono tracking-tight bg-emerald-500/15 text-emerald-700 dark:text-emerald-200 dark:bg-emerald-950/50 border border-emerald-500/40 shadow-xs shrink-0 whitespace-nowrap"
				title={`Аванс/депозит пациента: ${balance.toLocaleString("ru-RU")} ₽`}
			>
				Аванс: {balance.toLocaleString("ru-RU")} ₽
			</span>
		);
	}
	return (
		<span
			className="px-2 py-0.5 rounded-xl text-xs font-medium font-mono text-[var(--muted)] bg-[var(--paper-soft)] border border-[var(--line)] shrink-0 whitespace-nowrap"
			title="Баланс пациента: 0 ₽"
		>
			Баланс: 0 ₽
		</span>
	);
}
