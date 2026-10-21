import type React from "react";
import { formatMoneyRu } from "./types";

interface CashFlowFormInputsProps {
	readonly cashFlowMode: "cash_in" | "cash_out";
	readonly cashFlowAmount: string;
	readonly setCashFlowAmount: (val: string) => void;
	readonly cashInDrawerRub: number;
	readonly cashFlowBasis: string;
	readonly setCashFlowBasis: (val: string) => void;
	readonly cashFlowPerson: string;
	readonly setCashFlowPerson: (val: string) => void;
}

export const CashFlowFormInputs: React.FC<CashFlowFormInputsProps> = ({
	cashFlowMode,
	cashFlowAmount,
	setCashFlowAmount,
	cashInDrawerRub,
	cashFlowBasis,
	setCashFlowBasis,
	cashFlowPerson,
	setCashFlowPerson,
}) => {
	const isCashIn = cashFlowMode === "cash_in";
	return (
		<div className="space-y-5">
			<div>
				<label
					htmlFor="cash-flow-amount-input"
					className="block text-xs font-bold text-[var(--ink,#0f172a)] uppercase tracking-wider mb-1.5"
				>
					Сумма операции (₽):
				</label>
				<div className="relative">
					<input
						id="cash-flow-amount-input"
						type="number"
						step="0.01"
						min="0"
						placeholder="0.00"
						value={cashFlowAmount}
						onChange={(e) => setCashFlowAmount(e.target.value)}
						data-testid="input-cash-flow-amount"
						className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[var(--line,rgba(0,0,0,0.15))] bg-[var(--paper,#ffffff)] text-lg font-black font-mono text-[var(--ink,#0f172a)] focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30"
					/>
					<span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--muted,#64748b)] pointer-events-none">
						₽
					</span>
				</div>

				<div className="flex items-center gap-1.5 mt-2 flex-wrap">
					{[500, 1000, 5000, 10000].map((amt) => (
						<button
							key={amt}
							type="button"
							onClick={() => setCashFlowAmount(String(amt))}
							className="min-h-[44px] px-3 py-1 text-xs font-bold rounded-lg border border-[var(--line,rgba(0,0,0,0.1))] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] hover:bg-[var(--glass-hover)] transition-all cursor-pointer"
						>
							+{amt.toLocaleString("ru-RU")} ₽
						</button>
					))}
					{!isCashIn && cashInDrawerRub > 0 && (
						<button
							type="button"
							onClick={() => setCashFlowAmount(String(cashInDrawerRub))}
							className="min-h-[44px] px-3 py-1 text-xs font-bold rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300 hover:bg-amber-500/20 transition-all cursor-pointer"
						>
							Вся наличность ({formatMoneyRu(cashInDrawerRub)})
						</button>
					)}
				</div>
			</div>

			<div>
				<label
					htmlFor="cash-flow-basis-input"
					className="block text-xs font-bold text-[var(--ink,#0f172a)] uppercase tracking-wider mb-1.5"
				>
					Основание операции / Назначение платежа:
				</label>
				<input
					id="cash-flow-basis-input"
					type="text"
					placeholder="Например: Внесение разменной монеты на начало смены"
					value={cashFlowBasis}
					onChange={(e) => setCashFlowBasis(e.target.value)}
					data-testid="input-cash-flow-basis"
					className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-[var(--line,rgba(0,0,0,0.15))] bg-[var(--paper,#ffffff)] text-xs text-[var(--ink,#0f172a)] focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30"
				/>
			</div>

			<div>
				<label
					htmlFor="cash-flow-person-input"
					className="block text-xs font-bold text-[var(--ink,#0f172a)] uppercase tracking-wider mb-1.5"
				>
					{isCashIn
						? "ФИО плательщика / сотрудника (опционально):"
						: "ФИО получателя / инкассатора (опционально):"}
				</label>
				<input
					id="cash-flow-person-input"
					type="text"
					placeholder={isCashIn ? "ФИО вносителя" : "ФИО получателя"}
					value={cashFlowPerson}
					onChange={(e) => setCashFlowPerson(e.target.value)}
					data-testid="input-cash-flow-person"
					className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-[var(--line,rgba(0,0,0,0.15))] bg-[var(--paper,#ffffff)] text-xs text-[var(--ink,#0f172a)] focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30"
				/>
				<p className="text-[11px] text-[var(--muted,#64748b)] mt-1">
					ИНН для физических лиц не требуется.
				</p>
			</div>
		</div>
	);
};
