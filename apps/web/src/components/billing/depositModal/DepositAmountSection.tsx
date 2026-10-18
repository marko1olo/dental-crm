/**
 * apps/web/src/components/billing/depositModal/DepositAmountSection.tsx
 *
 * Amount input and fast preset buttons for DepositTopupModal.
 * Strictly <= 120 lines per Mandate 8b.
 */

import React from "react";
import { DEPOSIT_QUICK_PRESETS_RUB, formatDisplayCurrency } from "@dental/shared";

interface DepositAmountSectionProps {
	readonly amountRub: number;
	readonly setAmountRub: (val: number) => void;
	readonly currentDepositRub: number;
}

export const DepositAmountSection: React.FC<DepositAmountSectionProps> = ({
	amountRub,
	setAmountRub,
	currentDepositRub,
}) => {
	return (
		<div className="space-y-4">
			<div className="rounded-xl p-4 bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#cbd5e1)] text-center shadow-xs">
				<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted,#64748b)] block mb-1">
					Сумма пополнения
				</span>
				<div className="flex items-center justify-center gap-2">
					<input
						type="number"
						value={amountRub || ""}
						onChange={(e) => setAmountRub(Math.max(0, Number(e.target.value) || 0))}
						className="w-56 h-12 text-center text-3xl font-black font-mono tracking-tight text-[var(--ink,#0f172a)] bg-[var(--paper,#ffffff)] border border-[var(--line,#cbd5e1)] rounded-xl focus:outline-none focus:border-teal-500 shadow-xs"
						placeholder="0"
						data-testid="input-deposit-amount"
					/>
					<span className="text-2xl font-black text-[var(--ink,#0f172a)]">₽</span>
				</div>
				<div className="text-[11px] text-[var(--muted,#64748b)] mt-1.5">
					Новый баланс после пополнения: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{formatDisplayCurrency(currentDepositRub + (amountRub || 0))}</strong>
				</div>
			</div>

			<div className="space-y-1.5">
				<label className="text-xs font-bold text-[var(--ink,#0f172a)] uppercase tracking-wider block">
					Быстрый выбор суммы
				</label>
				<div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
					{DEPOSIT_QUICK_PRESETS_RUB.map((preset) => (
						<button
							key={preset}
							type="button"
							onClick={() => setAmountRub(preset)}
							className={`py-2 px-3 rounded-xl border text-center transition-all ${
								amountRub === preset
									? "border-2 border-emerald-600 bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 font-black shadow-xs ring-2 ring-emerald-500/25"
									: "border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 font-bold shadow-2xs"
							}`}
							data-testid={`btn-deposit-preset-${preset}`}
						>
							<span className="text-xs font-mono font-bold">+{preset.toLocaleString("ru-RU")} ₽</span>
						</button>
					))}
				</div>
			</div>
		</div>
	);
};
